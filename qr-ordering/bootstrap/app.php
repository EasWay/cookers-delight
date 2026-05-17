<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Paystack sends server-to-server webhooks — no browser session, no CSRF token.
        $middleware->validateCsrfTokens(except: [
            '/PayStack/webhook',
            '/paystack/webhook',   // lowercase variant as safety net
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
