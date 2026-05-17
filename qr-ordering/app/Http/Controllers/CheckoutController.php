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
 *   2. Write ordering_cart to session (PaystackDriver::callback() may read it)
 *   3. Submit order to TastyIgniter to obtain an order_id
 *   4. Initialize a Paystack transaction with the GHS amount
 *   5. Return { redirect_url } as JSON — Alpine navigates there
 *
 * We mirror PaystackDriver::pay() but return JSON instead of a RedirectResponse
 * because Alpine POSTs JSON and needs the Paystack URL to hand off client-side.
 *
 * SECURITY: client-submitted prices are NEVER used for the Paystack charge.
 * Only item IDs and quantities are accepted from the client; canonical prices
 * are fetched from the server-side menu cache and used exclusively.
 */
class CheckoutController extends Controller
{
    public function __construct(private TastyIgniterOrderService $ti) {}

    public function pay(Request $request): JsonResponse
    {
        // ── 1. Validate ──────────────────────────────────────────────
        // Only id and quantity are trusted from the client. Price is ignored
        // and will be re-fetched from the server-side menu cache below.
        $validator = Validator::make($request->all(), [
            'cart'            => ['required', 'array', 'min:1'],
            'cart.*.id'       => ['required', 'integer'],
            'cart.*.quantity' => ['required', 'integer', 'min:1'],
            'customer_name'   => ['required', 'string', 'max:120'],
            'customer_email'  => ['required', 'email', 'max:200'],
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => 'Invalid request.'], 422);
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

        // Write to session so PaystackDriver::callback() can clear it.
        session(['ordering_cart' => $sessionCart]);

        // ── 3. Submit order to TastyIgniter ─────────────────────────
        try {
            $order = $this->ti->submitOrder($sessionCart, $tableToken, $customerName, $customerEmail);
        } catch (\Throwable $e) {
            Log::error('CheckoutController: TI order submission failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Could not place your order. Please try again.'], 500);
        }

        $orderId   = $order['order_id'];
        $reference = 'CD-' . $orderId . '-' . time();

        // ── 4. Compute amount and estimated wait ─────────────────────
        // Amount in pesewas (GHS smallest unit).
        $amount = (int) round(
            collect($sessionCart)->sum(fn ($i) => $i['price'] * $i['quantity']) * 100
        );

        $prepTimes     = $this->ti->fetchPrepTimes();
        $maxPrepTime   = collect($sessionCart)->map(fn ($i) => $prepTimes[$i['id']] ?? 15)->max();
        $estimatedWait = ($maxPrepTime ?? 15) + 5;

        session([
            'pending_order_id'          => $orderId,
            'paystack_reference'        => $reference,
            'cd_estimated_wait_minutes' => $estimatedWait,
        ]);

        // ── 5. Initialize Paystack transaction ───────────────────────
        $psResponse = Http::withToken(config('services.paystack.secret_key'))
            ->post('https://api.paystack.co/transaction/initialize', [
                'email'        => $customerEmail,
                'amount'       => $amount,
                'reference'    => $reference,
                'currency'     => 'GHS',
                'callback_url' => route('paystack.callback'),
                'metadata'     => [
                    'order_id'    => $orderId,
                    'table_token' => $tableToken,
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
