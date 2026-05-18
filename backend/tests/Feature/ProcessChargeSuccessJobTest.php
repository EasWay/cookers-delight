<?php

namespace Tests\Feature;

use App\Jobs\ProcessChargeSuccessJob;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class ProcessChargeSuccessJobTest extends TestCase
{
    use RefreshDatabase;

    public function test_job_does_not_dispatch_new_job_on_failure(): void
    {
        Queue::fake();

        $job = new ProcessChargeSuccessJob([
            'reference' => 'CD-999999-abc123',
            'amount'    => 5000,
        ]);

        try {
            $job->handle(
                app(\App\Services\BusinessMetricsService::class),
                app(\App\Services\CircuitBreakerService::class)
            );
        } catch (\Throwable) {
            // expected — order 999999 does not exist
        }

        Queue::assertNothingPushed();
    }

    public function test_backoff_is_array_not_flat_integer(): void
    {
        $job = new ProcessChargeSuccessJob(['reference' => 'CD-1-abc', 'amount' => 0]);
        $this->assertIsArray($job->backoff);
        $this->assertGreaterThan(1, count($job->backoff));
    }

    public function test_second_dispatch_of_same_reference_is_idempotent(): void
    {
        $locationId = \DB::table('locations')->insertGetId([
            'location_name'   => 'Kaneshie',
            'location_status' => 1,
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);

        $statusId = \DB::table('statuses')->insertGetId([
            'status_name'   => 'Received',
            'status_for'    => 'order',
            'created_at'    => now(),
            'updated_at'    => now(),
        ]);

        $orderId = \DB::table('orders')->insertGetId([
            'location_id' => $locationId,
            'order_total' => 50.00,
            'processed'   => 1,
            'status_id'   => $statusId,
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);

        $historyCountBefore = \DB::table('status_history')
            ->where('object_id', $orderId)
            ->count();

        $job = new ProcessChargeSuccessJob([
            'reference' => "CD-{$orderId}-abc123",
            'amount'    => 5000,
        ]);

        $job->handle(
            app(\App\Services\BusinessMetricsService::class),
            app(\App\Services\CircuitBreakerService::class)
        );

        $historyCountAfter = \DB::table('status_history')
            ->where('object_id', $orderId)
            ->count();

        $this->assertSame($historyCountBefore, $historyCountAfter);
    }
}
