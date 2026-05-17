<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\TastyIgniterOrderService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/**
 * Renders the custom QR ordering menu SPA.
 *
 * Menu data is fetched from TastyIgniter (via the same 5-min cache as the
 * kawax driver) and embedded as JSON in data-* attributes on the root element.
 * Alpine.js takes over from there — no further server requests needed to browse.
 */
class MenuController extends Controller
{
    public function __construct(private TastyIgniterOrderService $ti) {}

    public function index(Request $request)
    {
        // Session guard: customer must have scanned a QR code first.
        if (! $request->session()->has('cd_session_token')) {
            return view('menu.no-session');
        }

        $locationId = (int) $request->session()->get('cd_location_id',
            config('tastyigniter.default_location_id', 1)
        );

        // Reuse the same 5-min cache key as TastyIgniterMenuDriver so we do
        // not create a separate cache entry when both code paths run.
        $rawMenu = Cache::remember("ti_menu_{$locationId}", 300, function () use ($locationId) {
            $menu      = $this->ti->fetchMenu($locationId);
            $prepTimes = $this->ti->fetchPrepTimes();

            return array_map(function (array $cat) use ($prepTimes) {
                $cat['menus'] = array_map(function (array $item) use ($prepTimes) {
                    $item['prep_time_minutes'] = $prepTimes[$item['id']] ?? 15;
                    return $item;
                }, $cat['menus']);
                return $cat;
            }, $menu);
        });

        // Flatten into two arrays Alpine can consume without recursion.
        $categories = [];
        $items      = [];

        foreach ($rawMenu as $idx => $group) {
            if (empty($group['menus'])) continue;

            $catId = 'cat-' . $idx;

            $categories[] = [
                'id'   => $catId,
                'name' => $group['category'],
            ];

            foreach ($group['menus'] as $item) {
                if (! ($item['available'] ?? true)) continue;

                $items[] = [
                    'id'                => $item['id'],
                    'category_id'       => $catId,
                    'name'              => $item['name'],
                    'description'       => $item['description'] ?? '',
                    'price'             => (float) ($item['price'] ?? 0),
                    'image'             => $item['image'] ?? null,
                    'prep_time_minutes' => (int) ($item['prep_time_minutes'] ?? 15),
                    'ingredients'       => $this->extractIngredients($item),
                    'calories'          => $item['calories'] ?? null,
                ];
            }
        }

        return view('menu.index', [
            'categories'   => $categories,
            'items'        => $items,
            'tableNumber'  => $request->session()->get('cd_table_number'),
            'locationName' => $request->session()->get('cd_location_name'),
        ]);
    }

    /**
     * Extract ingredient chip labels from a menu item.
     * Uses TI's custom ingredients field if present; otherwise returns empty.
     * The detail sheet only renders chips when this array is non-empty.
     */
    private function extractIngredients(array $item): array
    {
        if (! empty($item['ingredients']) && is_array($item['ingredients'])) {
            return array_map('strtoupper', array_filter($item['ingredients'], 'is_string'));
        }
        return [];
    }
}
