<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\TastyIgniterOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

/**
 * Handles the JSON checkout request from Alpine's submitCheckout().
 *
 * Flow:
 *   1. Validate incoming cart + customer fields
 *   2. Fetch canonical prices from server-side cache (client prices ignored)
 *   3. Build session cart with authoritative prices
 *   4. Generate a Paystack reference (no TI order yet — order is created AFTER payment)
 *   5. Compute amount and estimated wait
 *   6. Store cart + customer data in session for PaystackDriver::callback() to use
 *   7. Initialize Paystack transaction and return { redirect_url }
 *
 * We mirror PaystackDriver::pay() but return JSON instead of a RedirectResponse
 * because Alpine POSTs JSON and needs the Paystack URL to hand off client-side.
 *
 * SECURITY: client-submitted prices are NEVER used for the Paystack charge.
 * Only item IDs and quantities are accepted from the client; canonical prices
 * are fetched from the server-side menu cache and used exclusively.
 *
 * ORDER CREATION: TI order creation is intentionally deferred to
 * PaystackDriver::callback() — only after Paystack confirms payment success.
 * This prevents ghost orders from customers who abandon the Paystack page.
 */
class CheckoutController extends Controller
{
    public function __construct(private TastyIgniterOrderService $ti) {}

    public function pay(Request $request): JsonResponse
    {
        // ── 1. Validate ──────────────────────────────────────────────
        // Only id and quantity are trusted from the client. Price is ignored
        // and will be re-fetched from the server-side menu cache below.
        $channel = $request->input('receipt_channel', 'email');

        $validator = Validator::make($request->all(), [
            'cart'               => ['required', 'array', 'min:1'],
            'cart.*.id'          => ['required'],
            'cart.*.quantity'    => ['required', 'integer', 'min:1'],
            'customer_name'      => ['required', 'string', 'max:120'],
            // Accept any non-empty string for email — Paystack validates format itself.
            // PHP's strict filter_var rejects some valid real-world addresses.
            'customer_email'     => ['required', 'string', 'min:5', 'max:200'],
            'receipt_channel'    => ['sometimes', 'in:email,whatsapp'],
            'customer_whatsapp'  => ['nullable', 'string', 'max:20'],
        ]);

        if ($validator->fails()) {
            Log::warning('CheckoutController: validation failed', [
                'errors' => $validator->errors()->toArray(),
                'input'  => $request->except(['cart']), // don't log full cart
            ]);
            return response()->json([
                'error'  => 'Invalid request.',
                'fields' => $validator->errors()->toArray(),
            ], 422);
        }

        // ── 2. Session guard ─────────────────────────────────────────
        if (! $request->session()->has('cd_session_token')) {
            return response()->json([
                'error' => 'Session expired. Please re-scan your QR code.',
            ], 403);
        }

        $customerName  = $request->input('customer_name');
        $customerEmail = $request->input('customer_email');
        $tableToken    = $request->session()->get('cd_session_token');
        $locationId    = (int) $request->session()->get('cd_location_id',
            config('tastyigniter.default_location_id', 1)
        );

        // ── Fetch canonical prices from server-side cache ────────────
        // Client-submitted prices are intentionally ignored here.
        // We read the same cache key MenuController wrote so no extra
        // API call is made if the menu was recently browsed.
        $cachedMenu = Cache::get("ti_menu_{$locationId}", []);
        $priceIndex = [];
        foreach ($cachedMenu as $group) {
            foreach ($group['menus'] ?? [] as $item) {
                $priceIndex[$item['id']] = (float) ($item['price'] ?? 0);
            }
        }

        // If the cache is cold (e.g. server restart) re-fetch from TI.
        if (empty($priceIndex)) {
            $freshMenu = $this->ti->fetchMenu($locationId);
            foreach ($freshMenu as $group) {
                foreach ($group['menus'] ?? [] as $item) {
                    $priceIndex[$item['id']] = (float) ($item['price'] ?? 0);
                }
            }
        }

        // Build session cart using only server-side prices.
        $clientCart  = $request->input('cart');
        $sessionCart = [];

        foreach ($clientCart as $line) {
            $id  = (int) $line['id'];
            $qty = (int) $line['quantity'];

            if (! isset($priceIndex[$id])) {
                return response()->json([
                    'error' => 'One or more items are no longer available. Please refresh the menu.',
                ], 409);
            }

            $sessionCart[] = [
                'id'       => $id,
                'price'    => $priceIndex[$id], // authoritative server price
                'quantity' => $qty,
            ];
        }

        // ── 3. Generate Paystack reference ───────────────────────────
        $reference = 'CD-' . time() . '-' . bin2hex(random_bytes(4));

        // ── 4. Amount, prep time, estimated wait ─────────────────────
        $amount = (int) round(
            collect($sessionCart)->sum(fn ($i) => $i['price'] * $i['quantity']) * 100
        );

        $prepTimes     = $this->ti->fetchPrepTimes();
        $maxPrepTime   = collect($sessionCart)->map(fn ($i) => $prepTimes[$i['id']] ?? 15)->max();
        $estimatedWait = ($maxPrepTime ?? 15) + 5;

        // ── 5. Resolve receipt channel + TI-facing email ─────────────
        $receiptChannel = $request->input('receipt_channel', 'email');
        $tiEmail = ($receiptChannel === 'email' && $customerEmail)
            ? $customerEmail
            : 'guest.' . time() . '@cookersdelight.local';

        // ── 6. Persist to session (callback reads this) ───────────────
        session([
            'ordering_cart'             => $sessionCart,
            'paystack_reference'        => $reference,
            'cd_estimated_wait_minutes' => $estimatedWait,
            'receipt_channel'           => $receiptChannel,
            'customer_whatsapp'         => $request->input('customer_whatsapp', ''),
            'customer_name'             => $customerName,
            'customer_email'            => $customerEmail,
            'ordering_customer_email'   => $tiEmail,
            'ordering_table_token'      => $tableToken,
            'ordering_location_id'      => $locationId,
        ]);

        // ── 7. Persist to cache (webhook reads this — no session available) ──
        Cache::put("paystack_pending_{$reference}", [
            'cart'              => $sessionCart,
            'table_token'       => $tableToken,
            'location_id'       => $locationId,
            'customer_name'     => $customerName,
            'customer_email'    => $tiEmail,
            'paystack_email'    => $customerEmail,
            'receipt_channel'   => $receiptChannel,
            'customer_whatsapp' => $request->input('customer_whatsapp', ''),
            'table_number'      => $request->session()->get('cd_table_number'),
            'estimated_wait'    => $estimatedWait,
        ], now()->addHours(2));

        // ── 5. Initialize Paystack transaction ───────────────────────
        // On Windows local dev, PHP cURL often lacks a CA bundle and fails SSL
        // verification. We disable it for the local environment only — never in prod.
        $psResponse = Http::withToken(config('services.paystack.secret_key'))
            ->when(app()->environment('local'), fn ($h) => $h->withoutVerifying())
            ->post('https://api.paystack.co/transaction/initialize', [
                'email'        => $customerEmail,
                'amount'       => $amount,
                'reference'    => $reference,
                'currency'     => 'GHS',
                'callback_url' => route('paystack.callback'),
                'metadata'     => [
                    'reference' => $reference,
                ],
            ]);

        if ($psResponse->failed()) {
            Log::error('CheckoutController: Paystack init failed', ['body' => $psResponse->body()]);
            return response()->json(['error' => 'Payment gateway error. Please try again.'], 502);
        }

        return response()->json([
            'redirect_url' => $psResponse->json('data.authorization_url'),
        ]);
    }
}
