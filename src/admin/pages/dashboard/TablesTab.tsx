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
import { Card, StatCard, Spinner } from '../../components/ui';
import { HiClock, HiQrCode } from 'react-icons/hi2';
import type { DateRange } from './types';
import { CHART_COLORS, gridProps, axisProps, tooltipStyle } from './chartTheme';

interface HourPoint { hour: number; orders: number; }
interface DayPoint  { day: string; day_num: number; orders: number; }
interface TableData {
  peak_hours:          HourPoint[];
  peak_days:           DayPoint[];
  avg_session_minutes: number;
  total_sessions:      number;
}

function hourLabel(h: number): string {
  if (h === 0)  return '12a';
  if (h < 12)  return `${h}a`;
  if (h === 12) return '12p';
  return `${h - 12}p`;
}

export default function TablesTab({ dateRange }: { dateRange: DateRange }) {
  const [data, setData]       = useState<TableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    dashboardApi
      .tableIntelligence(dateRange)
      .then(res => {
        setData(res.data);
        setError(null);
      })
      .catch(() => setError('Failed to load table intelligence data'))
      .finally(() => setLoading(false));
  }, [dateRange.from, dateRange.to]);

  if (loading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;
  if (error)   return <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-red-400 text-sm">{error}</div>;
  if (!data)   return null;

  const { peak_hours, peak_days, avg_session_minutes, total_sessions } = data;

  const avgMinsLabel = avg_session_minutes > 0
    ? `${avg_session_minutes} min`
    : 'â€”';

  return (
    <div className="space-y-5 lg:space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:gap-4">
        <StatCard
          label="Avg Session Duration"
          value={avgMinsLabel}
          icon={<HiClock size={18} />}
          color={CHART_COLORS.purple}
        />
        <StatCard
          label="Total Sessions"
          value={total_sessions}
          icon={<HiQrCode size={18} />}
          color={CHART_COLORS.blue}
        />
      </div>

      {/* Peak hours */}
      <Card>
        <div className="px-5 py-4 border-b border-[#EDE8E3]">
          <h2 className="font-bold text-sm sm:text-base">Orders by Hour of Day</h2>
          <p className="text-[#78716C] text-xs mt-0.5">Aggregated across the selected period</p>
        </div>
        <div className="p-4 sm:p-6">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={peak_hours}
              margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
            >
              <CartesianGrid {...gridProps} vertical={false} />
              <XAxis dataKey="hour" tickFormatter={hourLabel} {...axisProps} interval={2} />
              <YAxis {...axisProps} width={32} allowDecimals={false} />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={(h: number) => `${hourLabel(h)} â€” ${hourLabel(h + 1)}`}
              />
              <Bar dataKey="orders" name="Orders" fill={CHART_COLORS.primary} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Peak days */}
      {peak_days.length > 0 && (
        <Card>
          <div className="px-5 py-4 border-b border-[#EDE8E3]">
            <h2 className="font-bold text-sm sm:text-base">Orders by Day of Week</h2>
          </div>
          <div className="p-4 sm:p-6">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={peak_days} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid {...gridProps} vertical={false} />
                <XAxis dataKey="day" {...axisProps} tickFormatter={(d: string) => d.slice(0, 3)} />
                <YAxis {...axisProps} width={32} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="orders" name="Orders" fill={CHART_COLORS.amber} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
}
