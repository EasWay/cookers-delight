<?php

namespace App\Jobs;

use App\Services\BusinessMetricsService;
use App\Services\CircuitBreakerService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Trick 06 — If a request waits for it, it shouldn't.
 *
 * The Paystack webhook controller dispatches this job and returns 200 in ~1ms.
 * Anything the user doesn't need in that millisecond goes to a worker.
 *
 * Trick 07 — Rate-limit yourselves (circuit breaker).
 * DB writes are wrapped in CircuitBreakerService so a DB blip doesn't
 * cascade into a retry storm against the database.
 *
 * Trick 11 — Plan the failure; make it boring.
 * On any exception the job is caught, logged as a business metric, then
 * re-thrown so Laravel retries it via the exponential $backoff schedule.
 */
class ProcessChargeSuccessJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int   $tries  = 3;
    public array $backoff = [30, 120, 300]; // exponential: 30s → 2min → 5min

    public function __construct(private readonly array $data) {}

    public function handle(BusinessMetricsService $metrics, CircuitBreakerService $breaker): void
    {
        $reference = $this->data['reference'] ?? null;
        $amount    = ($this->data['amount'] ?? 0) / 100;

        if (!$reference || !is_string($reference) || strlen($reference) > 100) {
            return;
        }

        if (!preg_match('/^CD-(\d+)-/', $reference, $matches)) {
            Log::warning('ProcessChargeSuccessJob: unrecognised reference format', ['ref' => $reference]);
            return;
        }

        $orderId = (int) $matches[1];

        try {
            $breaker->attempt(
                service: 'mysql',
                operation: function () use ($orderId, $reference, $amount, $metrics) {
                    $order = DB::table('orders')->where('order_id', $orderId)->first();

                    if (!$order) {
                        Log::error('ProcessChargeSuccessJob: order not found', ['order_id' => $orderId]);
                        return;
                    }

                    $receivedStatusId = DB::table('statuses')
                        ->where('status_name', 'Received')
                        ->where('status_for', 'order')
                        ->value('status_id');

                    // Atomic guard: only the first concurrent instance gets rows > 0.
                    $updated = DB::table('orders')
                        ->where('order_id', $orderId)
                        ->where('processed', 0)
                        ->update([
                            'processed'       => 1,
                            'payment'         => $this->data['channel'] ?? 'paystack',
                            'status_id'       => $receivedStatusId,
                            'total_items_tax' => $amount,
                            'updated_at'      => now(),
                        ]);

                    if (!$updated) {
                        Log::info('ProcessChargeSuccessJob: already processed, skipping', ['order_id' => $orderId]);
                        return;
                    }

                    DB::table('status_history')->insert([
                        'object_id'   => $orderId,
                        'object_type' => 'order',
                        'status_id'   => $receivedStatusId,
                        'comment'     => 'Payment confirmed via Paystack webhook. Ref: ' . $reference,
                        'notify'      => 1,
                        'created_at'  => now(),
                        'updated_at'  => now(),
                    ]);

                    $metrics->record('payment.success', [
                        'order_id'  => $orderId,
                        'reference' => $reference,
                        'amount'    => $amount,
                    ]);

                    Log::info('Paystack: order paid', [
                        'order_id' => $orderId,
                        'ref'      => $reference,
                        'amount'   => $amount,
                    ]);
                },
                fallback: fn () => throw new \RuntimeException('DB circuit open — deferring charge processing')
            );
        } catch (\Throwable $e) {
            $metrics->record('payment.failed', [
                'order_id'  => $orderId,
                'reference' => $reference,
                'error'     => $e->getMessage(),
            ]);

            throw $e;
        }
    }
}
