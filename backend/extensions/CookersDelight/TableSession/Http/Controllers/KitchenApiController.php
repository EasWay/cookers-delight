<?php

declare(strict_types=1);

namespace CookersDelight\TableSession\Http\Controllers;

use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class KitchenApiController extends Controller
{
    // ── POST /api/kitchen/verify-pin ──────────────────────────────────────────
    // React login page calls this once. On 200, PIN is stored in localStorage.

    public function verifyPin(Request $request): JsonResponse
    {
        $pin        = (string) $request->input('pin', '');
        $correctPin = (string) config('app.kitchen_pin', env('KITCHEN_PIN', '1234'));

        if (! hash_equals($correctPin, $pin)) {
            return response()->json(['error' => 'Incorrect PIN. Try again.'], 401);
        }

        return response()->json(['ok' => true]);
    }

    // ── GET /api/kitchen/orders ───────────────────────────────────────────────
    // Polled every 5 s. Returns today's orders with order_type so React can
    // separate dine-in vs pre-arrival (collection) into two columns.

    public function poll(Request $request): JsonResponse
    {
        if (! $this->pinValid($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $locationId = (int) config('tastyigniter.default_location_id', 1);

        try {
            $response = $this->tiHttp()->get('/orders', [
                'location' => $locationId,
            ]);
        } catch (\Throwable $e) {
            Log::warning('KitchenApiController: TI unreachable', ['error' => $e->getMessage()]);
            return response()->json(['orders' => [], 'error' => 'TI unreachable']);
        }

        if ($response->failed()) {
            Log::warning('KitchenApiController: TI API failed', ['status' => $response->status()]);
            return response()->json(['orders' => []]);
        }

        $today = now()->toDateString();

        // Menu name index for fallback when TI returns empty name on new orders
        $cachedMenu    = Cache::get("ti_menu_{$locationId}", []);
        $menuNameIndex = [];
        foreach ($cachedMenu as $group) {
            foreach ($group['menus'] ?? [] as $item) {
                if (! empty($item['id']) && ! empty($item['name'])) {
                    $menuNameIndex[(int) $item['id']] = $item['name'];
                }
            }
        }

        $statusIdLabels = [
            0  => 'pending',
            1  => 'pending',
            2  => 'ready',
            4  => 'preparing',
            5  => 'served',
            14 => 'received',
        ];

        $orders = collect($response->json('data', []))
            ->filter(function ($order) use ($today) {
                $attrs     = $order['attributes'] ?? $order;
                $createdAt = $attrs['created_at'] ?? null;
                if (! $createdAt) {
                    return false;
                }
                try {
                    return Carbon::parse($createdAt)->utc()->toDateString() === $today;
                } catch (\Throwable) {
                    return false;
                }
            })
            ->map(function ($order) use ($menuNameIndex, $statusIdLabels) {
                $attrs = $order['attributes'] ?? $order;
                $id    = (int) ($order['id'] ?? $attrs['order_id'] ?? 0);

                $opts = $attrs['order_options'] ?? [];
                if (is_string($opts)) {
                    $opts = json_decode($opts, true) ?? [];
                }

                $items = collect($attrs['order_menus'] ?? [])
                    ->map(function ($m) use ($menuNameIndex) {
                        $menuId = (int) ($m['menu_id'] ?? 0);
                        $tiName = $m['name'] ?? $m['menu_name'] ?? '';
                        return [
                            'name'     => ($tiName !== '' && $tiName !== null)
                                            ? $tiName
                                            : ($menuNameIndex[$menuId] ?? 'Item #' . $menuId),
                            'quantity' => $m['quantity'] ?? $m['qty'] ?? 1,
                            'price'    => (float) ($m['price'] ?? 0),
                        ];
                    })->values()->all();

                $statusId  = (int) ($attrs['status_id'] ?? 0);
                $statusKey = $statusIdLabels[$statusId] ?? 'pending';

                return [
                    'id'            => $id,
                    'order_type'    => $attrs['order_type'] ?? null,
                    'table_number'  => $opts['table_number'] ?? ($attrs['table_name'] ?? null),
                    'customer_name' => trim(($attrs['first_name'] ?? '') . ' ' . ($attrs['last_name'] ?? '')),
                    'status'        => $statusKey,
                    'status_id'     => $statusId,
                    'total'         => number_format((float) ($attrs['order_total'] ?? 0), 2),
                    'comment'       => $attrs['comment'] ?? '',
                    'created_at'    => $attrs['created_at'] ?? '',
                    'items'         => $items,
                    'ghost'         => ($statusId === 0 && empty($items)),
                ];
            })
            ->sortByDesc('id')
            ->values()
            ->all();

        return response()->json([
            'orders'      => $orders,
            'server_time' => now()->toISOString(),
        ]);
    }

    // ── POST /api/kitchen/orders/{orderId}/status ─────────────────────────────

    public function updateStatus(Request $request, int $orderId): JsonResponse
    {
        if (! $this->pinValid($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $status  = $request->input('status');
        $allowed = ['received', 'preparing', 'ready', 'served'];

        if (! in_array($status, $allowed, true)) {
            return response()->json(['error' => 'Invalid status'], 422);
        }

        $statusIdMap = ['received' => 14, 'preparing' => 4, 'ready' => 2, 'served' => 5];
        $payload     = ['status_id' => $statusIdMap[$status]];

        $response = $this->tiHttp()->patch("/orders/{$orderId}", $payload);

        // Some TI versions return 405 for PATCH — retry with PUT.
        if ($response->status() === 405) {
            $response = $this->tiHttp()->put("/orders/{$orderId}", $payload);
        }

        if ($response->failed()) {
            Log::error('KitchenApiController: status update failed', [
                'order'  => $orderId,
                'status' => $status,
                'http'   => $response->status(),
            ]);
            return response()->json(['error' => 'Failed to update status'], 500);
        }

        return response()->json(['success' => true, 'status' => $status]);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function pinValid(Request $request): bool
    {
        $submitted = (string) $request->header('X-Kitchen-Pin', '');
        $correct   = (string) config('app.kitchen_pin', env('KITCHEN_PIN', '1234'));
        return hash_equals($correct, $submitted);
    }

    private function tiHttp()
    {
        return Http::baseUrl(config('tastyigniter.api_url'))
            ->withToken(config('tastyigniter.api_token'))
            ->acceptJson()
            ->timeout(8)
            ->when(app()->environment('local'), fn ($h) => $h->withoutVerifying());
    }
}
