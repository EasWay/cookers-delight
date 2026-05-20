<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'mailgun' => [
        'domain' => env('MAILGUN_DOMAIN'),
        'secret' => env('MAILGUN_SECRET'),
        'endpoint' => env('MAILGUN_ENDPOINT', 'api.mailgun.net'),
        'scheme' => 'https',
    ],

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'paystack' => [
        'public_key'      => env('PAYSTACK_PUBLIC_KEY'),
        'secret_key'      => env('PAYSTACK_SECRET_KEY'),
        'webhook_secret'  => env('PAYSTACK_WEBHOOK_SECRET'),
        'currency'        => 'GHS',
        'reference_prefix'=> 'CD',
        'frontend_url'    => env('APP_FRONTEND_URL', 'http://localhost:5173'),
        'qr_app_url'      => env('QR_APP_URL', 'http://localhost:5174'),
    ],

];
