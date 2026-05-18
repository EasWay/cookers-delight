<?php

namespace CookersDelight\TableSession\Http\Controllers;

use CookersDelight\TableSession\Models\CdSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

/**
 * Key-value settings store for the React admin panel.
 *
 * GET  /api/cd/settings        → returns all settings as {data: {key: value}}
 * PUT  /api/cd/settings        → bulk-upserts {settings: {key: value, ...}}
 * PUT  /api/cd/settings/{key}  → upserts a single key
 */
class CdSettingsController extends Controller
{
    private const MASKED_KEYS = ['paystack_secret_key', 'paystack_webhook_secret'];
    private const MASK = '••••••••';

    public function index(): JsonResponse
    {
        $map = CdSetting::allAsMap();

        foreach (self::MASKED_KEYS as $key) {
            if (!empty($map[$key])) {
                $map[$key] = self::MASK;
            }
        }

        return response()->json(['data' => $map]);
    }

    public function setMany(Request $request): JsonResponse
    {
        $pairs = $request->validate([
            'settings'   => ['required', 'array'],
            'settings.*' => ['nullable', 'string', 'max:65535'],
        ])['settings'];

        CdSetting::setMany($pairs);

        return response()->json(['data' => CdSetting::allAsMap()]);
    }

    public function set(Request $request, string $key): JsonResponse
    {
        // SECURITY: Validate the key name so attackers cannot inject arbitrary
        // characters (null bytes, slashes, etc.) into the settings store.
        if (!preg_match('/^[a-z0-9_]{1,64}$/i', $key)) {
            return response()->json(['message' => 'Invalid settings key.'], 422);
        }

        $value = $request->validate(['value' => ['nullable']])['value'];

        CdSetting::setValue($key, is_array($value) ? json_encode($value) : $value);

        return response()->json(['data' => ['key' => $key, 'value' => $value]]);
    }
}
