<?php

declare(strict_types=1);

namespace CookersDelight\TableSession\Http\Controllers;

use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

class DashboardAnalyticsController extends Controller
{
    // ── GET /api/dashboard/revenue ─────────────────────────────────────────────

    public function revenue(Request $request): JsonResponse
    {
        [$from, $to] = $this->dateRange($request);

        $chart = DB::table('orders')
            ->whereBetween(DB::raw('DATE(date_added)'), [$from, $to])
            ->select(
                DB::raw('DATE(date_added) as date'),
                DB::raw('COALESCE(SUM(order_total), 0) as revenue'),
                DB::raw('COUNT(*) as orders')
            )
            ->groupBy(DB::raw('DATE(date_added)'))
            ->orderBy('date')
            ->get()
            ->map(fn ($r) => [
                'date'    => $r->date,
                'revenue' => round((float) $r->revenue, 2),
                'orders'  => (int) $r->orders,
            ]);

        $totalRevenue  = $chart->sum('revenue');
        $totalOrders   = $chart->sum('orders');
        $avgOrderValue = $totalOrders > 0 ? round($totalRevenue / $totalOrders, 2) : 0;

        $byType = DB::table('orders')
            ->whereBetween(DB::raw('DATE(date_added)'), [$from, $to])
            ->select(
                DB::raw("COALESCE(order_type, 'dine-in') as type"),
                DB::raw('COALESCE(SUM(order_total), 0) as revenue'),
                DB::raw('COUNT(*) as orders')
            )
            ->groupBy('order_type')
            ->get()
            ->map(fn ($r) => [
                'type'    => $r->type,
                'revenue' => round((float) $r->revenue, 2),
                'orders'  => (int) $r->orders,
            ]);

        $days        = Carbon::parse($from)->diffInDays(Carbon::parse($to)) + 1;
        $prevFrom    = Carbon::parse($from)->subDays($days)->toDateString();
        $prevTo      = Carbon::parse($from)->subDay()->toDateString();
        $prevRevenue = (float) DB::table('orders')
            ->whereBetween(DB::raw('DATE(date_added)'), [$prevFrom, $prevTo])
            ->sum('order_total');

        $revenueChangePct = $prevRevenue > 0
            ? round((($totalRevenue - $prevRevenue) / $prevRevenue) * 100, 1)
            : null;

        return response()->json([
            'chart'      => $chart,
            'totals'     => [
                'revenue'         => round($totalRevenue, 2),
                'orders'          => $totalOrders,
                'avg_order_value' => $avgOrderValue,
            ],
            'by_type'    => $byType,
            'comparison' => [
                'revenue_change_pct' => $revenueChangePct,
                'prev_revenue'       => round($prevRevenue, 2),
            ],
        ]);
    }

    // ── GET /api/dashboard/menu-performance ────────────────────────────────────

    public function menuPerformance(Request $request): JsonResponse
    {
        [$from, $to] = $this->dateRange($request);

        $top = DB::table('order_menus as om')
            ->join('orders as o', 'o.order_id', '=', 'om.order_id')
            ->whereBetween(DB::raw('DATE(o.date_added)'), [$from, $to])
            ->select(
                'om.menu_id',
                DB::raw('MAX(om.name) as name'),
                DB::raw('SUM(om.quantity) as total_qty'),
                DB::raw('COALESCE(SUM(om.subtotal), SUM(om.price * om.quantity), 0) as total_revenue')
            )
            ->groupBy('om.menu_id')
            ->orderByDesc('total_qty')
            ->limit(10)
            ->get()
            ->map(fn ($r) => [
                'menu_id'       => (int) $r->menu_id,
                'name'          => $r->name,
                'total_qty'     => (int) $r->total_qty,
                'total_revenue' => round((float) $r->total_revenue, 2),
            ]);

        $bottom = DB::table('order_menus as om')
            ->join('orders as o', 'o.order_id', '=', 'om.order_id')
            ->whereBetween(DB::raw('DATE(o.date_added)'), [$from, $to])
            ->select(
                'om.menu_id',
                DB::raw('MAX(om.name) as name'),
                DB::raw('SUM(om.quantity) as total_qty'),
                DB::raw('COALESCE(SUM(om.subtotal), SUM(om.price * om.quantity), 0) as total_revenue')
            )
            ->groupBy('om.menu_id')
            ->orderBy('total_qty')
            ->limit(5)
            ->get()
            ->map(fn ($r) => [
                'menu_id'       => (int) $r->menu_id,
                'name'          => $r->name,
                'total_qty'     => (int) $r->total_qty,
                'total_revenue' => round((float) $r->total_revenue, 2),
            ]);

        return response()->json([
            'top'    => $top,
            'bottom' => $bottom,
        ]);
    }

    // ── GET /api/dashboard/table-intelligence ──────────────────────────────────

    public function tableIntelligence(Request $request): JsonResponse
    {
        [$from, $to] = $this->dateRange($request);

        $peakHours = DB::table('orders')
            ->whereBetween(DB::raw('DATE(date_added)'), [$from, $to])
            ->select(
                DB::raw('HOUR(date_added) as hour'),
                DB::raw('COUNT(*) as orders')
            )
            ->groupBy(DB::raw('HOUR(date_added)'))
            ->orderBy('hour')
            ->get()
            ->keyBy('hour');

        $allHours = collect(range(0, 23))->map(fn ($h) => [
            'hour'   => $h,
            'orders' => (int) ($peakHours[$h]->orders ?? 0),
        ]);

        $peakDays = DB::table('orders')
            ->whereBetween(DB::raw('DATE(date_added)'), [$from, $to])
            ->select(
                DB::raw('DAYNAME(date_added) as day'),
                DB::raw('DAYOFWEEK(date_added) as day_num'),
                DB::raw('COUNT(*) as orders')
            )
            ->groupBy(DB::raw('DAYNAME(date_added)'), DB::raw('DAYOFWEEK(date_added)'))
            ->orderBy('day_num')
            ->get();

        $avgSessionMinutes = rescue(fn () =>
            DB::table('cd_table_sessions')
                ->whereBetween(DB::raw('DATE(created_at)'), [$from, $to])
                ->whereNotNull('closed_at')
                ->select(DB::raw('AVG(TIMESTAMPDIFF(MINUTE, created_at, closed_at)) as avg_mins'))
                ->value('avg_mins'),
            0
        );

        $totalSessions = rescue(fn () =>
            DB::table('cd_table_sessions')
                ->whereBetween(DB::raw('DATE(created_at)'), [$from, $to])
                ->count(),
            0
        );

        return response()->json([
            'peak_hours'          => $allHours,
            'peak_days'           => $peakDays,
            'avg_session_minutes' => round((float) $avgSessionMinutes),
            'total_sessions'      => (int) $totalSessions,
        ]);
    }

    // ── GET /api/dashboard/customer-behaviour ──────────────────────────────────

    public function customerBehaviour(Request $request): JsonResponse
    {
        [$from, $to] = $this->dateRange($request);

        $avgOrderValue = round(
            (float) DB::table('orders')
                ->whereBetween(DB::raw('DATE(date_added)'), [$from, $to])
                ->avg('order_total'),
            2
        );

        $totalOrders = DB::table('orders')
            ->whereBetween(DB::raw('DATE(date_added)'), [$from, $to])
            ->count();

        $customerCounts = DB::table('orders')
            ->whereBetween(DB::raw('DATE(date_added)'), [$from, $to])
            ->whereNotNull('email')
            ->where('email', '!=', '')
            ->select('email', DB::raw('COUNT(*) as order_count'))
            ->groupBy('email')
            ->get();

        $totalCustomers     = $customerCounts->count();
        $returningCustomers = $customerCounts->where('order_count', '>', 1)->count();
        $newCustomers       = $totalCustomers - $returningCustomers;
        $returnRatePct      = $totalCustomers > 0
            ? round(($returningCustomers / $totalCustomers) * 100, 1)
            : 0;

        return response()->json([
            'avg_order_value'     => $avgOrderValue,
            'total_orders'        => $totalOrders,
            'total_customers'     => $totalCustomers,
            'returning_customers' => $returningCustomers,
            'new_customers'       => $newCustomers,
            'return_rate_pct'     => $returnRatePct,
        ]);
    }

    // ── GET /api/dashboard/alerts ──────────────────────────────────────────────

    public function alerts(): JsonResponse
    {
        $alerts = [];

        // 1. Orders stuck in non-terminal status > 15 minutes today
        $stuck = rescue(fn () =>
            DB::table('orders as o')
                ->join('statuses as s', 's.status_id', '=', 'o.status_id')
                ->whereNotIn('s.status_name', ['Served', 'Completed', 'Cancelled', 'Rejected'])
                ->where('o.date_added', '<=', now()->subMinutes(15))
                ->whereDate('o.date_added', today())
                ->select('o.order_id', 'o.date_added', 's.status_name')
                ->get(),
            collect()
        );

        foreach ($stuck as $order) {
            $mins     = (int) now()->diffInMinutes($order->date_added);
            $alerts[] = [
                'type'     => 'stuck_order',
                'severity' => $mins > 30 ? 'critical' : 'warning',
                'message'  => "Order #{$order->order_id} has been in \"{$order->status_name}\" for {$mins} minutes.",
                'metadata' => ['order_id' => $order->order_id],
            ];
        }

        // 2. No orders in the past hour during business hours (10am–10pm)
        $hour = (int) now()->format('H');
        if ($hour >= 10 && $hour < 22) {
            $recentOrders = rescue(fn () =>
                DB::table('orders')
                    ->where('date_added', '>=', now()->subHour())
                    ->count(),
                1
            );
            if ($recentOrders === 0) {
                $alerts[] = [
                    'type'     => 'no_orders',
                    'severity' => 'warning',
                    'message'  => 'No orders received in the past hour. The ordering system may be down.',
                    'metadata' => [],
                ];
            }
        }

        // 3. Today's revenue < 50% of average for this day of week (last 4 weeks)
        $todayRevenue = rescue(fn () =>
            (float) DB::table('orders')->whereDate('date_added', today())->sum('order_total'),
            null
        );

        $dayOfWeek  = today()->dayOfWeek; // 0=Sun … 6=Sat
        $avgRevenue = rescue(fn () => {
            $daily = DB::table('orders')
                ->where(DB::raw('DAYOFWEEK(date_added)'), $dayOfWeek + 1)
                ->where('date_added', '>=', now()->subWeeks(4))
                ->whereDate('date_added', '<', today())
                ->select(DB::raw('DATE(date_added) as d'), DB::raw('SUM(order_total) as daily_rev'))
                ->groupBy(DB::raw('DATE(date_added)'))
                ->get();

            return $daily->isNotEmpty() ? (float) $daily->avg('daily_rev') : null;
        }, null);

        if ($todayRevenue !== null && $avgRevenue !== null && $avgRevenue > 0
            && $todayRevenue < ($avgRevenue * 0.5)) {
            $alerts[] = [
                'type'     => 'low_revenue',
                'severity' => 'warning',
                'message'  => sprintf(
                    "Today's revenue (GH₵%.2f) is below 50%% of the average for %s (GH₵%.2f).",
                    $todayRevenue,
                    today()->format('l'),
                    $avgRevenue
                ),
                'metadata' => ['today' => $todayRevenue, 'average' => $avgRevenue],
            ];
        }

        // 4. Failed queue jobs
        $failedJobs = rescue(fn () => DB::table('failed_jobs')->count(), 0);
        if ($failedJobs > 0) {
            $alerts[] = [
                'type'     => 'failed_jobs',
                'severity' => 'critical',
                'message'  => "{$failedJobs} failed background job(s) in the queue. Check Laravel Horizon.",
                'metadata' => ['count' => $failedJobs],
            ];
        }

        return response()->json(['alerts' => $alerts]);
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    /** Parse ?from=YYYY-MM-DD&to=YYYY-MM-DD. Defaults to last 7 days. */
    private function dateRange(Request $request): array
    {
        $to   = $request->query('to',   today()->toDateString());
        $from = $request->query('from', today()->subDays(6)->toDateString());

        if (Carbon::parse($to)->isAfter(today())) {
            $to = today()->toDateString();
        }
        if (Carbon::parse($from)->isAfter(Carbon::parse($to))) {
            $from = Carbon::parse($to)->subDays(6)->toDateString();
        }

        return [$from, $to];
    }
}
