<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\TastyIgniterOrderService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Handles Paystack server-to-server webhook events.
 *
 * Why this exists separately from PaystackDriver::callback():
 *   - callback() is triggered by the user's browser redirect — it can fail if
 *     the user closes the tab, loses connection, or leaves the Paystack page.
 *   - handle() receives a server-to-server POST from Paystack's servers, which
 *     is retried automatically up to 24h if it returns a non-2xx response.
 *   - Together they guarantee an order is always created after payment.
 *
 * Idempotency:
 *   - callback() writes "paystack_fulfilled_{reference}" to cache after order creation.
 *   - handle() checks that key first and skips order creation if it exists.
 *   - This prevents duplicate TI orders when both callback AND webhook fire.
 *
 * Cart data flow:
 *   - CheckoutController::pay() stores pending order data in cache under
 *     "paystack_pending_{reference}" with a 2-hour TTL.
 *   - handle() reads that data here (no session available in webhook context).
 */
class PaystackWebhookController extends Controller
{
    public function __construct(private TastyIgniterOrderService $ti) {}

    /**
     * CANONICAL WEBHOOK HANDLER for dine-in QR orders.
     * Registered in Paystack dashboard as the active webhook URL.
     *
     * For backend/direct-checkout orders see:
     * backend/routes/api.php → POST /api/paystack/webhook
     */
    public function handle(Request $request): Response
    {
        // ── 1. Verify Paystack HMAC signature ───────────────────────────
        $secret    = config('services.paystack.secret_key');
        $signature = $request->header('X-Paystack-Signature', '');
        $body      = $request->getContent();

        if (! hash_equals(hash_hmac('sha512', $body, $secret), $signature)) {
            Log::warning('Paystack webhook: invalid signature');
            return response('Invalid signature', 400);
        }

        // ── 2. Only handle charge.success ───────────────────────────────
        $payload = json_decode($body, true);
        $event   = $payload['event'] ?? '';

        if ($event !== 'charge.success') {
            // Return 200 so Paystack stops retrying other event types.
            return response('Event ignored', 200);
        }

        $reference = $payload['data']['reference'] ?? null;

        if (! $reference) {
            Log::error('Paystack webhook: charge.success with no reference', ['payload' => $payload]);
            return response('No reference', 422);
        }

        // ── 3. Idempotency — skip if callback already created the order ─
        $existingOrderId = Cache::get("paystack_fulfilled_{$reference}");
        if ($existingOrderId) {
            Log::info('Paystack webhook: order already created by callback', [
                'ref'      => $reference,
                'order_id' => $existingOrderId,
            ]);
            return response('Already fulfilled', 200);
        }

        // ── 4. Load pending order data from cache ───────────────────────
        $pending = Cache::get("paystack_pending_{$reference}");

        if (! $pending) {
            Log::error('Paystack webhook: no pending data for reference', ['ref' => $reference]);
            // Still return 200 — retrying won't help if the session data was never written.
            return response('No pending data', 200);
        }

        $cart           = $pending['cart'] ?? [];
        $tableToken     = $pending['table_token'] ?? null;
        $customerName   = $pending['customer_name'] ?? 'Guest';
        $customerEmail  = $pending['customer_email'] ?? 'guest@cookersdelight.local';
        $tableNumber    = $pending['table_number'] ?? null;
        $estimatedWait  = $pending['estimated_wait'] ?? null;

        if (empty($cart)) {
            Log::error('Paystack webhook: cart is empty in pending data', ['ref' => $reference]);
            return response('Empty cart', 200);
        }

        // ── 5. Create TI order ──────────────────────────────────────────
        try {
            $order = $this->ti->submitOrder($cart, $tableToken, $customerName, $customerEmail);
        } catch (\Throwable $e) {
            Log::error('Paystack webhook: TI order creation failed', [
                'error' => $e->getMessage(),
                'ref'   => $reference,
            ]);
            // Return 500 so Paystack retries the webhook.
            return response('Order creation failed — will retry', 500);
        }

        $orderId = $order['order_id'];

        // ── 6. Mark fulfilled to prevent duplicate creation ─────────────
        Cache::put("paystack_fulfilled_{$reference}", $orderId, now()->addHours(4));

        Log::info('Paystack webhook: order created successfully', [
            'ref'      => $reference,
            'order_id' => $orderId,
        ]);

        // ── 7. Send admin notification ──────────────────────────────────
        try {
            Mail::raw(
                "New order #{$orderId} received!\n\n" .
                "Table: {$tableNumber}\n" .
                "Customer: {$customerName}\n" .
                "Reference: {$reference}\n\n" .
                "Check the admin panel for details.",
                fn ($m) => $m
                    ->to(config('mail.admin_address', config('mail.from.address')))
                    ->subject('New Order — Cookers Delight')
            );
        } catch (\Throwable $e) {
            Log::warning('Paystack webhook: admin notification email failed', [
                'error' => $e->getMessage(),
            ]);
        }

        return response('OK', 200);
    }
}
