<?php

namespace App\Providers;

use App\Menu\TastyIgniterMenuDriver;
use App\Payment\PaystackDriver;
use App\Services\TastyIgniterOrderService;
use Illuminate\Support\ServiceProvider;
use Revolution\Ordering\Facades\Menu;
use Revolution\Ordering\Facades\Payment;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(TastyIgniterOrderService::class);
    }

    public function boot(): void
    {
        // Register the TastyIgniter menu driver with kawax.
        Menu::extend('tastyigniter', function ($app) {
            return $app->make(TastyIgniterMenuDriver::class);
        });

        // Register the Paystack payment driver with kawax.
        Payment::extend('paystack', function ($app) {
            return $app->make(PaystackDriver::class);
        });

        $this->warnIfDevUrl();
    }

    private function warnIfDevUrl(): void
    {
        if (!app()->isProduction()) {
            return;
        }

        $url = config('app.url', '');
        $devPatterns = ['ngrok', 'localhost', '127.0.0.1', '.local', 'tunnel'];

        foreach ($devPatterns as $pattern) {
            if (str_contains(strtolower($url), $pattern)) {
                \Illuminate\Support\Facades\Log::critical(
                    'PAYSTACK WEBHOOK RISK: APP_URL appears to be a dev/tunnel URL in production.',
                    [
                        'app_url'      => $url,
                        'action'       => 'Update APP_URL and the Paystack webhook URL in your Paystack dashboard.',
                        'webhook_path' => '/PayStack/webhook',
                    ]
                );
                return;
            }
        }
    }
}
