import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { dashboardApi } from '../../api';
import { Card, StatCard, Spinner } from '../../components/ui';
import { HiCurrencyDollar, HiUsers, HiArrowPath } from 'react-icons/hi2';
import type { DateRange } from './types';
import { formatGHS } from './types';
import { CHART_COLORS, tooltipStyle } from './chartTheme';

interface CustomerData {
  avg_order_value:     number;
  total_orders:        number;
  total_customers:     number;
  returning_customers: number;
  new_customers:       number;
  return_rate_pct:     number;
}

export default function CustomersTab({ dateRange }: { dateRange: DateRange }) {
  const [data, setData]       = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    dashboardApi
      .customerBehaviour(dateRange)
      .then(res => {
        setData(res.data);
        setError(null);
      })
      .catch(() => setError('Failed to load customer behaviour data'))
      .finally(() => setLoading(false));
  }, [dateRange.from, dateRange.to]);

  if (loading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;
  if (error)   return <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-red-400 text-sm">{error}</div>;
  if (!data)   return null;

  const {
    avg_order_value,
    total_orders,
    total_customers,
    returning_customers,
    new_customers,
    return_rate_pct,
  } = data;

  const pieData = [
    { name: 'New',       value: new_customers,       color: CHART_COLORS.blue },
    { name: 'Returning', value: returning_customers,  color: CHART_COLORS.green },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-5 lg:space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 lg:gap-4">
        <StatCard
          label="Avg Order Value"
          value={formatGHS(avg_order_value)}
          icon={<HiCurrencyDollar size={18} />}
          color={CHART_COLORS.green}
        />
        <StatCard
          label="Total Orders"
          value={total_orders}
          icon={<HiCurrencyDollar size={18} />}
          color={CHART_COLORS.primary}
        />
        <StatCard
          label="Unique Customers"
          value={total_customers}
          icon={<HiUsers size={18} />}
          color={CHART_COLORS.blue}
        />
        <StatCard
          label="Return Rate"
          value={`${return_rate_pct}%`}
          icon={<HiArrowPath size={18} />}
          color={CHART_COLORS.amber}
        />
      </div>

      {/* New vs Returning donut */}
      <Card>
        <div className="px-5 py-4 border-b border-[#EDE8E3]">
          <h2 className="font-bold text-sm sm:text-base">New vs Returning Customers</h2>
          <p className="text-[#78716C] text-xs mt-0.5">Identified by email address</p>
        </div>
        <div className="p-4 sm:p-6">
          {pieData.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-[#A8A29E] text-sm">
              No customer data for this period.
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number, name: string) => [value, name]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </Card>

      {/* Summary table */}
      <Card>
        <div className="divide-y divide-white/[0.05]">
          <div className="flex items-center justify-between px-5 py-3">
            <span className="text-sm text-[#78716C]">New customers</span>
            <span className="text-sm font-bold text-white">{new_customers}</span>
          </div>
          <div className="flex items-center justify-between px-5 py-3">
            <span className="text-sm text-[#78716C]">Returning customers</span>
            <span className="text-sm font-bold text-white">{returning_customers}</span>
          </div>
          <div className="flex items-center justify-between px-5 py-3">
            <span className="text-sm text-[#78716C]">Return rate</span>
            <span className="text-sm font-bold" style={{ color: CHART_COLORS.green }}>
              {return_rate_pct}%
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
