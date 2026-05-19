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
 * Direct checkout — pre-arrival (collection) orders from the public website.
 *
 * Flow:
 *   POST   /api/checkout           → validate, re-price, init Paystack, cache pending
 *   GET    /api/checkout/callback  → verify with Paystack, create TI order, redirect to tracking
 *   GET    /api/orders/{ref}/status → React tracking page polls this
 *
 * No QR session guard — customer is remote, not at a table.
 * order_type = 'collection'.
 * Cache prefix: cd_collection_pending_{reference}
 */
class DirectCheckoutController extends Controller
{
    // ── POST /api/checkout ──────────────────────────────────────────────────

    public function pay(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'cart'               => ['required', 'array', 'min:1'],
            'cart.*.id'          => ['required', 'integer'],
            'cart.*.quantity'    => ['required', 'integer', 'min:1'],
            'customer_name'      => ['required', 'string', 'max:120'],
            'customer_email'     => ['required', 'string', 'min:5', 'max:200'],
            'customer_phone'     => ['required', 'string', 'max:20'],
            'receipt_channel'    => ['sometimes', 'in:email,whatsapp'],
            'customer_whatsapp'  => ['nullable', 'string', 'max:20'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error'  => 'Invalid request.',
                'fields' => $validator->errors()->toArray(),
            ], 422);
        }

        $locationId     = (int) config('tastyigniter.default_location_id', 1);
        $customerName   = $request->input('customer_name');
        $customerEmail  = $request->input('customer_email');
        $receiptChannel = $request->input('receipt_channel', 'whatsapp');

        $priceIndex = $this->buildPriceIndex($locationId);

        if (empty($priceIndex)) {
            Log::error('DirectCheckoutController: menu cache empty and TI unreachable');
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

            $sessionCart[] = [
                'id'       => $id,
                'price'    => $priceIndex[$id],
                'quantity' => $qty,
            ];
        }

        $reference = 'CD-' . time() . '-' . bin2hex(random_bytes(4));

        $amountKobo = (int) round(
            collect($sessionCart)->sum(fn ($i) => $i['price'] * $i['quantity']) * 100
        );

        Cache::put("cd_collection_pending_{$reference}", [
            'cart'              => $sessionCart,
            'location_id'       => $locationId,
            'customer_name'     => $customerName,
            'customer_email'    => $customerEmail,
            'customer_phone'    => $request->input('customer_phone'),
            'receipt_channel'   => $receiptChannel,
            'customer_whatsapp' => $request->input('customer_whatsapp', ''),
            'order_type'        => 'collection',
        ], now()->addHours(2));

        // WhatsApp orders use a synthetic placeholder — Paystack requires an email address.
        $paystackEmail = $receiptChannel === 'email'
            ? $customerEmail
            : 'wa.' . time() . '@noreply.cookersdelight.com';

        $psResponse = Http::withToken(PaystackConfig::secretKey())
            ->when(app()->environment('local'), fn ($h) => $h->withoutVerifying())
            ->post('https://api.paystack.co/transaction/initialize', [
                'email'        => $paystackEmail,
                'amount'       => $amountKobo,
                'reference'    => $reference,
                'currency'     => 'GHS',
                'callback_url' => route('api.checkout.callback'),
                'metadata'     => [
                    'reference'     => $reference,
                    'order_type'    => 'collection',
                    'customer_name' => $customerName,
                ],
            ]);

        if ($psResponse->failed()) {
            Log::error('DirectCheckoutController: Paystack init failed', [
                'status' => $psResponse->status(),
                'body'   => $psResponse->body(),
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

    // ── GET /api/checkout/callback ──────────────────────────────────────────

    public function callback(Request $request): RedirectResponse
    {
        $reference   = $request->query('reference', '');
        $frontendUrl = config('services.paystack.frontend_url', 'http://localhost:5173');
        $trackingUrl = $frontendUrl . '/order/' . $reference . '/track';

        if (empty($reference)) {
            return redirect($frontendUrl);
        }

        $pending = Cache::get("cd_collection_pending_{$reference}");

        if (! $pending) {
            // Cache expired or unknown reference — redirect to tracking anyway;
            // the webhook may have already processed the order.
            Log::warning('DirectCheckoutController: callback with no pending cache', [
                'reference' => $reference,
            ]);
            return redirect($trackingUrl);
        }

        $verify = Http::withToken(PaystackConfig::secretKey())
            ->when(app()->environment('local'), fn ($h) => $h->withoutVerifying())
            ->get("https://api.paystack.co/transaction/verify/{$reference}");

        if ($verify->failed() || $verify->json('data.status') !== 'success') {
            Log::warning('DirectCheckoutController: payment verification failed', [
                'reference' => $reference,
                'status'    => $verify->json('data.status'),
            ]);
            return redirect($trackingUrl . '?payment_status=failed');
        }

        // Cache::add() is atomic — returns true only if the key did not already exist.
        // This ensures createCollectionOrder() runs at most once per reference.
        $firstAttempt = Cache::add(
            "cd_collection_processed_{$reference}", true, now()->addHours(24)
        );

        if ($firstAttempt) {
            $this->createCollectionOrder($reference, $pending);
        }

        return redirect($trackingUrl);
    }

    // ── GET /api/orders/{reference}/status ──────────────────────────────────

    public function status(string $reference): JsonResponse
    {
        $order = DB::table('orders')
            ->where('hash', $reference)
            ->orWhere('payment', 'like', "%{$reference}%")
            ->select('order_id', 'status_id', 'first_name', 'last_name')
            ->first();

        if (! $order) {
            return response()->json([
                'status'          => 'pending',
                'status_label'    => 'Payment confirmed',
                'status_subtitle' => 'Connecting to the kitchen…',
                'status_color'    => '#D97706',
                'first_item_name' => null,
                'terminal'        => false,
            ]);
        }

        $statusName = DB::table('statuses')
            ->where('status_id', $order->status_id)
            ->value('status_name');

        [$label, $subtitle, $color, $terminal] = $this->mapStatus($statusName);

        $firstItem = DB::table('order_menus')
            ->where('order_id', $order->order_id)
            ->orderBy('order_menu_id')
            ->value('name');

        return response()->json([
            'status'          => strtolower($statusName ?? 'pending'),
            'status_label'    => $label,
            'status_subtitle' => $firstItem && $subtitle
                ? str_replace('{item}', $firstItem, $subtitle)
                : $subtitle,
            'status_color'    => $color,
            'first_item_name' => $firstItem,
            'terminal'        => $terminal,
        ]);
    }

    // ── Private helpers ─────────────────────────────────────────────────────

    /**
     * Build a menu_id → price index for the given location.
     * Reads from the cache first; falls back to a live TI API call.
     */
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

    private function createCollectionOrder(string $reference, array $pending): void
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
                'order_type'    => 'collection',
                'location_id'   => $pending['location_id'],
                'status_id'     => $receivedStatusId,
                'first_name'    => $firstName,
                'last_name'     => $lastName,
                'email'         => $pending['customer_email'],
                'telephone'     => $pending['customer_phone'] ?? '',
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
                    'name'       => DB::table('menus')
                                       ->where('menu_id', $item['id'])
                                       ->value('menu_name') ?? 'Item',
                    'date_added' => now(),
                ]);
            }

            Log::info('DirectCheckoutController: collection order created', [
                'order_id'  => $orderId,
                'reference' => $reference,
            ]);
        } catch (\Throwable $e) {
            Log::error('DirectCheckoutController: failed to create TI order', [
                'reference' => $reference,
                'error'     => $e->getMessage(),
            ]);
        }
    }

    /**
     * Map TI status name → [ label, subtitle, color, terminal ].
     * Subtitles containing {item} are interpolated in status() with the first item name.
     */
    private function mapStatus(?string $statusName): array
    {
        return match (strtolower($statusName ?? '')) {
            'received'  => ['Order received',        'The kitchen has it. We\'re getting started.',         '#D97706', false],
            'preparing' => ['Cooking now',            'Your {item} is being made. Almost time.',             '#6366F1', false],
            'ready'     => ['Your order is ready',    'Come in and show this screen at the counter.',        '#16A34A', false],
            'served',
            'completed' => ['Order collected',        'Enjoy every bite.',                                    '#7A8F7A', true ],
            'cancelled' => ['Order cancelled',        'Please speak to staff.',                               '#DC2626', true ],
            default     => ['Payment confirmed',      'Connecting to the kitchen…',                           '#D97706', false],
        };
    }
}
