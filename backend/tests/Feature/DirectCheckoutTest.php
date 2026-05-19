<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class DirectCheckoutTest extends TestCase
{
    use RefreshDatabase;

    // ── POST /api/checkout ──────────────────────────────────────────────────

    public function test_post_checkout_returns_422_with_empty_cart(): void
    {
        $response = $this->postJson('/api/checkout', [
            'cart'           => [],
            'customer_name'  => 'Kofi Mensah',
            'customer_email' => 'kofi@example.com',
            'customer_phone' => '0201234567',
        ]);

        $response->assertStatus(422)
                 ->assertJsonPath('error', 'Invalid request.')
                 ->assertJsonStructure(['fields' => ['cart']]);
    }

    public function test_post_checkout_returns_409_when_item_not_in_menu(): void
    {
        // Seed menu cache with item 1 only
        Cache::put('ti_menu_1', [['menu_id' => 1, 'menu_price' => '15.00']]);

        Http::fake([
            'api.paystack.co/*' => Http::response(['status' => true], 200),
        ]);

        $response = $this->postJson('/api/checkout', [
            'cart'           => [['id' => 999, 'quantity' => 1]], // item 999 not in menu
            'customer_name'  => 'Kofi Mensah',
            'customer_email' => 'kofi@example.com',
            'customer_phone' => '0201234567',
        ]);

        $response->assertStatus(409)
                 ->assertJsonPath('error', 'One or more items are no longer available. Please refresh the menu.');
    }

    public function test_post_checkout_ignores_client_prices(): void
    {
        // Server-side price for item 42 is GHS 25.00
        Cache::put('ti_menu_1', [['menu_id' => 42, 'menu_price' => '25.00']]);

        Http::fake([
            'api.paystack.co/transaction/initialize' => Http::response([
                'status' => true,
                'data'   => ['authorization_url' => 'https://paystack.com/pay/test123'],
            ], 200),
        ]);

        $response = $this->postJson('/api/checkout', [
            'cart'           => [['id' => 42, 'quantity' => 2]],
            'customer_name'  => 'Ama Owusu',
            'customer_email' => 'ama@example.com',
            'customer_phone' => '0271234567',
        ]);

        $response->assertStatus(200)
                 ->assertJsonStructure(['redirect_url', 'reference']);

        // Verify Paystack was called with server-priced amount (25.00 × 2 × 100 = 5000 kobo)
        Http::assertSent(function ($request) {
            return str_contains($request->url(), 'paystack.co/transaction/initialize')
                && $request->data()['amount'] === 5000;
        });
    }

    // ── GET /api/checkout/callback ──────────────────────────────────────────

    public function test_callback_redirects_to_tracking_page(): void
    {
        $reference = 'CD-' . time() . '-abcd1234';

        Cache::put("cd_collection_pending_{$reference}", [
            'cart'              => [['id' => 1, 'price' => 15.00, 'quantity' => 1]],
            'location_id'       => 1,
            'customer_name'     => 'Kofi Mensah',
            'customer_email'    => 'kofi@example.com',
            'customer_phone'    => '0201234567',
            'receipt_channel'   => 'whatsapp',
            'customer_whatsapp' => '',
            'order_type'        => 'collection',
        ], now()->addHours(2));

        Http::fake([
            "api.paystack.co/transaction/verify/{$reference}" => Http::response([
                'status' => true,
                'data'   => ['status' => 'success', 'amount' => 1500],
            ], 200),
        ]);

        $response = $this->get("/api/checkout/callback?reference={$reference}");

        $response->assertRedirect("http://localhost:5173/order/{$reference}/track");
    }

    public function test_callback_with_invalid_reference_redirects_to_frontend(): void
    {
        // Empty reference — no /order/... segment
        $response = $this->get('/api/checkout/callback');

        $response->assertRedirect('http://localhost:5173');
    }

    // ── GET /api/orders/{reference}/status ──────────────────────────────────

    public function test_status_returns_pending_when_order_not_yet_created(): void
    {
        $response = $this->getJson('/api/orders/CD-nonexistent-ref/status');

        $response->assertStatus(200)
                 ->assertJsonPath('status', 'pending')
                 ->assertJsonPath('terminal', false)
                 ->assertJsonPath('first_item_name', null);
    }

    public function test_status_maps_received_correctly(): void
    {
        $locationId = \DB::table('locations')->insertGetId([
            'location_name'   => 'Kaneshie',
            'location_status' => 1,
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);

        $statusId = \DB::table('statuses')->insertGetId([
            'status_name' => 'Received',
            'status_for'  => 'order',
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);

        $reference = 'CD-' . time() . '-test1';

        \DB::table('orders')->insert([
            'location_id'   => $locationId,
            'status_id'     => $statusId,
            'hash'          => $reference,
            'order_total'   => 25.00,
            'processed'     => 1,
            'date_added'    => now(),
            'date_modified' => now(),
        ]);

        $response = $this->getJson("/api/orders/{$reference}/status");

        $response->assertStatus(200)
                 ->assertJsonPath('status', 'received')
                 ->assertJsonPath('status_label', 'Order received')
                 ->assertJsonPath('terminal', false);
    }

    public function test_status_marks_cancelled_as_terminal(): void
    {
        $locationId = \DB::table('locations')->insertGetId([
            'location_name'   => 'Kaneshie',
            'location_status' => 1,
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);

        $statusId = \DB::table('statuses')->insertGetId([
            'status_name' => 'Cancelled',
            'status_for'  => 'order',
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);

        $reference = 'CD-' . time() . '-test2';

        \DB::table('orders')->insert([
            'location_id'   => $locationId,
            'status_id'     => $statusId,
            'hash'          => $reference,
            'order_total'   => 25.00,
            'processed'     => 1,
            'date_added'    => now(),
            'date_modified' => now(),
        ]);

        $response = $this->getJson("/api/orders/{$reference}/status");

        $response->assertStatus(200)
                 ->assertJsonPath('status', 'cancelled')
                 ->assertJsonPath('status_label', 'Order cancelled')
                 ->assertJsonPath('terminal', true);
    }
}
