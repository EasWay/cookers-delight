<?php

namespace Tests\Feature;

use CookersDelight\TableSession\Models\CdSetting;
use CookersDelight\TableSession\Support\PaystackConfig;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CdSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_get_settings_returns_200(): void
    {
        $response = $this->getJson('/api/cd/settings');
        $response->assertStatus(200)->assertJsonStructure(['data']);
    }

    public function test_put_single_key_persists_to_database(): void
    {
        $this->putJson('/api/cd/settings/restaurant_name', ['value' => 'Test Name'])
             ->assertStatus(200);

        $this->assertSame('Test Name', CdSetting::getValue('restaurant_name'));
    }

    public function test_put_many_keys_persists_all(): void
    {
        $this->putJson('/api/cd/settings', [
            'settings' => ['currency_code' => 'GHS', 'currency_symbol' => '₵'],
        ])->assertStatus(200);

        $this->assertSame('GHS', CdSetting::getValue('currency_code'));
        $this->assertSame('₵',   CdSetting::getValue('currency_symbol'));
    }

    public function test_secret_key_is_masked_on_get(): void
    {
        CdSetting::setValue('paystack_secret_key', 'sk_live_realvalue');

        $response = $this->getJson('/api/cd/settings');
        $data = $response->json('data');

        $this->assertNotSame('sk_live_realvalue', $data['paystack_secret_key'] ?? '');
        $this->assertSame('••••••••', $data['paystack_secret_key']);
    }

    public function test_saving_paystack_secret_key_is_used_by_paystack_config(): void
    {
        CdSetting::setValue('paystack_secret_key', 'sk_from_db');

        $this->assertSame('sk_from_db', PaystackConfig::secretKey());
    }

    public function test_paystack_config_falls_back_to_env_when_db_is_empty(): void
    {
        CdSetting::where('key', 'paystack_secret_key')->delete();
        config(['services.paystack.secret_key' => 'sk_from_env']);

        $this->assertSame('sk_from_env', PaystackConfig::secretKey());
    }
}
