<?php

use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\MenuController;
use App\Http\Controllers\PaystackWebhookController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/debug-menu', function () {
    \Illuminate\Support\Facades\Cache::forget('ti_menu_1');
    $http = \Illuminate\Support\Facades\Http::baseUrl(config('tastyigniter.api_url'))
        ->withToken(config('tastyigniter.api_token'))
        ->acceptJson();
    $result = $http->get('/categories', ['location' => 1, 'include' => 'menus'])->json();
    $includedCount = count($result['included'] ?? []);
    $catCount      = count($result['data'] ?? []);
    $firstCatRels  = $result['data'][0]['relationships'] ?? 'NO RELATIONSHIPS KEY';
    return response()->json([
        'category_count'   => $catCount,
        'included_count'   => $includedCount,
        'first_cat_rels'   => $firstCatRels,
        'first_included'   => $result['included'][0] ?? 'NONE',
    ]);
});


/**
 * Stable-token QR entry point — the URL encoded on physical QR cards.
 *
 * The stable_token never expires. On scan, TI creates a fresh 4-hour session
 * and returns the ephemeral session_token for this visit. We then redirect to
 * our custom menu page (not the kawax menus route).
 */
Route::get('/table/{stableToken}', function (string $stableToken) {
    $response = \Illuminate\Support\Facades\Http::baseUrl(config('tastyigniter.api_url'))
        ->withToken(config('tastyigniter.api_token'))
        ->post("/table-sessions/by-table/{$stableToken}");

    if ($response->failed()) {
        abort(404, 'Table not found or inactive. Please ask a member of staff for help.');
    }

    $session = $response->json();

    session([
        'cd_session_token' => $session['session_token'],
        'cd_table_number'  => $session['table_number'],
        'cd_location_id'   => $session['location_id'],
        'cd_location_name' => $session['location_name'],
    ]);

    return redirect()->route('menu');
})->name('table.entry');

// Legacy QR entry (old session-token-based URL, kept for any printed cards still in use).
// Redirects to the custom menu; the session guard handles missing sessions gracefully.
Route::get('/qr/{token}', function () {
    return redirect()->route('menu');
})->name('qr.entry');

// ── Custom menu SPA ───────────────────────────────────────────────────────────
Route::get('/menu', [MenuController::class, 'index'])->name('menu');

// ── Checkout — JSON API called by Alpine fetch() ──────────────────────────────
Route::post('/checkout/pay', [CheckoutController::class, 'pay'])
    ->name('checkout.pay')
    ->middleware('throttle:10,1');

// Paystack callback (must be GET — unchanged)
Route::get('/paystack/callback', [\App\Payment\PaystackDriver::class, 'callback'])->name('paystack.callback');

// Paystack webhook — server-to-server POST, CSRF exempt (see bootstrap/app.php).
// URL must match EXACTLY what is configured in the Paystack dashboard (case-sensitive).
Route::post('/PayStack/webhook', [PaystackWebhookController::class, 'handle'])->name('paystack.webhook');

// Order status tracking page
Route::get('/orders/{orderId}/status', [\App\Http\Controllers\OrderStatusController::class, 'show'])->name('order.status');

// Order status poll — lightweight JSON endpoint polled every 4 s by the browser.
// Replaces the old SSE stream so no long-running connection blocks the PHP worker.
Route::get('/orders/{orderId}/poll', [\App\Http\Controllers\OrderStatusController::class, 'poll'])->name('order.poll');

// Kitchen display (PIN-protected)
Route::get('/kitchen', [\App\Http\Controllers\KitchenController::class, 'index'])->name('kitchen');
Route::post('/kitchen/login', [\App\Http\Controllers\KitchenController::class, 'login'])->name('kitchen.login');
Route::post('/kitchen/logout', [\App\Http\Controllers\KitchenController::class, 'logout'])->name('kitchen.logout');
Route::post('/kitchen/orders/{orderId}/status', [\App\Http\Controllers\KitchenController::class, 'updateStatus'])->name('kitchen.update-status');
Route::get('/kitchen/orders/poll', [\App\Http\Controllers\KitchenController::class, 'poll'])->name('kitchen.poll');
Route::get('/kitchen/orders/debug', [\App\Http\Controllers\KitchenController::class, 'debugPoll'])->name('kitchen.debug');
