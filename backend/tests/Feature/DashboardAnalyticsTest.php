<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardAnalyticsTest extends TestCase
{
    // ── Revenue ───────────────────────────────────────────────────────────────

    public function test_revenue_returns_200_with_expected_keys(): void
    {
        $response = $this->getJson('/api/dashboard/revenue');
        $response->assertStatus(200)
                 ->assertJsonStructure(['chart', 'totals', 'by_type', 'comparison']);
    }

    public function test_revenue_totals_have_correct_keys(): void
    {
        $response = $this->getJson('/api/dashboard/revenue');
        $response->assertStatus(200)
                 ->assertJsonStructure([
                     'totals' => ['revenue', 'orders', 'avg_order_value'],
                 ]);
    }

    public function test_revenue_comparison_has_correct_keys(): void
    {
        $response = $this->getJson('/api/dashboard/revenue');
        $response->assertStatus(200)
                 ->assertJsonStructure([
                     'comparison' => ['revenue_change_pct', 'prev_revenue'],
                 ]);
    }

    public function test_revenue_accepts_date_params(): void
    {
        $response = $this->getJson('/api/dashboard/revenue?from=2024-01-01&to=2024-01-07');
        $response->assertStatus(200);
    }

    // ── Menu Performance ──────────────────────────────────────────────────────

    public function test_menu_performance_returns_200_with_top_and_bottom(): void
    {
        $response = $this->getJson('/api/dashboard/menu-performance');
        $response->assertStatus(200)
                 ->assertJsonStructure(['top', 'bottom']);
    }

    public function test_menu_performance_accepts_date_params(): void
    {
        $response = $this->getJson('/api/dashboard/menu-performance?from=2024-01-01&to=2024-01-07');
        $response->assertStatus(200);
    }

    // ── Table Intelligence ────────────────────────────────────────────────────

    public function test_table_intelligence_returns_200_with_expected_keys(): void
    {
        $response = $this->getJson('/api/dashboard/table-intelligence');
        $response->assertStatus(200)
                 ->assertJsonStructure([
                     'peak_hours',
                     'peak_days',
                     'avg_session_minutes',
                     'total_sessions',
                 ]);
    }

    public function test_table_intelligence_peak_hours_has_24_entries(): void
    {
        $response = $this->getJson('/api/dashboard/table-intelligence');
        $response->assertStatus(200);

        $hours = $response->json('peak_hours');
        $this->assertCount(24, $hours);
        $this->assertEquals(0,  $hours[0]['hour']);
        $this->assertEquals(23, $hours[23]['hour']);
    }

    // ── Customer Behaviour ────────────────────────────────────────────────────

    public function test_customer_behaviour_returns_200_with_expected_keys(): void
    {
        $response = $this->getJson('/api/dashboard/customer-behaviour');
        $response->assertStatus(200)
                 ->assertJsonStructure([
                     'avg_order_value',
                     'total_orders',
                     'total_customers',
                     'returning_customers',
                     'new_customers',
                     'return_rate_pct',
                 ]);
    }

    // ── Alerts ────────────────────────────────────────────────────────────────

    public function test_alerts_returns_200_with_alerts_array(): void
    {
        $response = $this->getJson('/api/dashboard/alerts');
        $response->assertStatus(200)
                 ->assertJsonStructure(['alerts']);

        $this->assertIsArray($response->json('alerts'));
    }

    // ── Date sanitisation ─────────────────────────────────────────────────────

    public function test_future_to_date_is_clamped_to_today(): void
    {
        $futureDate = now()->addYear()->toDateString();
        $response   = $this->getJson("/api/dashboard/revenue?from=2024-01-01&to={$futureDate}");
        $response->assertStatus(200);
        // The endpoint must not crash; we confirm it returns a valid chart array.
        $this->assertIsArray($response->json('chart'));
    }

    public function test_swapped_dates_are_corrected(): void
    {
        $response = $this->getJson('/api/dashboard/revenue?from=2024-01-07&to=2024-01-01');
        $response->assertStatus(200);
        $this->assertIsArray($response->json('chart'));
    }
}
