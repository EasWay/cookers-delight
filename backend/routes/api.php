<?php

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| All routes here are prefixed with /api by the RouteServiceProvider and
| use the `api` middleware group (stateless, no CSRF).
|
*/

use Igniter\Api\Models\Token;
use Igniter\User\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;

/**
 * POST /api/admin/auth
 *
 * Authenticates an admin/staff user (ti_admin_users) with email + password.
 * On success, issues a Sanctum personal access token via TastyIgniter's
 * Igniter\Api\Models\Token model and returns { token, user } for the SPA.
 *
 * Used by the CookersDelight admin SPA on :5173.
 */
Route::post('/admin/auth', function (Request $request) {
    $credentials = $request->validate([
        'email'    => ['required', 'email'],
        'password' => ['required', 'string'],
    ]);

    /** @var \Igniter\User\Models\User|null $user */
    $user = User::where('email', $credentials['email'])->first();

    // SECURITY: identical response for "no such user" and "wrong password"
    // so attackers can't enumerate valid emails by timing/status.
    if (!$user || !$user->password || !Hash::check($credentials['password'], $user->password)) {
        return response()->json(['message' => 'Invalid credentials'], 401);
    }

    if (!$user->status || !$user->is_activated) {
        return response()->json(['message' => 'Account is inactive'], 403);
    }

    // Revoke any prior tokens issued to this SPA so a fresh login replaces them.
    $user->tokens()->where('name', 'admin-spa')->delete();

    $newToken = Token::createToken($user, 'admin-spa', ['*']);

    $user->forceFill([
        'last_login' => now(),
        'last_seen'  => now(),
    ])->save();

    return response()->json([
        'token' => $newToken->plainTextToken,
        'user'  => [
            'id'    => $user->user_id,
            'name'  => $user->name,
            'email' => $user->email,
            'role'  => $user->super_user ? 'super_admin' : ($user->role?->name ?? 'admin'),
        ],
    ]);
});

/**
 * GET /api/admin/me
 *
 * Returns the authenticated admin user. Useful for the SPA to rehydrate
 * state from a stored token on page reload.
 */
Route::middleware('auth:sanctum')->get('/admin/me', function (Request $request) {
    /** @var \Igniter\User\Models\User $user */
    $user = $request->user();

    return response()->json([
        'id'    => $user->user_id,
        'name'  => $user->name,
        'email' => $user->email,
        'role'  => $user->super_user ? 'super_admin' : ($user->role?->name ?? 'admin'),
    ]);
});

/**
 * POST /api/admin/logout
 *
 * Revokes the calling token. The SPA should also clear localStorage.
 */
Route::middleware('auth:sanctum')->post('/admin/logout', function (Request $request) {
    $request->user()->currentAccessToken()?->delete();
    return response()->json(['message' => 'Logged out']);
});

/*
|--------------------------------------------------------------------------
| TEMPORARY STUBS for endpoints the SPA expects but that aren't implemented
| yet. These return empty/safe payloads so the dashboard doesn't 404-spam
| Laravel's single-threaded dev server (which would block login).
|
| Replace these with real implementations when ready.
|--------------------------------------------------------------------------
*/

// Announcements — the SPA polls this once/sec even on the login screen.
// Returning [] fast is what unblocks login when running under `artisan serve`.
Route::get('/announcements',         fn() => response()->json(['data' => []]));
Route::post('/announcements',        fn(Request $r) => response()->json(['data' => $r->all()], 201));
Route::put('/announcements/{id}',    fn(Request $r, $id) => response()->json(['data' => array_merge(['id' => $id], $r->all())]));
Route::delete('/announcements/{id}', fn($id) => response()->json(null, 204));

// Dashboard widgets — real DB queries, each wrapped in rescue() so a missing
// table returns 0 for that card rather than crashing the whole endpoint.
Route::get('/dashboard/stats', function () {
    $today = now()->toDateString();

    $ordersToday = rescue(
        fn() => DB::table('orders')->whereDate('date_added', $today)->count(),
        0
    );

    $revenueToday = rescue(
        fn() => DB::table('orders')->whereDate('date_added', $today)->sum('order_total'),
        0
    );

    $tablesOccupied = rescue(
        fn() => DB::table('cd_table_sessions')
                  ->whereNull('closed_at')
                  ->whereDate('created_at', $today)
                  ->count(),
        0
    );

    $pendingOrders = rescue(
        fn() => DB::table('orders')
                  ->join('statuses', 'orders.status_id', '=', 'statuses.status_id')
                  ->whereDate('orders.date_added', $today)
                  ->whereNotIn('statuses.status_name', ['Served', 'Cancelled', 'Rejected'])
                  ->count(),
        0
    );

    return response()->json([
        'orders_today'    => $ordersToday,
        'revenue_today'   => $revenueToday,
        'tables_occupied' => $tablesOccupied,
        'pending_orders'  => $pendingOrders,
    ]);
});

// CookersDelight prep-times extension stub.
Route::get('/cd/prep-times', fn() => response()->json(['data' => []]));
Route::put('/cd/prep-times/{menuId}', fn(Request $r, $menuId) => response()->json([
    'menu_id' => $menuId,
    'prep_time_minutes' => $r->input('prep_time_minutes'),
]));

// CookersDelight settings — wired to real controller with masked GET for secrets.
Route::get('/cd/settings',         [\CookersDelight\TableSession\Http\Controllers\CdSettingsController::class, 'index']);
Route::put('/cd/settings/{key}',   [\CookersDelight\TableSession\Http\Controllers\CdSettingsController::class, 'set']);
Route::put('/cd/settings',         [\CookersDelight\TableSession\Http\Controllers\CdSettingsController::class, 'setMany']);

/*
 * Admin tables (dine-in tables / QR codes) — file-backed stub.
 *
 * Persists in storage/app/cd-tables.json so additions stick across
 * requests until a proper `cd_tables` schema is built.
 */
$tablesStoreLoad = function (): array {
    $path = storage_path('app/cd-tables.json');
    if (!file_exists($path)) return [];
    $raw = json_decode((string) file_get_contents($path), true);
    return is_array($raw) ? $raw : [];
};
$tablesStoreSave = function (array $tables): void {
    file_put_contents(storage_path('app/cd-tables.json'), json_encode(array_values($tables)));
};

Route::get('/admin/tables', function () use ($tablesStoreLoad) {
    $tables = $tablesStoreLoad();
    $groups = \Igniter\Local\Models\Location::query()
        ->where('location_status', 1)
        ->get(['location_id', 'location_name'])
        ->map(function ($loc) use ($tables) {
            return [
                'location_id'   => $loc->location_id,
                'location_name' => $loc->location_name,
                'tables'        => array_values(array_filter(
                    $tables,
                    fn($t) => (int) ($t['location_id'] ?? 0) === (int) $loc->location_id,
                )),
            ];
        });
    return response()->json(['data' => $groups]);
});

Route::post('/admin/tables', function (Request $r) use ($tablesStoreLoad, $tablesStoreSave) {
    $data = $r->validate([
        'location_id'  => ['required', 'integer'],
        'table_number' => ['required', 'integer', 'min:1'],
        'capacity'     => ['nullable', 'integer', 'min:1'],
    ]);
    $tables   = $tablesStoreLoad();
    $nextId   = (int) (max(array_column($tables, 'table_id') ?: [0]) + 1);
    $newTable = [
        'table_id'       => $nextId,
        'location_id'    => (int) $data['location_id'],
        'table_number'   => (int) $data['table_number'],
        'capacity'       => (int) ($data['capacity'] ?? 4),
        // stable_token is what the QR encodes — needs to be unique + opaque.
        // Frontend renders the first 8 chars as a debug-style chip.
        'stable_token'   => bin2hex(random_bytes(16)),
        'active_session' => null,
        'created_at'     => now()->toIso8601String(),
    ];
    $tables[] = $newTable;
    $tablesStoreSave($tables);
    return response()->json(['data' => $newTable], 201);
});

Route::delete('/admin/tables/{id}', function ($id) use ($tablesStoreLoad, $tablesStoreSave) {
    $tables = array_values(array_filter(
        $tablesStoreLoad(),
        fn($t) => (int) ($t['table_id'] ?? 0) !== (int) $id,
    ));
    $tablesStoreSave($tables);
    return response()->json(null, 204);
});

/*
 * GET /api/table-sessions/{sessionToken}
 *
 * Look up an active session by its ephemeral session_token.
 * Called by TastyIgniterOrderService::submitOrder() to resolve location_id
 * and table_number before submitting an order to TastyIgniter.
 *
 * Returns 404 if the session token is not found or has expired.
 */
Route::get('/table-sessions/{sessionToken}', function (string $sessionToken) use ($tablesStoreLoad) {
    $tables = $tablesStoreLoad();

    foreach ($tables as $table) {
        $session = $table['active_session'] ?? null;
        if (! $session) continue;
        if (($session['session_token'] ?? '') !== $sessionToken) continue;

        // Check expiry
        if (now()->isAfter($session['expires_at'] ?? now()->subSecond())) {
            return response()->json(['error' => 'Session has expired.'], 404);
        }

        $location = \Igniter\Local\Models\Location::find((int) $table['location_id']);

        return response()->json([
            'session_token' => $sessionToken,
            'table_number'  => (int) $table['table_number'],
            'location_id'   => (int) $table['location_id'],
            'location_name' => $location?->location_name ?? 'Cookers Delight',
        ]);
    }

    return response()->json(['error' => 'Session not found.'], 404);
});

/*
 * POST /api/table-sessions/{sessionToken}/order
 *
 * Links a TastyIgniter order_id back to an active table session.
 * Called by TastyIgniterOrderService::submitOrder() after the order is created.
 */
Route::post('/table-sessions/{sessionToken}/order', function (Request $request, string $sessionToken) use ($tablesStoreLoad, $tablesStoreSave) {
    $orderId = $request->input('order_id');
    $tables  = $tablesStoreLoad();

    foreach ($tables as $i => $table) {
        if (($table['active_session']['session_token'] ?? '') === $sessionToken) {
            $tables[$i]['active_session']['order_id'] = $orderId;
            $tablesStoreSave($tables);
            return response()->json(['status' => 'ok']);
        }
    }

    return response()->json(['error' => 'Session not found.'], 404);
});

/*
 * QR scan entry point — called by the qr-ordering app when a customer scans
 * a table QR code. Looks up the table by its stable_token, creates a fresh
 * 4-hour session, and returns the session data the ordering app needs.
 */
Route::post('/table-sessions/by-table/{stableToken}', function (string $stableToken) use ($tablesStoreLoad, $tablesStoreSave) {
    $tables = $tablesStoreLoad();
    $index  = null;
    $table  = null;

    foreach ($tables as $i => $t) {
        if (($t['stable_token'] ?? '') === $stableToken) {
            $index = $i;
            $table = $t;
            break;
        }
    }

    if ($table === null) {
        return response()->json(['error' => 'Table not found.'], 404);
    }

    // Look up location name from TastyIgniter.
    $location = \Igniter\Local\Models\Location::find((int) $table['location_id']);

    // Generate a fresh session token (4-hour ephemeral session).
    $sessionToken = bin2hex(random_bytes(24));

    $activeSession = [
        'session_token' => $sessionToken,
        'expires_at'    => now()->addHours(4)->toIso8601String(),
        'created_at'    => now()->toIso8601String(),
    ];

    // Persist the active session onto the table record.
    $tables[$index]['active_session'] = $activeSession;
    $tablesStoreSave($tables);

    return response()->json([
        'session_token' => $sessionToken,
        'table_number'  => (int) $table['table_number'],
        'location_id'   => (int) $table['location_id'],
        'location_name' => $location?->location_name ?? 'Cookers Delight',
    ]);
});

/*
 * Detect the dev machine's LAN IP so QR codes are scannable from phones on
 * the same Wi-Fi. Without this, a QR encoding `http://localhost:5173/...`
 * is useless off the dev machine — `localhost` resolves to the phone, not
 * the laptop.
 *
 * Order of attempts:
 *   1. UDP-connect-to-8.8.8.8 trick via streams (no actual packet sent;
 *      the OS picks the outgoing interface and reports its local IP).
 *   2. `gethostbyname(gethostname())` — usually the primary NIC on Windows.
 *   3. Give up and return null (caller keeps the existing host).
 */
$detectLanIp = function (): ?string {
    $sock = @stream_socket_client('udp://8.8.8.8:53', $errno, $errstr, 1, STREAM_CLIENT_CONNECT);
    if ($sock) {
        $name = @stream_socket_get_name($sock, false);
        @fclose($sock);
        if ($name) {
            $ip = explode(':', $name)[0];
            if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) && $ip !== '127.0.0.1') {
                return $ip;
            }
        }
    }
    $ip = @gethostbyname(@gethostname() ?: '');
    if (is_string($ip) && filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) && $ip !== '127.0.0.1') {
        return $ip;
    }
    return null;
};

Route::get('/admin/tables/{id}/qr-print', function ($id) use ($tablesStoreLoad, $detectLanIp) {
    $table = collect($tablesStoreLoad())
        ->firstWhere('table_id', (int) $id);

    if (!$table) {
        return response()->json(['message' => 'Table not found'], 404);
    }

    // QR target = customer-facing ordering URL for this table. Default to
    // the Vite frontend on :5173 — override in .env with QR_ORDERING_URL
    // when you deploy (ngrok URL, prod domain, etc.).
    $orderingBase = (string) config('app.qr_ordering_url', env('QR_ORDERING_URL', 'http://localhost:5173'));

    // If the configured base points at localhost/127.0.0.1, swap in the
    // LAN IP so phones can actually reach it. If the user set an explicit
    // public URL we leave it alone.
    $lanIp = $detectLanIp();
    if ($lanIp && preg_match('#^https?://(localhost|127\.0\.0\.1)(:\d+)?#i', $orderingBase)) {
        // Callback avoids the $1-followed-by-"10" backreference ambiguity
        // when the LAN IP starts with digits ("$110.161..." would be read
        // as backref $110 and the prefix would silently disappear).
        $orderingBase = preg_replace_callback(
            '#^(https?://)(localhost|127\.0\.0\.1)#i',
            fn($m) => $m[1] . $lanIp,
            $orderingBase
        );
    }

    $orderingUrl = sprintf('%s/table/%s', rtrim($orderingBase, '/'), $table['stable_token']);

    // Free QR renderer — no install, no API key. 600×600 prints cleanly.
    $qrUrl = sprintf(
        'https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=10&data=%s',
        urlencode($orderingUrl),
    );

    return response()->json([
        'data' => [
            'table_id'     => (int) $table['table_id'],
            'table_number' => (int) $table['table_number'],
            'qr_url'       => $qrUrl,
            'ordering_url' => $orderingUrl,
            'lan_ip'       => $lanIp, // shown in the print dialog for debugging
        ],
    ]);
});

/*
 * One-time setup: assign menus to their correct TastyIgniter categories.
 * Visit GET /api/setup/assign-menu-categories once, then this route can be removed.
 */
Route::get('/setup/assign-menu-categories', function () {
    $map = [
        // menu_id => [category_ids]
        1  => [1],    // Puff-Puff           → Appetizer
        2  => [1],    // SCOTCH EGG          → Appetizer
        3  => [2],    // ATA RICE            → Main Course
        4  => [2],    // RICE AND DODO       → Main Course
        5  => [8],    // Special Shrimp Deluxe → Specials
        6  => [4],    // Whole catfish       → Seafoods
        7  => [3],    // African Salad       → Salads
        8  => [3],    // Seafood Salad       → Salads
        9  => [5],    // EBA                 → Traditional
        10 => [5],    // AMALA               → Traditional
        11 => [5],    // YAM PORRIDGE        → Traditional
        12 => [5],    // Boiled Plantain     → Traditional
    ];

    $results = [];
    foreach ($map as $menuId => $categoryIds) {
        $menu = \Igniter\Cart\Models\Menu::find($menuId);
        if ($menu) {
            $menu->addMenuCategories($categoryIds);
            $results[$menu->menu_name] = $categoryIds;
        } else {
            $results["menu_id_{$menuId}"] = 'NOT FOUND';
        }
    }

    return response()->json(['assigned' => $results, 'status' => 'done']);
});

/*
 * /api/statuses → alias to TI's existing /api/status (singular).
 * SPA calls statusesApi.list -> '/statuses'; rather than rename the SPA
 * client, we forward via an internal sub-request preserving auth + query.
 */
Route::match(['GET', 'HEAD'], '/statuses', function (Request $r) {
    $sub = Request::create('/api/status', 'GET', $r->query());
    $sub->headers->replace($r->headers->all());
    return app()->handle($sub);
});

/**
 * POST /api/paystack/webhook
 *
 * Backend webhook handler — for orders originated on the backend
 * (Phase 2a: direct checkout / pre-arrival ordering).
 *
 * NOT the active handler for dine-in QR orders.
 * The active dine-in handler is: qr-ordering → POST /PayStack/webhook
 *
 * Reference format expected: CD-{orderId}-{timestamp}
 * (set by the backend checkout endpoint, not by qr-ordering's CheckoutController)
 *
 * Paystack dashboard URL for this handler (production):
 *   https://yourdomain.com/api/paystack/webhook
 */
Route::post('/paystack/webhook', function (Request $request) {
    // ── 1. Verify signature ────────────────────────────────────────
    $secretKey = \CookersDelight\TableSession\Support\PaystackConfig::secretKey();

    if (! $secretKey) {
        \Illuminate\Support\Facades\Log::error('Paystack webhook: secret key not configured');
        return response('Server misconfigured', 500);
    }

    $computedSig = hash_hmac('sha512', $request->getContent(), $secretKey);
    $receivedSig = $request->header('X-Paystack-Signature', '');

    if (! hash_equals($computedSig, $receivedSig)) {
        \Illuminate\Support\Facades\Log::warning('Paystack webhook: invalid signature', [
            'ip' => $request->ip(),
        ]);
        return response('Unauthorized', 401);
    }

    // ── 2. Parse event ─────────────────────────────────────────────
    $event = $request->json('event');
    $data  = $request->json('data', []);

    \Illuminate\Support\Facades\Log::info('Paystack webhook received', ['event' => $event]);

    // ── 3. Dispatch async job for charge.success ───────────────────
    if ($event === 'charge.success') {
        \App\Jobs\ProcessChargeSuccessJob::dispatch($data);
    }

    // Always return 200 quickly — Paystack retries if we don't.
    return response()->json(['status' => 'ok']);
});
