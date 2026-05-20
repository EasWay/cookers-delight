import React, { useEffect, useState } from 'react';
import { dashboardApi } from '../../api';
import { Card, Spinner } from '../../components/ui';
import { HiPrinter, HiArrowDownTray } from 'react-icons/hi2';
import type { DateRange } from './types';
import { formatGHS, formatPct } from './types';
import { CHART_COLORS } from './chartTheme';

interface ReportData {
  revenue:   { totals: { revenue: number; orders: number; avg_order_value: number }; comparison: { revenue_change_pct: number | null } } | null;
  menu:      { top: Array<{ name: string; total_qty: number; total_revenue: number }> } | null;
  tables:    { avg_session_minutes: number; total_sessions: number } | null;
  customers: { avg_order_value: number; return_rate_pct: number; new_customers: number; returning_customers: number } | null;
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.04]">
      <span className="text-sm text-white/50">{label}</span>
      <span className={`text-sm font-bold ${accent ? '' : 'text-white'}`} style={accent ? { color: CHART_COLORS.green } : undefined}>
        {value}
      </span>
    </div>
  );
}

export default function ReportsTab({ dateRange }: { dateRange: DateRange }) {
  const [data, setData]       = useState<ReportData>({ revenue: null, menu: null, tables: null, customers: null });
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      dashboardApi.revenue(dateRange).then(r => r.data).catch(() => null),
      dashboardApi.menuPerformance(dateRange).then(r => r.data).catch(() => null),
      dashboardApi.tableIntelligence(dateRange).then(r => r.data).catch(() => null),
      dashboardApi.customerBehaviour(dateRange).then(r => r.data).catch(() => null),
    ]).then(([revenue, menu, tables, customers]) => {
      setData({ revenue, menu, tables, customers });
    }).catch(() => {
      setError('Failed to load report data');
    }).finally(() => setLoading(false));
  }, [dateRange.from, dateRange.to]);

  if (loading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;
  if (error)   return <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-red-400 text-sm">{error}</div>;

  const { revenue, menu, tables, customers } = data;

  function downloadCsv() {
    const rows: string[] = [
      'Section,Metric,Value',
      revenue ? [
        `Revenue,Total Revenue,${formatGHS(revenue.totals.revenue)}`,
        `Revenue,Total Orders,${revenue.totals.orders}`,
        `Revenue,Avg Order Value,${formatGHS(revenue.totals.avg_order_value)}`,
        `Revenue,vs Previous Period,${formatPct(revenue.comparison.revenue_change_pct)}`,
      ].join('\n') : '',
      menu?.top.slice(0, 5).map(i =>
        `Menu,${i.name} (qty),${i.total_qty}`
      ).join('\n') ?? '',
      tables ? [
        `Tables,Total Sessions,${tables.total_sessions}`,
        `Tables,Avg Session Duration,${tables.avg_session_minutes > 0 ? tables.avg_session_minutes + ' min' : '—'}`,
      ].join('\n') : '',
      customers ? [
        `Customers,Avg Order Value,${formatGHS(customers.avg_order_value)}`,
        `Customers,New Customers,${customers.new_customers}`,
        `Customers,Returning Customers,${customers.returning_customers}`,
        `Customers,Return Rate,${customers.return_rate_pct}%`,
      ].join('\n') : '',
    ].filter(Boolean);

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), {
      href:     url,
      download: `cookers-delight-report-${dateRange.from}-to-${dateRange.to}.csv`,
    });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5 lg:space-y-6">
      {/* Header + print */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-base">Period Summary</h2>
          <p className="text-white/40 text-xs mt-0.5">{dateRange.from} → {dateRange.to}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadCsv}
            disabled={loading}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors disabled:opacity-40"
          >
            <HiArrowDownTray size={15} />
            CSV
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <HiPrinter size={15} />
            Print
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 lg:gap-5">
        {/* Revenue */}
        <Card>
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <h3 className="font-bold text-sm">Revenue</h3>
          </div>
          {revenue ? (
            <>
              <Row label="Total Revenue"     value={formatGHS(revenue.totals.revenue)} accent />
              <Row label="Total Orders"      value={String(revenue.totals.orders)} />
              <Row label="Avg Order Value"   value={formatGHS(revenue.totals.avg_order_value)} />
              <Row label="vs Prev Period"    value={formatPct(revenue.comparison.revenue_change_pct)} />
            </>
          ) : (
            <div className="px-5 py-4 text-white/30 text-sm">Unavailable</div>
          )}
        </Card>

        {/* Top seller */}
        <Card>
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <h3 className="font-bold text-sm">Top Menu Items</h3>
          </div>
          {menu && menu.top.length > 0 ? (
            menu.top.slice(0, 5).map((item) => (
              <div key={item.name} className="flex items-center justify-between px-5 py-3 border-b border-white/[0.04]">
                <span className="text-sm text-white/60 truncate max-w-[55%]">{item.name}</span>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-white/40">{item.total_qty}×</span>
                  <span className="font-bold text-white tabular-nums">{formatGHS(item.total_revenue)}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="px-5 py-4 text-white/30 text-sm">Unavailable</div>
          )}
        </Card>

        {/* Tables */}
        <Card>
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <h3 className="font-bold text-sm">Table Intelligence</h3>
          </div>
          {tables ? (
            <>
              <Row label="Total Sessions"        value={String(tables.total_sessions)} />
              <Row label="Avg Session Duration"  value={tables.avg_session_minutes > 0 ? `${tables.avg_session_minutes} min` : '—'} />
            </>
          ) : (
            <div className="px-5 py-4 text-white/30 text-sm">Unavailable</div>
          )}
        </Card>

        {/* Customers */}
        <Card>
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <h3 className="font-bold text-sm">Customer Behaviour</h3>
          </div>
          {customers ? (
            <>
              <Row label="Avg Order Value"    value={formatGHS(customers.avg_order_value)} />
              <Row label="New Customers"      value={String(customers.new_customers)} />
              <Row label="Returning"          value={String(customers.returning_customers)} />
              <Row label="Return Rate"        value={`${customers.return_rate_pct}%`} accent />
            </>
          ) : (
            <div className="px-5 py-4 text-white/30 text-sm">Unavailable</div>
          )}
        </Card>
      </div>
    </div>
  );
}
