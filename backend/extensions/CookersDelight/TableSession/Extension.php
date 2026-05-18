<?php

namespace CookersDelight\TableSession;

use Igniter\System\Classes\BaseExtension;
use Illuminate\Routing\Router;
use Illuminate\Support\Facades\Route;

class Extension extends BaseExtension
{
    public array $require = ['Igniter.Cart', 'Igniter.Api'];

    public function boot(): void
    {
        $this->registerMiddleware();
        $this->registerApiRoutes();
        $this->registerAdminRoutes();
        $this->registerSseRoute();
        // registerWebhookRoutes() removed — see routes/api.php for the
        // backend webhook handler and qr-ordering for the active dine-in handler
    }

    // -----------------------------------------------------------------------
    // Middleware registration
    // -----------------------------------------------------------------------

    protected function registerMiddleware(): void
    {
        /** @var Router $router */
        $router = app(Router::class);
        $router->aliasMiddleware(
            'admin.api',
            \CookersDelight\TableSession\Http\Middleware\AdminApiAuth::class
        );
    }

    // -----------------------------------------------------------------------
    // API routes — Trick 08: versioned from day one (/v1/)
    // -----------------------------------------------------------------------

    protected function registerApiRoutes(): void
    {
        // QR table-session routes — public-facing; rate-limited to 60 req/min.
        // Trick 03: POST routes carry 'idempotency' middleware so double-taps
        // return the cached first response instead of creating duplicate sessions.
        Route::prefix('api/v1/table-sessions')
            ->middleware(['api', 'throttle:60,1'])
            ->group(function () {
                Route::post('/by-table/{stableToken}', [
                    \CookersDelight\TableSession\Http\Controllers\TableSessionController::class,
                    'resolveByStableToken',
                ])->middleware('idempotency');

                Route::get('/{token}', [
                    \CookersDelight\TableSession\Http\Controllers\TableSessionController::class,
                    'show',
                ]);

                Route::post('/{token}/order', [
                    \CookersDelight\TableSession\Http\Controllers\TableSessionController::class,
                    'placeOrder',
                ])->middleware('idempotency');
            });

        // Prep times
        Route::prefix('api/v1/cd/prep-times')->group(function () {
            Route::get('/', [
                \CookersDelight\TableSession\Http\Controllers\PrepTimeController::class,
                'index',
            ])->middleware(['api', 'throttle:120,1']);

            Route::put('/{menuId}', [
                \CookersDelight\TableSession\Http\Controllers\PrepTimeController::class,
                'update',
            ])->middleware(['api', 'admin.api']);
        });

        // Settings
        Route::prefix('api/v1/cd/settings')->middleware(['api'])->group(function () {
            Route::get('/', [
                \CookersDelight\TableSession\Http\Controllers\CdSettingsController::class,
                'index',
            ]);
            Route::put('/', [
                \CookersDelight\TableSession\Http\Controllers\CdSettingsController::class,
                'setMany',
            ])->middleware('admin.api');

            Route::put('/{key}', [
                \CookersDelight\TableSession\Http\Controllers\CdSettingsController::class,
                'set',
            ])->middleware('admin.api');
        });

        // Admin JSON API for React panel
        Route::prefix('api/v1/admin/tables')
            ->middleware(['api', 'admin.api'])
            ->group(function () {
                Route::get('/', [
                    \CookersDelight\TableSession\Http\Controllers\AdminTablesApiController::class,
                    'index',
                ]);
                Route::post('/', [
                    \CookersDelight\TableSession\Http\Controllers\AdminTablesApiController::class,
                    'store',
                ]);
                Route::delete('/{id}', [
                    \CookersDelight\TableSession\Http\Controllers\AdminTablesApiController::class,
                    'destroy',
                ]);
                Route::get('/{id}/qr-print', [
                    \CookersDelight\TableSession\Http\Controllers\AdminTablesApiController::class,
                    'qrPrintUrl',
                ]);
            });
    }

    // -----------------------------------------------------------------------
    // Admin routes (Blade / TI admin panel — not versioned, internal only)
    // -----------------------------------------------------------------------

    protected function registerAdminRoutes(): void
    {
        Route::prefix('admin/cookers_delight/table_session')
            ->middleware(['admin'])
            ->group(function () {
                Route::get('tables', [
                    \CookersDelight\TableSession\Http\Controllers\AdminTablesController::class,
                    'index',
                ])->name('cd.admin.tables');

                Route::get('tables/qr_print/{tableId}', [
                    \CookersDelight\TableSession\Http\Controllers\AdminTablesController::class,
                    'qrPrint',
                ])->name('cd.admin.tables.qr_print');

                Route::get('tables/qr_print_all', [
                    \CookersDelight\TableSession\Http\Controllers\AdminTablesController::class,
                    'qrPrintAll',
                ])->name('cd.admin.tables.qr_print_all');
            });
    }

    // -----------------------------------------------------------------------
    // SSE — also versioned
    // -----------------------------------------------------------------------

    protected function registerSseRoute(): void
    {
        Route::get('api/v1/orders/{orderId}/status-stream', [
            \CookersDelight\TableSession\Http\Controllers\OrderStatusStreamController::class,
            'stream',
        ])->middleware(['api', 'throttle:10,1']);
    }

    // -----------------------------------------------------------------------
    // Admin navigation
    // -----------------------------------------------------------------------

    public function registerNavigation(): array
    {
        return [
            'cookers_tables' => [
                'label'        => 'Tables & QR',
                'iconCssClass' => 'fa fa-qrcode',
                'url'          => admin_url('cookers_delight/table_session/tables'),
                'priority'     => 200,
                'child'        => [
                    'tables' => [
                        'label'    => 'Table Dashboard',
                        'url'      => admin_url('cookers_delight/table_session/tables'),
                        'priority' => 1,
                    ],
                    'print_all' => [
                        'label'    => 'Print All QR Codes',
                        'url'      => admin_url('cookers_delight/table_session/tables/qr_print_all'),
                        'priority' => 2,
                    ],
                ],
            ],
        ];
    }
}
