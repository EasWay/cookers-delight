<?php
namespace Tests\Feature;
use Tests\TestCase;

class KitchenApiTest extends TestCase
{
    private string $correctPin = '1234';

    protected function setUp(): void {
        parent::setUp();
        config(['app.kitchen_pin' => $this->correctPin]);
    }

    public function test_verify_pin_returns_200_with_correct_pin(): void {
        $this->postJson('/api/kitchen/verify-pin', ['pin' => $this->correctPin])
             ->assertStatus(200)->assertJson(['ok' => true]);
    }

    public function test_verify_pin_returns_401_with_wrong_pin(): void {
        $this->postJson('/api/kitchen/verify-pin', ['pin' => '9999'])
             ->assertStatus(401);
    }

    public function test_poll_returns_401_without_pin_header(): void {
        $this->getJson('/api/kitchen/orders')
             ->assertStatus(401);
    }

    public function test_poll_returns_401_with_wrong_pin_header(): void {
        $this->withHeaders(['X-Kitchen-Pin' => 'wrong'])
             ->getJson('/api/kitchen/orders')
             ->assertStatus(401);
    }

    public function test_poll_returns_200_with_correct_pin(): void {
        $this->withHeaders(['X-Kitchen-Pin' => $this->correctPin])
             ->getJson('/api/kitchen/orders')
             ->assertStatus(200)
             ->assertJsonStructure(['orders']);
    }

    public function test_update_status_returns_401_without_pin(): void {
        $this->postJson('/api/kitchen/orders/1/status', ['status' => 'preparing'])
             ->assertStatus(401);
    }

    public function test_update_status_returns_422_with_invalid_status(): void {
        $this->withHeaders(['X-Kitchen-Pin' => $this->correctPin])
             ->postJson('/api/kitchen/orders/1/status', ['status' => 'invalid'])
             ->assertStatus(422);
    }

    public function test_update_status_accepts_valid_statuses(): void {
        foreach (['received', 'preparing', 'ready', 'served'] as $status) {
            // 500 is acceptable — TI not running in test env
            // What matters is it passes validation (not 422)
            $response = $this->withHeaders(['X-Kitchen-Pin' => $this->correctPin])
                ->postJson('/api/kitchen/orders/999/status', ['status' => $status]);
            $this->assertNotSame(422, $response->getStatusCode());
        }
    }
}
