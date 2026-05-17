<?php
declare(strict_types=1);
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class KitchenController extends Controller
{
    private function apiHttp()
    {
        return Http::baseUrl(config('tastyigniter.api_url'))
            ->withToken(config('tastyigniter.api_token'))
            ->acceptJson()
            ->timeout(8)
            ->when(app()->environment('local'), fn ($h) => $h->withoutVerifying());
    }

    // Show kitchen display or PIN login screen
    public function index(Request $request)
    {
        if (! session('kitchen_authenticated')) {
            return view('kitchen.login');
        }
        return view('kitchen.display');
    }

    // Handle PIN login
    public function login(Request $request)
    {
        $pin = config('app.kitchen_pin', env('KITCHEN_PIN', '1234'));
        if ($request->input('pin') === $pin) {
            session(['kitchen_authenticated' => true]);
            return redirect()->route('kitchen');
        }
        return back()->withErrors(['pin' => 'Incorrect PIN. Try again.']);
    }

    // Logout — clear kitchen session
    public function logout(Request $request)
    {
        $request->session()->forget('kitchen_authenticated');
        return response()->json(['success' => true]);
    }

    // Debug: show raw TI /orders response — remove after troubleshooting
    public function debugPoll(Request $request)
    {
        if (! session('kitchen_authenticated')) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }
        $locationId = config('tastyigniter.default_location_id', 1);
        $response   = $this->apiHttp()->get('/orders', ['location' => $locationId]);
        $raw        = $response->json();
        $today      = now()->toDateString();

        $parsed = collect($raw['data'] ?? [])->map(function ($order) use ($today) {
            $attrs     = $order['attributes'] ?? $order;
            $createdAt = $attrs['created_at'] ?? null;
            try { $dateStr = \Carbon\Carbon::parse($createdAt)->utc()->toDateString(); }
            catch (\Throwable $e) { $dateStr = '(parse error)'; }
            $menus = $attrs['order_menus'] ?? [];
            $statusId  = (int) ($attrs['status_id'] ?? 0);
            $validIds  = [1, 2, 4, 5, 14];
            return [
                'id'               => $order['id'] ?? null,
                'raw_created'      => $createdAt,
                'parsed_date'      => $dateStr,
                'today'            => $today,
                'passes'           => $dateStr === $today && in_array($statusId, $validIds),
                'status_id'        => $statusId,
                'status_name'      => $attrs['status_name'] ?? null,
                'menus_count'      => count($menus),
                'first_item_keys'  => count($menus) > 0 ? array_keys($menus[0]) : [],
                'first_item'       => $menus[0] ?? null,
            ];
        });

        return response()->json([
            'http_status' => $response->status(),
            'today'       => $today,
            'total_raw'   => count($raw['data'] ?? []),
            'parsed'      => $parsed,
        ]);
    }

    // Poll for today's orders — called every 5s by Alpine
    public function poll(Request $request)
    {
        if (! session('kitchen_authenticated')) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $locationId = config('tastyigniter.default_location_id', 1);

        // Wrap TI call so a ConnectionException (TI unreachable) returns a
        // graceful empty list rather than crashing the PHP process with a 500.
        try {
            $response = $this->apiHttp()->get('/orders', [
                'location' => $locationId,
            ]);
        } catch (\Throwable $e) {
            Log::warning('Kitchen poll: TI API connection error', ['error' => $e->getMessage()]);
            return response()->json(['orders' => [], 'error' => 'TI unreachable']);
        }

        if ($response->failed()) {
            Log::warning('Kitchen poll: TI API failed', ['status' => $response->status(), 'body' => $response->body()]);
            return response()->json(['orders' => []]);
        }

        $today = now()->toDateString(); // UTC, matches TI timestamps

        // Build a menu_id → name index from the server-side cache so we can fill in
        // item names even when TI returns an empty name field on freshly-created orders.
        $cachedMenu   = \Illuminate\Support\Facades\Cache::get("ti_menu_{$locationId}", []);
        $menuNameIndex = [];
        foreach ($cachedMenu as $group) {
            foreach ($group['menus'] ?? [] as $item) {
                if (!empty($item['id']) && !empty($item['name'])) {
                    $menuNameIndex[(int) $item['id']] = $item['name'];
                }
            }
        }

        $orders = collect($response->json('data', []))->filter(function ($order) use ($today) {
            $attrs     = $order['attributes'] ?? $order;
            $createdAt = $attrs['created_at'] ?? null;
            if (! $createdAt) return false;

            // Only show today's orders (UTC comparison)
            try {
                $dateStr = \Carbon\Carbon::parse($createdAt)->utc()->toDateString();
            } catch (\Throwable $e) {
                return false;
            }
            return $dateStr === $today;
        })->map(function ($order) use ($menuNameIndex) {
            $attrs = $order['attributes'] ?? $order;
            $id    = $order['id'] ?? $attrs['order_id'] ?? null;

            // Decode order_options — TI stores it as a JSON string
            $opts = $attrs['order_options'] ?? [];
            if (is_string($opts)) {
                $opts = json_decode($opts, true) ?? [];
            }

            // Items live in attributes.order_menus (not in JSON:API relationships).
            // TI sometimes returns an empty name on freshly created orders — fall back
            // to the menu cache index keyed by menu_id so names always display.
            $items = collect($attrs['order_menus'] ?? [])->map(function ($m) use ($menuNameIndex) {
                $menuId    = (int) ($m['menu_id'] ?? 0);
                $tiName    = $m['name'] ?? $m['menu_name'] ?? '';
                $name      = ($tiName !== '' && $tiName !== null)
                    ? $tiName
                    : ($menuNameIndex[$menuId] ?? 'Item #' . $menuId);
                return [
                    'name'     => $name,
                    'quantity' => $m['quantity'] ?? $m['qty'] ?? 1,
                    'price'    => (float) ($m['price'] ?? 0),
                    'subtotal' => (float) ($m['subtotal'] ?? 0),
                ];
            })->values()->all();

            // Status: TI may return null status_name for status_id 14 if not configured.
            // Fall back to a readable label from the status_id.
            $statusIdLabels = [
                0  => 'Pending',
                1  => 'Pending',
                2  => 'Ready',
                4  => 'Preparing',
                5  => 'Served',
                14 => 'Received',
            ];
            $statusId    = (int) ($attrs['status_id'] ?? 0);
            $statusLabel = $attrs['status_name'] ?? $statusIdLabels[$statusId] ?? 'Pending';
            $statusKey   = strtolower(str_replace(' ', '_', $statusLabel));

            return [
                'id'            => (int) $id,
                'table_number'  => $opts['table_number'] ?? null,
                'customer_name' => trim(($attrs['first_name'] ?? '') . ' ' . ($attrs['last_name'] ?? '')),
                'status'        => $statusKey,
                'status_label'  => $statusLabel,
                'status_id'     => $statusId,
                'total'         => number_format((float) ($attrs['order_total'] ?? 0), 2),
                'comment'       => $attrs['comment'] ?? '',
                'created_at'    => $attrs['created_at'] ?? '',
                'items'         => $items,
                // Ghost = payment never confirmed (status 0) and no items saved.
                // Still shown but visually dimmed so real new orders stand out.
                'ghost'         => ($statusId === 0 && empty($items)),
            ];
        })->sortByDesc('id')->values()->all();

        return response()->json(['orders' => $orders, 'server_time' => now()->toISOString()]);
    }

    // Update order status
    public function updateStatus(Request $request, int $orderId)
    {
        if (! session('kitchen_authenticated')) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $status  = $request->input('status');
        $allowed = ['received', 'preparing', 'ready', 'served'];
        if (! in_array($status, $allowed)) {
            return response()->json(['error' => 'Invalid status'], 422);
        }

        // Map status name to common TI status IDs
        $statusIdMap = [
            'received'  => 14,
            'preparing' => 4,
            'ready'     => 2,
            'served'    => 5,
        ];

        // Try PATCH first (JSON:API standard), fall back to PUT if TI rejects PATCH.
        $payload  = ['status_id' => $statusIdMap[$status]];
        $response = $this->apiHttp()->patch("/orders/{$orderId}", $payload);

        // Some TI versions return 405 for PATCH — retry with PUT.
        if ($response->status() === 405) {
            $response = $this->apiHttp()->put("/orders/{$orderId}", $payload);
        }

        if ($response->failed()) {
            Log::error('Kitchen: failed to update order status', [
                'order'       => $orderId,
                'status'      => $status,
                'status_id'   => $statusIdMap[$status],
                'http_status' => $response->status(),
                'body'        => $response->body(),
            ]);
            return response()->json([
                'error'   => 'Failed to update status',
                'details' => $response->body(),   // shown in browser console for debugging
            ], 500);
        }

        return response()->json(['success' => true, 'status' => $status]);
    }
}
