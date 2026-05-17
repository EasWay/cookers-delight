<?php

use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\MenuController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
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

// Order status tracking page (unchanged)
Route::get('/orders/{orderId}/status', [\App\Http\Controllers\OrderStatusController::class, 'show'])->name('order.status');
