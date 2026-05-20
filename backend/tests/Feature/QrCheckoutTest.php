<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class QrCheckoutTest extends TestCase
{
    use RefreshDatabase;

    // ── Helpers ─────────────────────────────────────────────────────────────

    private function seedSession(array $overrides = []): array
    {
        $locationId = DB::table('locations')->insertGetId([
            'location_name'   => 'Test Location',
            'location_status' => 1,
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);

        $tableId = DB::table('cd_dining_tables')->insertGetId([
            'location_id'  => $locationId,
            'table_number' => 'T1',
            'stable_token' => 'stable-abc-123',
            'capacity'     => 4,
            'is_active'    => 1,
            'created_at'   => now(),
            'updated_at'   => now(),
        ]);

        $token     = 'sess-token-' . uniqid();
        $expiresAt = $overrides['expires_at'] ?? now()->addHours(4);

        DB::table('cd_table_sessions')->insert([
            'table_id'   => $tableId,
            'token'      => $token,
            'expires_at' => $expiresAt,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return compact('token', 'locationId', 'tableId');
    }

    private function validPayload(string $token): array
    {
        return [
            'session_token'     => $token,
            'cart'              => [['id' => 1, 'quantity' => 2]],
            'customer_name'     => 'Kwame Mensah',
            'receipt_channel'   => 'whatsapp',
            'customer_whatsapp' => '0241234567',
        ];
    }

    // ── POST /api/qr-checkout ────────────────────────────────────────────────

    public function test_pay_returns_422_without_session_token(): void
    {
        $response = $this->postJson('/api/qr-checkout', [
            'cart'          => [['id' => 1, 'quantity' => 1]],
            'customer_name' => 'Kwame Mensah',
        ]);

        $response->assertStatus(422)
                 ->assertJsonPath('error', 'Invalid request.')
                 ->assertJsonStructure(['fields' => ['session_token']]);
    }

    public function test_pay_returns_403_when_session_not_found(): void
    {
        Cache::put('ti_menu_1', [['menus' => [['menu_id' => 1, 'menu_price' => '15.00']]]]);

        $response = $this->postJson('/api/qr-checkout', [
            'session_token' => 'no-such-token',
            'cart'          => [['id' => 1, 'quantity' => 1]],
            'customer_name' => 'Kwame Mensah',
        ]);

        $response->assertStatus(403)
                 ->assertJsonPath('error', 'Session expired. Please re-scan your QR code.');
    }

    public function test_pay_returns_403_when_session_expired(): void
    {
        $data = $this->seedSession(['expires_at' => now()->subMinute()]);

        Cache::put("ti_menu_{$data['locationId']}", [['menus' => [['menu_id' => 1, 'menu_price' => '15.00']]]]);

        $response = $this->postJson('/api/qr-checkout', $this->validPayload($data['token']));

        $response->assertStatus(403)
                 ->assertJsonPath('error', 'Session expired. Please re-scan your QR code.');
    }

    public function test_pay_returns_409_when_item_not_in_menu(): void
    {
        $data = $this->seedSession();

        // Only item 1 is in the menu cache; cart requests item 999
        Cache::put("ti_menu_{$data['locationId']}", [['menus' => [['menu_id' => 1, 'menu_price' => '15.00']]]]);

        Http::fake(['api.paystack.co/*' => Http::response([], 200)]);

        $response = $this->postJson('/api/qr-checkout', [
            'session_token' => $data['token'],
            'cart'          => [['id' => 999, 'quantity' => 1]],
            'customer_name' => 'Kwame Mensah',
        ]);

        $response->assertStatus(409)
                 ->assertJsonPath('error', 'One or more items are no longer available. Please refresh the menu.');
    }

    public function test_pay_ignores_client_prices(): void
    {
        $data = $this->seedSession();

        // Server-side price for item 42 is GHS 25.00
        Cache::put("ti_menu_{$data['locationId']}", [['menus' => [['menu_id' => 42, 'menu_price' => '25.00']]]]);

        Http::fake([
            'api.paystack.co/transaction/initialize' => Http::response([
                'status' => true,
                'data'   => ['authorization_url' => 'https://paystack.com/pay/test123'],
            ], 200),
        ]);

        $response = $this->postJson('/api/qr-checkout', [
            'session_token' => $data['token'],
            'cart'          => [['id' => 42, 'quantity' => 2]],
            'customer_name' => 'Ama Owusu',
        ]);

        $response->assertStatus(200)
                 ->assertJsonStructure(['redirect_url', 'reference']);

        // 25.00 × 2 × 100 = 5000 kobo — client cannot inflate the price
        Http::assertSent(function ($request) {
            return str_contains($request->url(), 'paystack.co/transaction/initialize')
                && $request->data()['amount'] === 5000;
        });
    }

    // ── GET /api/qr-checkout/callback ────────────────────────────────────────

    public function test_callback_redirects_to_qr_app_tracking_page(): void
    {
        $reference = 'CD-' . time() . '-abcd1234';

        Cache::put("cd_dine_in_pending_{$reference}", [
            'cart'              => [['id' => 1, 'price' => 15.00, 'quantity' => 1]],
            'session_token'     => 'sess-token-test',
            'stable_token'      => 'stable-abc-123',
            'table_number'      => 'T1',
            'location_id'       => 1,
            'customer_name'     => 'Kwame Mensah',
            'customer_email'    => '',
            'customer_whatsapp' => '0241234567',
            'receipt_channel'   => 'whatsapp',
            'order_type'        => 'dine-in',
        ], now()->addHours(2));

        Http::fake([
            "api.paystack.co/transaction/verify/{$reference}" => Http::response([
                'status' => true,
                'data'   => ['status' => 'success', 'amount' => 1500],
            ], 200),
        ]);

        $response = $this->get("/api/qr-checkout/callback?reference={$reference}");

        $response->assertRedirect(
            "http://localhost:5174/table/stable-abc-123/track?ref={$reference}"
        );
    }

    public function test_callback_is_idempotent(): void
    {
        $reference = 'CD-' . time() . '-idem5678';

        $locationId = DB::table('locations')->insertGetId([
            'location_name'   => 'Test',
            'location_status' => 1,
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);

        DB::table('statuses')->insert([
            'status_name' => 'Received',
            'status_for'  => 'order',
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);

        $pending = [
            'cart'              => [['id' => 1, 'price' => 15.00, 'quantity' => 1]],
            'session_token'     => 'sess-idem',
            'stable_token'      => 'stable-idem',
            'table_number'      => 'T2',
            'location_id'       => $locationId,
            'customer_name'     => 'Test Customer',
            'customer_email'    => 'test@example.com',
            'customer_whatsapp' => '',
            'receipt_channel'   => 'email',
            'order_type'        => 'dine-in',
        ];

        Cache::put("cd_dine_in_pending_{$reference}", $pending, now()->addHours(2));

        Http::fake([
            "api.paystack.co/transaction/verify/{$reference}" => Http::response([
                'status' => true,
                'data'   => ['status' => 'success', 'amount' => 1500],
            ], 200),
        ]);

        // Call callback twice
        $this->get("/api/qr-checkout/callback?reference={$reference}");
        $this->get("/api/qr-checkout/callback?reference={$reference}");

        $this->assertDatabaseCount('orders', 1);
    }

    public function test_callback_with_missing_cache_redirects_to_qr_root(): void
    {
        $response = $this->get('/api/qr-checkout/callback?reference=CD-unknown-ref');

        $response->assertRedirect('http://localhost:5174');
    }
}
