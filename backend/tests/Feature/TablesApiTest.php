<?php

namespace Tests\Feature;

use CookersDelight\TableSession\Models\DiningTable;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class TablesApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_get_admin_tables_returns_200(): void
    {
        $response = $this->getJson('/api/admin/tables');
        $response->assertStatus(200)->assertJsonStructure(['data']);
    }

    public function test_post_admin_tables_creates_row_in_database(): void
    {
        $locationId = \DB::table('locations')->insertGetId([
            'location_name'   => 'Kaneshie',
            'location_status' => 1,
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);

        $response = $this->postJson('/api/admin/tables', [
            'location_id'  => $locationId,
            'table_number' => 1,
            'capacity'     => 4,
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('cd_dining_tables', [
            'location_id'  => $locationId,
            'table_number' => '1',
        ]);
    }

    public function test_admin_tables_does_not_use_json_file(): void
    {
        $jsonPath = storage_path('app/cd-tables.json');
        if (file_exists($jsonPath)) {
            unlink($jsonPath);
        }

        $response = $this->getJson('/api/admin/tables');
        $response->assertStatus(200);
    }

    public function test_qr_scan_creates_session_in_database(): void
    {
        $locationId = \DB::table('locations')->insertGetId([
            'location_name'   => 'Kaneshie',
            'location_status' => 1,
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);

        $table = DiningTable::create([
            'location_id'  => $locationId,
            'table_number' => '5',
            'capacity'     => 4,
            'is_active'    => true,
        ]);

        $response = $this->postJson("/api/table-sessions/by-table/{$table->stable_token}");

        $response->assertStatus(200)
                 ->assertJsonStructure(['session_token', 'table_number', 'location_id']);

        $this->assertDatabaseHas('cd_table_sessions', [
            'table_id' => $table->id,
        ]);
    }

    public function test_get_table_session_resolves_from_database(): void
    {
        $locationId = \DB::table('locations')->insertGetId([
            'location_name'   => 'Kaneshie',
            'location_status' => 1,
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);

        $table = DiningTable::create([
            'location_id'  => $locationId,
            'table_number' => '3',
            'capacity'     => 4,
            'is_active'    => true,
        ]);

        $session = $table->createSession();

        $response = $this->getJson("/api/table-sessions/{$session->token}");

        $response->assertStatus(200)
                 ->assertJsonFragment(['table_number' => '3']);
    }
}
