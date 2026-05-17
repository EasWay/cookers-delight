<?php

declare(strict_types=1);

namespace App\Payment;

use App\Services\TastyIgniterOrderService;
use Revolution\Ordering\Contracts\Payment\PaymentDriver;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Paystack payment driver for kawax/self-ordering.
 *
 * Flow:
 *   1. kawax calls pay() → we initialize a Paystack transaction and redirect.
 *   2. Paystack redirects back to /paystack/callback with a reference.
 *   3. We verify the transaction with Paystack's API.
 *   4. On success, we submit the order to TastyIgniter.
 *   5. TastyIgniter's Paystack webhook (on the backend) marks it paid.
 *
 * CRITICAL: We do NOT mark the order paid here. The webhook in TI does that.
 */
class PaystackDriver implements PaymentDriver
{
    public function __construct(private TastyIgniterOrderService $ti) {}

    /**
     * Initiate a Paystack payment and redirect the customer to the Paystack checkout.
     */
    public function pay(Request $request): mixed
    {
        $cart          = session('ordering_cart', []);
        $tableToken    = $request->query('token');
        $customerName  = $request->input('customer_name', 'Guest');
        $customerEmail = $request->input('customer_email', 'guest@cookersdelight.com');

        if (empty($cart)) {
            return redirect()->route('menus')->withErrors(['cart' => 'Cart is empty.']);
        }

        // Submit order to TI first to get an order_id for the Paystack reference.
        try {
            $order = $this->ti->submitOrder($cart, $tableToken, $customerName, $customerEmail);
        } catch (\Throwable $e) {
            Log::error('Order submission failed before Paystack', ['error' => $e->getMessage()]);
            return redirect()->route('menus')->withErrors(['order' => 'Could not place order. Please try again.']);
        }

        $orderId   = $order['order_id'];
        $reference = 'CD-' . $orderId . '-' . time();
        $amount    = $this->cartTotal($cart) * 100; // pesewa

        // Compute estimated wait: max prep time across cart items + 5 min kitchen buffer.
        // Dishes are cooked in parallel so we use max, not sum.
        $prepTimes = $this->ti->fetchPrepTimes();
        $maxPrepTime = collect($cart)->map(fn ($item) => $prepTimes[$item['id']] ?? 15)->max();
        $estimatedWait = ($maxPrepTime ?? 15) + 5;

        session([
            'pending_order_id'          => $orderId,
            'paystack_reference'        => $reference,
            'cd_estimated_wait_minutes' => $estimatedWait,
        ]);

        $response = Http::withToken(config('services.paystack.secret_key'))
            ->when(app()->environment('local'), fn ($h) => $h->withoutVerifying())
            ->post('https://api.paystack.co/transaction/initialize', [
                'email'     => $customerEmail,
                'amount'    => (int) $amount,
                'reference' => $reference,
                'currency'  => 'GHS',
                'callback_url' => route('paystack.callback'),
                'metadata'  => ['order_id' => $orderId, 'table_token' => $tableToken],
            ]);

        if ($response->failed()) {
            Log::error('Paystack initialize failed', ['body' => $response->body()]);
            return redirect()->route('menus')->withErrors(['payment' => 'Payment gateway error.']);
        }

        return redirect($response->json('data.authorization_url'));
    }

    /**
     * Paystack redirects here after the customer completes (or cancels) payment.
     *
     * Order creation flow (post-payment):
     *   1. Verify transaction with Paystack API
     *   2. Pull cart and customer data from session (written by CheckoutController)
     *   3. Submit order to TastyIgniter NOW — only after payment is confirmed
     *   4. Send admin notification email
     *   5. Clear session cart and redirect to order tracking page
     *
     * This ensures no TI orders exist for abandoned/failed payments.
     */
    public function callback(Request $request): mixed
    {
        $reference = $request->query('reference', session('paystack_reference'));

        // 1. Verify payment with Paystack API (never trust the redirect alone).
        $verify = Http::withToken(config('services.paystack.secret_key'))
            ->when(app()->environment('local'), fn ($h) => $h->withoutVerifying())
            ->get("https://api.paystack.co/transaction/verify/{$reference}");

        $data   = $verify->json('data', []);
        $status = $data['status'] ?? null;

        if ($status !== 'success') {
            Log::warning('Paystack callback: not successful', ['status' => $status, 'ref' => $reference]);
            return redirect()->route('menu')->with('error', 'Payment was not completed. Please try again.');
        }

        // 2. Pull cart and customer data from session (set by CheckoutController::pay()).
        $cart          = session('ordering_cart', []);
        $tableToken    = session('ordering_table_token');
        $customerName  = session('customer_name', 'Guest');
        $customerEmail = session('ordering_customer_email', 'guest@cookersdelight.local');
        $locationId    = session('ordering_location_id', config('tastyigniter.default_location_id', 1));

        if (empty($cart)) {
            Log::error('Paystack callback: cart missing from session', ['ref' => $reference]);
            return redirect()->route('menu')->with('error',
                'Payment received but session expired. Reference: ' . $reference . '. Please show this to staff.'
            );
        }

        // 3. Submit order to TastyIgniter NOW — payment is confirmed.
        try {
            $order = $this->ti->submitOrder($cart, $tableToken, $customerName, $customerEmail);
        } catch (\Throwable $e) {
            Log::error('TI order creation failed after payment', [
                'error' => $e->getMessage(),
                'ref'   => $reference,
            ]);
            // Payment succeeded but TI order failed — send customer to a holding state
            // with enough info for staff to manually create the order.
            return redirect()->route('menu')->with('error',
                'Payment received but order could not be sent to the kitchen. ' .
                'Reference: ' . $reference . '. Please show this to staff immediately.'
            );
        }

        $orderId = $order['order_id'];

        // Mark this reference as fulfilled so the webhook doesn't duplicate the order.
        Cache::put("paystack_fulfilled_{$reference}", $orderId, now()->addHours(4));

        // 4. Send admin notification email.
        try {
            $tableNum = session('cd_table_number');
            \Illuminate\Support\Facades\Mail::raw(
                "New order #{$orderId} received!\n\n" .
                "Table: {$tableNum}\n" .
                "Customer: {$customerName}\n" .
                "Reference: {$reference}\n\n" .
                "Check the admin panel for details.",
                function ($m) {
                    $m->to(config('mail.admin_address', config('mail.from.address')))
                      ->subject('New Order — Cookers Delight');
                }
            );
        } catch (\Throwable $e) {
            Log::warning('Admin notification email failed', ['error' => $e->getMessage()]);
        }

        // 5. Clear session cart; keep pending_order_id for the status page.
        session()->forget([
            'ordering_cart',
            'paystack_reference',
            'ordering_table_token',
            'ordering_location_id',
            'ordering_customer_email',
        ]);
        session(['pending_order_id' => $orderId]);

        return redirect()->route('order.status', ['orderId' => (int) $orderId]);
    }

    /**
     * Required by PaymentDriver contract.
     * Not used — our flow goes through CheckoutController (JSON endpoint)
     * rather than kawax's Blade redirect flow.
     */
    public function redirect(): mixed
    {
        return redirect()->route('menu');
    }

    private function cartTotal(array $cart): float
    {
        return collect($cart)->sum(fn ($item) => $item['price'] * $item['quantity']);
    }
}
