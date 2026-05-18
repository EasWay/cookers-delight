<?php

namespace Tests\Feature;

use CookersDelight\TableSession\Models\CdAnnouncement;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AnnouncementsTest extends TestCase
{
    use RefreshDatabase;

    public function test_get_announcements_returns_200_with_data_key(): void
    {
        $this->getJson('/api/announcements')
             ->assertStatus(200)
             ->assertJsonStructure(['data']);
    }

    public function test_get_active_returns_only_active_announcements(): void
    {
        CdAnnouncement::create(['title' => 'Visible', 'status' => 1]);
        CdAnnouncement::create(['title' => 'Hidden',  'status' => 0]);

        $data = $this->getJson('/api/announcements?active=true')
                     ->assertStatus(200)
                     ->json('data');

        $this->assertCount(1, $data);
        $this->assertSame('Visible', $data[0]['title']);
    }

    public function test_active_filter_respects_date_window(): void
    {
        CdAnnouncement::create([
            'title'      => 'Future',
            'status'     => 1,
            'start_date' => now()->addDays(5)->toDateString(),
        ]);

        $data = $this->getJson('/api/announcements?active=true')->json('data');
        $this->assertCount(0, $data);
    }

    public function test_response_includes_both_title_and_message_alias(): void
    {
        CdAnnouncement::create(['title' => 'Grand opening', 'status' => 1]);

        $item = $this->getJson('/api/announcements?active=true')->json('data.0');

        $this->assertSame('Grand opening', $item['title']);
        $this->assertSame('Grand opening', $item['message']);
        $this->assertTrue($item['is_active']);
    }

    public function test_post_announcement_persists_to_database(): void
    {
        $this->postJson('/api/announcements', [
            'title'  => 'Kitchen closed Monday',
            'status' => 1,
        ])->assertStatus(201);

        $this->assertDatabaseHas('cd_announcements', [
            'title' => 'Kitchen closed Monday',
        ]);
    }

    public function test_put_announcement_updates_record(): void
    {
        $a = CdAnnouncement::create(['title' => 'Old title', 'status' => 1]);

        $this->putJson("/api/announcements/{$a->id}", ['title' => 'New title'])
             ->assertStatus(200)
             ->assertJsonPath('data.title', 'New title');

        $this->assertDatabaseHas('cd_announcements', ['title' => 'New title']);
    }

    public function test_delete_announcement_removes_record(): void
    {
        $a = CdAnnouncement::create(['title' => 'To delete', 'status' => 1]);

        $this->deleteJson("/api/announcements/{$a->id}")->assertStatus(204);

        $this->assertDatabaseMissing('cd_announcements', ['id' => $a->id]);
    }
}
