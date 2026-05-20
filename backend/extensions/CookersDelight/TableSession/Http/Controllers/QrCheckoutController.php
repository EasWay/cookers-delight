<?php

declare(strict_types=1);

namespace CookersDelight\TableSession\Http\Controllers;

use CookersDelight\TableSession\Support\PaystackConfig;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

/**
 * QR dine-in checkout — from the React apps/qr frontend.
 *
 * Flow:
 *   POST /api/qr-checkout           → validate, session lookup, reprice, init Paystack
 *   GET  /api/qr-checkout/callback  → verify, create TI order, link session, redirect to QR app
 *
 * Differs from DirectCheckoutController:
 *   - session_token in body → resolves location_id + stable_token via DB join
 *   - order_type = 'dine-in'
 *   - callback links order to cd_table_sessions.order_id
 *   - redirect: {QR_APP_URL}/table/{stableToken}/track
 *   - cache prefix: cd_dine_in_pending_{reference}
 */
class QrCheckoutController extends Controller
{
    // ── POST /api/qr-checkout ────────────────────────────────────────────────

    public function pay(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'session_token'      => ['required', 'string'],
            'cart'               => ['required', 'array', 'min:1'],
            'cart.*.id'          => ['required', 'integer'],
            'cart.*.quantity'    => ['required', 'integer', 'min:1'],
            'customer_name'      => ['required', 'string', 'max:120'],
            'receipt_channel'    => ['sometimes', 'in:email,whatsapp'],
            'customer_email'     => ['nullable', 'string', 'min:5', 'max:200'],
            'customer_whatsapp'  => ['nullable', 'string', 'max:20'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error'  => 'Invalid request.',
                'fields' => $validator->errors()->toArray(),
            ], 422);
        }

        $sessionToken = $request->input('session_token');

        $row = DB::table('cd_table_sessions as ts')
            ->join('cd_dining_tables as dt', 'dt.id', '=', 'ts.table_id')
            ->where('ts.token', $sessionToken)
            ->where('ts.expires_at', '>', now())
            ->whereNull('ts.deleted_at')
            ->select(
                'ts.id as session_id',
                'dt.stable_token',
                'dt.table_number',
                'dt.location_id',
            )
            ->first();

        if (! $row) {
            return response()->json([
                'error' => 'Session expired. Please re-scan your QR code.',
            ], 403);
        }

        $locationId  = (int) $row->location_id;
        $stableToken = $row->stable_token;
        $tableNumber = $row->table_number;

        $priceIndex = $this->buildPriceIndex($locationId);

        if (empty($priceIndex)) {
            Log::error('QrCheckoutController: menu cache empty and TI unreachable');
            return response()->json([
                'error' => 'Menu unavailable. Please try again in a moment.',
            ], 503);
        }

        $sessionCart = [];
        foreach ($request->input('cart') as $line) {
            $id  = (int) $line['id'];
            $qty = (int) $line['quantity'];

            if (! isset($priceIndex[$id])) {
                return response()->json([
                    'error' => 'One or more items are no longer available. Please refresh the menu.',
                ], 409);
            }

            $sessionCart[] = ['id' => $id, 'price' => $priceIndex[$id], 'quantity' => $qty];
        }

        $reference  = 'CD-' . time() . '-' . bin2hex(random_bytes(4));
        $amountKobo = (int) round(
            collect($sessionCart)->sum(fn ($i) => $i['price'] * $i['quantity']) * 100
        );

        $receiptChannel = $request->input('receipt_channel', 'whatsapp');
        $customerName   = $request->input('customer_name');
        $customerEmail  = $request->input('customer_email', '');
        $customerWa     = $request->input('customer_whatsapp', '');

        $paystackEmail = $receiptChannel === 'email' && $customerEmail
            ? $customerEmail
            : 'wa.' . time() . '@noreply.cookersdelight.com';

        Cache::put("cd_dine_in_pending_{$reference}", [
            'cart'              => $sessionCart,
            'session_token'     => $sessionToken,
            'stable_token'      => $stableToken,
            'table_number'      => $tableNumber,
            'location_id'       => $locationId,
            'customer_name'     => $customerName,
            'customer_email'    => $customerEmail,
            'customer_whatsapp' => $customerWa,
            'receipt_channel'   => $receiptChannel,
            'order_type'        => 'dine-in',
        ], now()->addHours(2));

        $psResponse = Http::withToken(PaystackConfig::secretKey())
            ->when(app()->environment('local'), fn ($h) => $h->withoutVerifying())
            ->post('https://api.paystack.co/transaction/initialize', [
                'email'        => $paystackEmail,
                'amount'       => $amountKobo,
                'reference'    => $reference,
                'currency'     => 'GHS',
                'callback_url' => route('api.qr.checkout.callback'),
                'metadata'     => [
                    'reference'    => $reference,
                    'order_type'   => 'dine-in',
                    'table_number' => $tableNumber,
                ],
            ]);

        if ($psResponse->failed()) {
            Log::error('QrCheckoutController: Paystack init failed', [
                'status' => $psResponse->status(),
            ]);
            return response()->json([
                'error' => 'Payment gateway error. Please try again.',
            ], 502);
        }

        return response()->json([
            'redirect_url' => $psResponse->json('data.authorization_url'),
            'reference'    => $reference,
        ]);
    }

    // ── GET /api/qr-checkout/callback ────────────────────────────────────────

    public function callback(Request $request): RedirectResponse
    {
        $reference = $request->query('reference', '');
        $qrAppUrl  = config('services.paystack.qr_app_url', 'http://localhost:5174');

        if (empty($reference)) {
            return redirect($qrAppUrl);
        }

        $pending = Cache::get("cd_dine_in_pending_{$reference}");

        if (! $pending) {
            Log::warning('QrCheckoutController: callback with no pending cache', [
                'reference' => $reference,
            ]);
            return redirect($qrAppUrl);
        }

        $stableToken = $pending['stable_token'];
        $trackingUrl = $qrAppUrl . '/table/' . $stableToken . '/track?ref=' . $reference;

        $verify = Http::withToken(PaystackConfig::secretKey())
            ->when(app()->environment('local'), fn ($h) => $h->withoutVerifying())
            ->get("https://api.paystack.co/transaction/verify/{$reference}");

        if ($verify->failed() || $verify->json('data.status') !== 'success') {
            Log::warning('QrCheckoutController: payment verification failed', [
                'reference' => $reference,
                'status'    => $verify->json('data.status'),
            ]);
            return redirect($trackingUrl . '&payment_status=failed');
        }

        $firstAttempt = Cache::add(
            "cd_dine_in_processed_{$reference}", true, now()->addHours(24)
        );

        if ($firstAttempt) {
            $this->createDineInOrder($reference, $pending);
        }

        return redirect($trackingUrl);
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private function buildPriceIndex(int $locationId): array
    {
        $cached = Cache::get("ti_menu_{$locationId}", []);
        $index  = $this->indexFromMenu($cached);

        if (! empty($index)) {
            return $index;
        }

        $response = Http::withToken(config('tastyigniter.api_token'))
            ->baseUrl(config('tastyigniter.api_url'))
            ->when(app()->environment('local'), fn ($h) => $h->withoutVerifying())
            ->get('/menus', ['location' => $locationId, 'pageLimit' => 200]);

        if ($response->failed()) {
            return [];
        }

        return $this->indexFromMenu($response->json('data', []));
    }

    private function indexFromMenu(array $menu): array
    {
        $index = [];
        foreach ($menu as $group) {
            foreach ($group['menus'] ?? $group as $item) {
                if (isset($item['menu_id'], $item['menu_price'])) {
                    $index[(int) $item['menu_id']] = (float) $item['menu_price'];
                }
            }
        }
        return $index;
    }

    private function createDineInOrder(string $reference, array $pending): void
    {
        try {
            $nameParts = explode(' ', trim($pending['customer_name']), 2);
            $firstName = $nameParts[0];
            $lastName  = $nameParts[1] ?? '';

            $receivedStatusId = DB::table('statuses')
                ->where('status_name', 'Received')
                ->where('status_for', 'order')
                ->value('status_id') ?? 1;

            $orderTotal = collect($pending['cart'])
                ->sum(fn ($i) => $i['price'] * $i['quantity']);

            $orderId = DB::table('orders')->insertGetId([
                'order_type'    => 'dine-in',
                'location_id'   => $pending['location_id'],
                'status_id'     => $receivedStatusId,
                'first_name'    => $firstName,
                'last_name'     => $lastName,
                'email'         => $pending['customer_email'] ?: ($pending['customer_whatsapp'] . '@noreply.cookersdelight.com'),
                'telephone'     => $pending['customer_whatsapp'] ?? '',
                'payment'       => 'paystack|' . $reference,
                'hash'          => $reference,
                'order_total'   => $orderTotal,
                'processed'     => 1,
                'date_added'    => now(),
                'date_modified' => now(),
            ]);

            foreach ($pending['cart'] as $item) {
                DB::table('order_menus')->insert([
                    'order_id'   => $orderId,
                    'menu_id'    => $item['id'],
                    'quantity'   => $item['quantity'],
                    'price'      => $item['price'],
                    'subtotal'   => $item['price'] * $item['quantity'],
                    'name'       => DB::table('menus')->where('menu_id', $item['id'])->value('menu_name') ?? 'Item',
                    'date_added' => now(),
                ]);
            }

            DB::table('cd_table_sessions')
                ->where('token', $pending['session_token'])
                ->update(['order_id' => $orderId, 'updated_at' => now()]);

            Log::info('QrCheckoutController: dine-in order created', [
                'order_id'  => $orderId,
                'reference' => $reference,
                'table'     => $pending['table_number'],
            ]);
        } catch (\Throwable $e) {
            Log::error('QrCheckoutController: failed to create TI order', [
                'reference' => $reference,
                'error'     => $e->getMessage(),
            ]);
        }
    }
}
