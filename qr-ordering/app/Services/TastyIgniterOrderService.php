<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Thin bridge between kawax/self-ordering and TastyIgniter.
 *
 * Responsibilities:
 *   1. Authenticate to TI API
 *   2. Fetch menu items & categories (TI is source of truth)
 *   3. Submit order payload to TI
 *   4. Retrieve order status (polled by SSE endpoint on TI side)
 *   5. Attach table session metadata
 *   6. Normalize TI response payloads to kawax-compatible shapes
 *
 * This service must NOT:
 *   - Store menu data locally
 *   - Duplicate pricing or inventory logic
 *   - Maintain order state (TI owns that)
 */
class TastyIgniterOrderService
{
    private PendingRequest $http;

    public function __construct()
    {
        $this->http = Http::baseUrl(config('tastyigniter.api_url'))
            ->withToken(config('tastyigniter.api_token'))
            ->acceptJson()
            ->timeout(10)
            ->retry(3, 300)
            ->when(app()->environment('local'), fn ($h) => $h->withoutVerifying());
    }

    // -------------------------------------------------------------------------
    // Menu
    // -------------------------------------------------------------------------

    /**
     * Fetch all categories and their menu items for a given location.
     * Returns the kawax-compatible menu shape:
     * [['category' => '...', 'menus' => [['name', 'price', 'description', 'image', 'options']]]]
     */
    public function fetchMenu(int $locationId): array
    {
        // Request categories with their menus as a JSON:API compound document.
        $catResponse = $this->http->get('/categories', [
            'location' => $locationId,
            'include'  => 'menus',
        ]);

        if ($catResponse->failed()) {
            Log::error('TI API: failed to fetch categories', ['status' => $catResponse->status()]);
            return [];
        }

        $categories = collect($catResponse->json('data', []));
        $menuLookup = collect($catResponse->json('included', []))
            ->where('type', 'menus')
            ->keyBy('id');

        // Build category → menus map from the compound document.
        $grouped = $categories->map(function ($cat) use ($menuLookup) {
            $catAttrs = $cat['attributes'] ?? [];
            $menuIds  = collect($cat['relationships']['menus']['data'] ?? [])->pluck('id');

            return [
                'category' => $catAttrs['name'] ?? 'Unnamed',
                'menus'    => $menuIds
                    ->map(fn ($id) => $menuLookup->get((string) $id))
                    ->filter()
                    ->map(fn ($m) => $this->normalizeMenuItem($m))
                    ->values()
                    ->all(),
            ];
        })->filter(fn ($cat) => !empty($cat['menus']))->values();

        // ── Fallback: menus not assigned to categories in TastyIgniter ──────
        // Fetch menus directly and show them all under one group so the customer
        // can still browse. Assign menus to categories in TI admin to restore
        // proper category navigation.
        if ($grouped->isEmpty()) {
            Log::warning('TI API: no menus linked to categories — showing flat list fallback.');

            $menusResponse = $this->http->get('/menus', [
                'location' => $locationId,
                'enabled'  => true,
            ]);

            if ($menusResponse->failed()) {
                return [];
            }

            $allMenus = collect($menusResponse->json('data', []))
                ->map(fn ($m) => $this->normalizeMenuItem($m))
                ->values()
                ->all();

            if (empty($allMenus)) {
                return [];
            }

            return [['category' => 'All Items', 'menus' => $allMenus]];
        }

        return $grouped->all();
    }

    private function normalizeMenuItem(array $item): array
    {
        // TastyIgniter JSON:API: top-level id + nested attributes object.
        $attrs = $item['attributes'] ?? $item;
        $id    = $item['id'] ?? $attrs['menu_id'] ?? $attrs['id'] ?? null;

        return [
            'id'          => $id,
            'name'        => $attrs['menu_name']        ?? $attrs['name']        ?? '',
            'description' => $attrs['menu_description'] ?? $attrs['description'] ?? '',
            'price'       => (float) ($attrs['menu_price'] ?? $attrs['price'] ?? 0),
            'image'       => $attrs['thumb'] ?? ($attrs['media']['thumb'] ?? null),
            'options'     => $this->normalizeOptions($attrs['menu_options'] ?? []),
            'available'   => (bool) ($attrs['menu_status'] ?? $attrs['status'] ?? true),
        ];
    }

    private function normalizeOptions(array $rawOptions): array
    {
        return collect($rawOptions)->map(fn ($opt) => [
            'id'       => $opt['menu_option_id'],
            'name'     => $opt['option']['display_name'] ?? $opt['option_name'] ?? '',
            'required' => (bool) ($opt['required'] ?? false),
            'min'      => $opt['min_selected'] ?? 0,
            'max'      => $opt['max_selected'] ?? 1,
            'values'   => collect($opt['option']['option_values'] ?? [])->map(fn ($v) => [
                'id'    => $v['menu_option_value_id'] ?? $v['id'],
                'name'  => $v['name'],
                'price' => (float) ($v['price'] ?? 0),
            ])->all(),
        ])->all();
    }

    // -------------------------------------------------------------------------
    // Orders
    // -------------------------------------------------------------------------

    /**
     * Submit a completed cart to TastyIgniter as a dine-in order.
     *
     * Returns ['order_id' => int, 'hash' => string] on success,
     * throws on failure.
     */
    public function submitOrder(array $cart, string $tableToken, string $customerName, string $customerEmail = ''): array
    {
        $backendUrl = config('app.backend_url')
            ?? rtrim(preg_replace('#/api$#', '', config('tastyigniter.api_url') ?? ''), '/');

        // Resolve table/location context from our TI extension.
        $sessionResponse = Http::baseUrl($backendUrl)
            ->when(app()->environment('local'), fn ($h) => $h->withoutVerifying())
            ->get("/api/table-sessions/{$tableToken}");

        if ($sessionResponse->failed()) {
            throw new \RuntimeException('Invalid or expired QR session.');
        }

        $session    = $sessionResponse->json();
        $locationId = $session['location_id'];
        $tableNum   = $session['table_number'];

        // Split "First Last" → first_name / last_name (TI requires both fields).
        // If only one word given, use it for both so validation passes.
        $nameParts = explode(' ', trim($customerName), 2);
        $firstName = $nameParts[0];
        $lastName  = $nameParts[1] ?? $nameParts[0];

        // Calculate order total here so TI receives it explicitly.
        // TI sometimes fails to sum line items server-side, resulting in GHC0.00 totals.
        $orderTotal = collect($cart)->sum(fn ($i) => $i['price'] * $i['quantity']);

        $payload = [
            'location_id'  => $locationId,
            'order_type'   => 'dine-in',
            'first_name'   => $firstName,
            'last_name'    => $lastName,
            'email'        => $customerEmail,
            // comment appears in TI admin order list and confirmation emails
            'comment'      => "Table {$tableNum} — {$session['location_name']}",
            'payment'      => 'paystack',
            'status_id'    => 14,           // 14 = "Order Received" in TastyIgniter
            'processed'    => true,         // marks payment as done, triggers order_total calc
            'order_menus'  => $this->buildOrderItems($cart),   // TI expects 'order_menus'
            'order_totals' => [
                ['code' => 'subtotal', 'title' => 'Subtotal', 'value' => round($orderTotal, 2), 'priority' => 1],
                ['code' => 'total',    'title' => 'Total',    'value' => round($orderTotal, 2), 'priority' => 99],
            ],
            // order_options is a JSON field TI stores alongside the order;
            // our admin Tables Dashboard reads table_number from here.
            'order_options' => json_encode([
                'table_number'   => $tableNum,
                'location_name'  => $session['location_name'],
                'session_token'  => $tableToken,
            ]),
        ];

        $response = $this->http->post('/orders', $payload);

        if ($response->failed()) {
            Log::error('TI API: order submission failed', [
                'status'  => $response->status(),
                'body'    => $response->body(),
                'payload' => $payload,
            ]);
            throw new \RuntimeException('Failed to submit order: ' . $response->status());
        }

        $order = $response->json('data');

        // TI returns JSON:API format: id at top level, fields inside attributes.
        // Handle both shapes defensively.
        $attrs   = $order['attributes'] ?? $order;
        $orderId = $attrs['order_id']
            ?? $attrs['id']
            ?? $order['id']          // JSON:API top-level id
            ?? null;

        if (! $orderId) {
            Log::error('TI API: could not extract order_id from response', ['data' => $order]);
            throw new \RuntimeException('Order created but ID not returned by TastyIgniter.');
        }

        $orderId = (int) $orderId;

        // Link the TI order back to the QR session via our extension.
        Http::baseUrl($backendUrl)
            ->when(app()->environment('local'), fn ($h) => $h->withoutVerifying())
            ->post("/api/table-sessions/{$tableToken}/order", ['order_id' => $orderId]);

        return [
            'order_id' => $orderId,
            'hash'     => $attrs['hash'] ?? $order['hash'] ?? null,
        ];
    }

    private function buildOrderItems(array $cart): array
    {
        // TI's restAfterSave expects objects with these exact keys (json_decoded):
        //   id = menu_id, name, qty, price, subtotal, comment, options[]
        // We fetch the menu name from cache so TI stores it on the order_menu row.
        $nameCache = [];
        $cachedMenu = \Illuminate\Support\Facades\Cache::get('ti_menu_1', []);
        foreach ($cachedMenu as $group) {
            foreach ($group['menus'] ?? [] as $m) {
                $nameCache[$m['id']] = $m['name'] ?? '';
            }
        }

        return collect($cart)->map(fn ($item) => [
            'id'       => $item['id'],                          // menu_id
            'name'     => $nameCache[$item['id']] ?? 'Item',    // item name for receipt
            'qty'      => $item['quantity'],                    // TI uses 'qty' not 'quantity'
            'price'    => $item['price'],
            'subtotal' => $item['price'] * $item['quantity'],
            'comment'  => $item['note'] ?? '',
            'options'  => [],
        ])->all();
    }

    // -------------------------------------------------------------------------
    // Prep times
    // -------------------------------------------------------------------------

    /**
     * Fetch prep times for all menu items, keyed by menu_id.
     * Returns: [menu_id => prep_time_minutes, ...]
     */
    public function fetchPrepTimes(): array
    {
        // backend_url is the base of the stub/TI backend (without /api suffix).
        // Falls back to stripping /api from the TI API URL if not set separately.
        $backendUrl = config('app.backend_url')
            ?? rtrim(preg_replace('#/api$#', '', config('tastyigniter.api_url') ?? ''), '/');

        try {
            $response = Http::baseUrl($backendUrl)
                ->when(app()->environment('local'), fn ($h) => $h->withoutVerifying())
                ->get('/api/cd/prep-times');

            if ($response->failed()) {
                return [];
            }

            return $response->json('data', []);
        } catch (\Throwable $e) {
            Log::warning('TastyIgniterOrderService: fetchPrepTimes failed', ['error' => $e->getMessage()]);
            return []; // non-fatal — CheckoutController defaults to 15 min
        }
    }

    // -------------------------------------------------------------------------
    // Status
    // -------------------------------------------------------------------------

    /**
     * Get the current status of an order from TI.
     * Used as a fallback — the SSE endpoint on TI does the live streaming.
     */
    public function getOrderStatus(int $orderId): array
    {
        $response = $this->http->get("/orders/{$orderId}");

        if ($response->failed()) {
            return ['status' => 'unknown'];
        }

        $order = $response->json('data');

        return [
            'order_id' => $orderId,
            'status'   => $order['status']['status_name'] ?? 'Pending',
            'color'    => $order['status']['status_color'] ?? '#f59e0b',
        ];
    }
}
