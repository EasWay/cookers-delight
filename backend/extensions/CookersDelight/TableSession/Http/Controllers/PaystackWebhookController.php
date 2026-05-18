<?php

namespace CookersDelight\TableSession\Http\Controllers;

use App\Jobs\ProcessChargeSuccessJob;
use CookersDelight\TableSession\Support\PaystackConfig;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Log;

/**
 * Paystack sends a POST to this endpoint after every payment event.
 *
 * CRITICAL RULE: Never mark an order as paid from the QR frontend.
 * Only this webhook (with HMAC signature verification) marks payment complete.
 *
 * Trick 06 — The controller validates the signature and dispatches a job
 * immediately. The HTTP response is returned in ~1ms; all DB work happens
 * asynchronously in the queue worker.
 *
 * Trick 11 — Paystack retries on non-200. We always return 200 after
 * signature validation so their retry logic doesn't hammer us — the job
 * handles its own retry and graceful degradation.
 *
 * Docs: https://paystack.com/docs/payments/webhooks/
 */
class PaystackWebhookController extends Controller
{
    public function handle(Request $request): Response
    {
        if (!$this->signatureIsValid($request)) {
            Log::warning('Paystack webhook: invalid signature', ['ip' => $request->ip()]);
            return response('Unauthorized', 401);
        }

        $payload = $request->json()->all();
        $event   = $payload['event'] ?? '';

        // Trick 06 — dispatch async; return 200 in milliseconds.
        // Trick 11 — returning 200 here means Paystack won't retry endlessly;
        //            the queued job handles its own retry with a +5m delay.
        match ($event) {
            'charge.success' => ProcessChargeSuccessJob::dispatch($payload['data']),
            default          => null,
        };

        return response('OK', 200);
    }

    private function signatureIsValid(Request $request): bool
    {
        $secret    = PaystackConfig::secretKey();
        $signature = $request->header('X-Paystack-Signature');
        $computed  = hash_hmac('sha512', $request->getContent(), $secret);

        return hash_equals($computed, $signature ?? '');
    }
}
