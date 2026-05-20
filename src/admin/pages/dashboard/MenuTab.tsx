import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { dashboardApi } from '../../api';
import { Card, Spinner } from '../../components/ui';
import type { DateRange } from './types';
import { formatGHS } from './types';
import { CHART_COLORS, gridProps, axisProps, tooltipStyle } from './chartTheme';

interface MenuItem { menu_id: number; name: string; total_qty: number; total_revenue: number; }
interface MenuData  { top: MenuItem[]; bottom: MenuItem[]; }

export default function MenuTab({ dateRange }: { dateRange: DateRange }) {
  const [data, setData]       = useState<MenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    dashboardApi
      .menuPerformance(dateRange)
      .then(res => {
        setData(res.data);
        setError(null);
      })
      .catch(() => setError('Failed to load menu performance data'))
      .finally(() => setLoading(false));
  }, [dateRange.from, dateRange.to]);

  if (loading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;
  if (error)   return <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-red-400 text-sm">{error}</div>;
  if (!data)   return null;

  const { top, bottom } = data;

  // Horizontal bar chart: sort descending (largest at top)
  const chartData = [...top].reverse();

  return (
    <div className="space-y-5 lg:space-y-6">
      {/* Top sellers */}
      <Card>
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <h2 className="font-bold text-sm sm:text-base">Top 10 Sellers</h2>
          <p className="text-white/40 text-xs mt-0.5">By quantity sold in period</p>
        </div>
        <div className="p-4 sm:p-6">
          {top.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-white/30 text-sm">No data for this period.</div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 36)}>
              <BarChart
                layout="vertical"
                data={chartData}
                margin={{ top: 0, right: 60, bottom: 0, left: 0 }}
              >
                <CartesianGrid {...gridProps} horizontal={false} />
                <XAxis type="number" {...axisProps} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={130}
                  tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 11 }}
                  axisLine={axisProps.axisLine}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number, name: string) =>
                    name === 'Revenue' ? [formatGHS(value), name] : [value, name]
                  }
                />
                <Bar dataKey="total_qty" name="Qty Sold" fill={CHART_COLORS.primary} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Revenue per item */}
      {top.length > 0 && (
        <Card>
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <h2 className="font-bold text-sm sm:text-base">Revenue by Item</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-white/30 text-[11px] uppercase tracking-widest font-bold">
                  <th className="px-5 py-3 text-left">Item</th>
                  <th className="px-5 py-3 text-right">Qty</th>
                  <th className="px-5 py-3 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {top.map((item) => (
                  <tr key={item.menu_id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="px-5 py-2.5 text-white/80">{item.name}</td>
                    <td className="px-5 py-2.5 text-white/50 text-right tabular-nums">{item.total_qty}</td>
                    <td className="px-5 py-2.5 text-white font-bold text-right tabular-nums">
                      {formatGHS(item.total_revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Slow movers */}
      {bottom.length > 0 && (
        <Card>
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <h2 className="font-bold text-sm sm:text-base">Slow Movers</h2>
            <p className="text-white/40 text-xs mt-0.5">Items with lowest sales this period</p>
          </div>
          <ul className="divide-y divide-white/[0.05]">
            {bottom.map((item) => (
              <li key={item.menu_id} className="flex items-center justify-between px-5 py-3">
                <span className="text-sm text-white/70">{item.name}</span>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-white/40 tabular-nums">{item.total_qty} sold</span>
                  <span className="font-bold text-white/60 tabular-nums">{formatGHS(item.total_revenue)}</span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
