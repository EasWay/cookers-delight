<?php

namespace Tests\Feature;

use Tests\TestCase;

class PaystackWebhookRoutesTest extends TestCase
{
    public function test_extension_webhook_route_no_longer_exists(): void
    {
        // This route was removed from Extension.php — must return 404
        $response = $this->postJson('/api/v1/cd/webhooks/v1/paystack', []);
        $response->assertStatus(404);
    }

    public function test_backend_api_webhook_route_still_exists(): void
    {
        // This handler stays for Phase 2a direct checkout
        // Invalid signature → 401, but the route exists (not 404)
        $response = $this->postJson('/api/paystack/webhook', []);
        $response->assertStatus(401);
    }

    public function test_backend_webhook_rejects_invalid_signature(): void
    {
        $response = $this->withHeaders([
            'X-Paystack-Signature' => 'invalidsignature',
        ])->postJson('/api/paystack/webhook', ['event' => 'charge.success']);

        $response->assertStatus(401);
    }
}
