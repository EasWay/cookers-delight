<?php

namespace Tests\Feature;

use Tests\TestCase;

class PaystackWebhookRouteTest extends TestCase
{
    public function test_paystack_webhook_route_exists(): void
    {
        $response = $this->post('/PayStack/webhook', []);
        $response->assertStatus(401);
    }

    public function test_paystack_callback_route_exists(): void
    {
        $response = $this->get('/paystack/callback');
        $this->assertNotSame(404, $response->getStatusCode());
    }

    public function test_app_url_is_not_ngrok_in_production(): void
    {
        if (!app()->isProduction()) {
            $this->markTestSkipped('Only meaningful in production environment.');
        }

        $url = config('app.url', '');
        $this->assertStringNotContainsStringIgnoringCase(
            'ngrok',
            $url,
            'APP_URL contains "ngrok" — update APP_URL and the Paystack webhook URL before processing live payments.'
        );
    }
}
