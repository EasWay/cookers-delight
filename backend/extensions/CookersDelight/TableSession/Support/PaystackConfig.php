<?php

namespace CookersDelight\TableSession\Support;

use CookersDelight\TableSession\Models\CdSetting;

class PaystackConfig
{
    public static function secretKey(): string
    {
        return CdSetting::getValue('paystack_secret_key')
            ?: config('services.paystack.secret_key', '');
    }

    public static function publicKey(): string
    {
        return CdSetting::getValue('paystack_public_key')
            ?: config('services.paystack.public_key', '');
    }

    public static function webhookSecret(): string
    {
        return CdSetting::getValue('paystack_webhook_secret')
            ?: config('services.paystack.webhook_secret', '');
    }
}
