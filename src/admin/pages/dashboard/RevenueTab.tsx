import React, { useEffect, useState } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { dashboardApi } from '../../api';
import { Card, StatCard, Spinner } from '../../components/ui';
import { HiCurrencyDollar, HiShoppingCart, HiCalculator } from 'react-icons/hi2';
import type { DateRange } from './types';
import { formatGHS, formatPct } from './types';
import { CHART_COLORS, gridProps, axisProps, tooltipStyle } from './chartTheme';

interface ChartPoint { date: string; revenue: number; orders: number; }
interface ByType     { type: string; revenue: number; orders: number; }
interface RevenueData {
  chart:      ChartPoint[];
  totals:     { revenue: number; orders: number; avg_order_value: number };
  by_type:    ByType[];
  comparison: { revenue_change_pct: number | null; prev_revenue: number };
}

function shortDate(d: string) {
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function RevenueTab({ dateRange }: { dateRange: DateRange }) {
  const [data, setData]       = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    dashboardApi
      .revenue(dateRange)
      .then(res => {
        setData(res.data);
        setError(null);
      })
      .catch(() => setError('Failed to load revenue data'))
      .finally(() => setLoading(false));
  }, [dateRange.from, dateRange.to]);

  if (loading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;
  if (error)   return <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-red-400 text-sm">{error}</div>;
  if (!data)   return null;

  const { chart, totals, by_type, comparison } = data;
  const changePct = comparison.revenue_change_pct;

  return (
    <div className="space-y-5 lg:space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 lg:gap-4">
        <StatCard
          label="Total Revenue"
          value={formatGHS(totals.revenue)}
          sub={changePct != null ? `${formatPct(changePct)} vs prev period` : undefined}
          icon={<HiCurrencyDollar size={18} />}
          color={CHART_COLORS.green}
        />
        <StatCard
          label="Total Orders"
          value={totals.orders}
          icon={<HiShoppingCart size={18} />}
          color={CHART_COLORS.primary}
        />
        <StatCard
          label="Avg Order Value"
          value={formatGHS(totals.avg_order_value)}
          icon={<HiCalculator size={18} />}
          color={CHART_COLORS.blue}
        />
        <StatCard
          label="Prev Period Rev"
          value={formatGHS(comparison.prev_revenue)}
          icon={<HiCurrencyDollar size={18} />}
          color={CHART_COLORS.muted}
        />
      </div>

      {/* Chart */}
      <Card>
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <h2 className="font-bold text-sm sm:text-base">Revenue &amp; Orders</h2>
        </div>
        <div className="p-4 sm:p-6">
          {chart.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-white/30 text-sm">No data for this period.</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chart} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid {...gridProps} vertical={false} />
                <XAxis dataKey="date" tickFormatter={shortDate} {...axisProps} />
                <YAxis yAxisId="rev" tickFormatter={(v) => `GH₵${v}`} {...axisProps} width={72} />
                <YAxis yAxisId="ord" orientation="right" {...axisProps} width={36} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number, name: string) =>
                    name === 'Revenue' ? [formatGHS(value), name] : [value, name]
                  }
                  labelFormatter={shortDate}
                />
                <Legend
                  wrapperStyle={{ paddingTop: 12, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}
                />
                <Bar
                  yAxisId="ord"
                  dataKey="orders"
                  name="Orders"
                  fill={CHART_COLORS.primary + '55'}
                  radius={[3, 3, 0, 0]}
                />
                <Line
                  yAxisId="rev"
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke={CHART_COLORS.green}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: CHART_COLORS.green }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Breakdown by type */}
      {by_type.length > 0 && (
        <Card>
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <h2 className="font-bold text-sm sm:text-base">Breakdown by Type</h2>
          </div>
          <div className="divide-y divide-white/[0.05]">
            {by_type.map((row) => (
              <div key={row.type} className="flex items-center justify-between px-5 py-3">
                <span className="text-sm text-white/70 capitalize">{row.type}</span>
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-white/50">{row.orders} orders</span>
                  <span className="font-bold text-white tabular-nums">{formatGHS(row.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
