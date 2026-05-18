<?php

namespace Tests\Feature;

use Tests\TestCase;

class DashboardStatsTest extends TestCase
{
    public function test_stats_endpoint_returns_200(): void
    {
        $response = $this->getJson('/api/dashboard/stats');
        $response->assertStatus(200);
    }

    public function test_stats_response_has_correct_keys(): void
    {
        $response = $this->getJson('/api/dashboard/stats');

        $response->assertJsonStructure([
            'orders_today',
            'revenue_today',
            'tables_occupied',
            'pending_orders',
        ]);
    }

    public function test_stats_response_does_not_contain_old_stub_keys(): void
    {
        $response = $this->getJson('/api/dashboard/stats');
        $data = $response->json();

        $this->assertArrayNotHasKey('pending_reservations', $data);
        $this->assertArrayNotHasKey('active_menu_items', $data);
    }

    public function test_all_stat_values_are_numeric(): void
    {
        $response = $this->getJson('/api/dashboard/stats');
        $data = $response->json();

        $this->assertIsNumeric($data['orders_today']);
        $this->assertIsNumeric($data['revenue_today']);
        $this->assertIsNumeric($data['tables_occupied']);
        $this->assertIsNumeric($data['pending_orders']);
    }
}
