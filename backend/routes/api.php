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

use CookersDelight\TableSession\Http\Controllers\AdminTablesApiController;
use CookersDelight\TableSession\Http\Controllers\TableSessionController;
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

// ── Admin table management ────────────────────────────────────────────────
Route::get('/admin/tables',               [AdminTablesApiController::class, 'index']);
Route::post('/admin/tables',              [AdminTablesApiController::class, 'store']);
Route::delete('/admin/tables/{id}',       [AdminTablesApiController::class, 'destroy']);
Route::get('/admin/tables/{id}/qr-print', [AdminTablesApiController::class, 'qrPrintUrl']);

// ── QR session flow (called by qr-ordering app) ───────────────────────────
// NOTE: These non-versioned routes mirror /api/v1/table-sessions/* registered
// in Extension.php. Both exist because qr-ordering calls /api/table-sessions/*
// (without /v1/) via TastyIgniterOrderService.
// by-table must be registered before /{token} to prevent "by-table" from
// being captured as a token value.
Route::post('/table-sessions/by-table/{stableToken}', [TableSessionController::class, 'resolveByStableToken']);
Route::get('/table-sessions/{token}',                 [TableSessionController::class, 'show']);
Route::post('/table-sessions/{token}/order',          [TableSessionController::class, 'placeOrder']);


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
