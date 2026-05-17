<?php

namespace App\Http\Controllers;

use App\Services\TastyIgniterOrderService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\StreamedResponse;

class OrderStatusController extends Controller
{
    public function __construct(private TastyIgniterOrderService $ti) {}

    public function show(Request $request, int $orderId)
    {
        // Polling endpoint — replaces SSE so no long-running connection blocks the PHP worker.
        $pollUrl = route('order.poll', ['orderId' => $orderId]);

        $estimatedWaitMinutes = session('cd_estimated_wait_minutes');

        // Receipt channel data stored by CheckoutController.
        $receiptChannel   = session('receipt_channel', 'email');
        $customerWhatsapp = session('customer_whatsapp', '');
        $customerName     = session('customer_name', '');

        // Build WhatsApp receipt share URL.
        $orderingCart = session('ordering_cart', []);
        $cartLines    = collect($orderingCart)->map(fn ($i) =>
            $i['quantity'] . '× item #' . $i['id'] . ' — GHS ' . number_format($i['price'] * $i['quantity'], 2)
        )->implode("\n");

        $waText = rawurlencode(
            "🍽️ *Cookers Delight — Order Receipt*\n" .
            "Order #: {$orderId}\n" .
            "Name: {$customerName}\n\n" .
            "{$cartLines}\n\n" .
            "Track live: " . url("/orders/{$orderId}/status")
        );
        $whatsappReceiptUrl = $customerWhatsapp
            ? "https://wa.me/{$customerWhatsapp}?text={$waText}"
            : null;

        return view('order-status', compact(
            'orderId', 'pollUrl', 'estimatedWaitMinutes',
            'receiptChannel', 'whatsappReceiptUrl'
        ));
    }

    /**
     * Lightweight JSON poll endpoint — called every 4 s by the browser.
     * Returns the current order status in one quick request with no
     * long-running connection, which is safe for single-worker PHP servers.
     */
    public function poll(Request $request, int $orderId)
    {
        // Map TI status names / IDs → canonical front-end labels.
        $stepMap = [
            'pending'    => ['step' => null,        'label' => 'Pending',   'color' => '#D97706'],
            'received'   => ['step' => 'received',  'label' => 'Received',  'color' => '#1B5E20'],
            'preparing'  => ['step' => 'preparing', 'label' => 'Preparing', 'color' => '#D97706'],
            'ready'      => ['step' => 'ready',     'label' => 'Ready',     'color' => '#1B5E20'],
            'served'     => ['step' => 'served',    'label' => 'Served',    'color' => '#1B5E20'],
            'cancelled'  => ['step' => null,        'label' => 'Cancelled', 'color' => '#DC2626'],
            'delivered'  => ['step' => 'served',    'label' => 'Served',    'color' => '#1B5E20'],
            'processing' => ['step' => 'preparing', 'label' => 'Preparing', 'color' => '#D97706'],
            'completed'  => ['step' => 'served',    'label' => 'Served',    'color' => '#1B5E20'],
        ];

        $statusIdNames = [
            0  => 'pending',
            1  => 'pending',
            2  => 'ready',
            4  => 'preparing',
            5  => 'served',
            14 => 'received',
        ];

        $terminalSteps = ['served', 'cancelled'];

        try {
            $response = \Illuminate\Support\Facades\Http::baseUrl(config('tastyigniter.api_url'))
                ->withToken(config('tastyigniter.api_token'))
                ->acceptJson()
                ->timeout(8)
                ->when(app()->environment('local'), fn ($h) => $h->withoutVerifying())
                ->get("/orders/{$orderId}");

            if (!$response->ok()) {
                return response()->json(['error' => 'Order not found'], 404);
            }

            $data      = $response->json('data', []);
            $attrs     = $data['attributes'] ?? $data;
            $statusId  = (int) ($attrs['status_id'] ?? 0);
            $rawStatus = strtolower(
                $attrs['status_name'] ?? $statusIdNames[$statusId] ?? 'pending'
            );
            $mapped = $stepMap[$rawStatus] ?? ['step' => null, 'label' => ucfirst($rawStatus), 'color' => '#D97706'];

            return response()->json([
                'status'       => $mapped['label'],
                'status_color' => $mapped['color'],
                'step'         => $mapped['step'],
                'raw'          => $rawStatus,
                'terminal'     => in_array($mapped['step'], $terminalSteps),
            ]);

        } catch (\Throwable $e) {
            Log::warning('OrderStatusController::poll error', ['error' => $e->getMessage(), 'order' => $orderId]);
            return response()->json(['error' => 'Temporarily unavailable'], 503);
        }
    }
}
