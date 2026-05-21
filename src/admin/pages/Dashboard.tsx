import React, { useEffect, useState } from 'react';
import { getPresetRange, type DatePreset, type DateRange } from './dashboard/types';
import { dashboardApi } from '../api';
import OverviewTab   from './dashboard/OverviewTab';
import RevenueTab    from './dashboard/RevenueTab';
import MenuTab       from './dashboard/MenuTab';
import TablesTab     from './dashboard/TablesTab';
import CustomersTab  from './dashboard/CustomersTab';
import ReportsTab    from './dashboard/ReportsTab';
import AlertsTab     from './dashboard/AlertsTab';

// ─── Shared helpers (re-exported for tab components) ─────────────────────────

export const STATUS_COLORS: Record<string, string> = {
  Pending:    '#d97706',
  New:        '#d97706',
  Preparing:  '#EC4824',
  Processing: '#EC4824',
  Ready:      '#16A34A',
  Delivered:  '#16A34A',
  Completed:  '#16A34A',
  Served:     '#78716C',
  Cancelled:  '#ef4444',
};

export function formatRevenue(value: number | string): string {
  if (typeof value === 'number') return `GH₵${value.toFixed(2)}`;
  const n = parseFloat(String(value));
  return `GH₵${isNaN(n) ? value : n.toFixed(2)}`;
}

export function getStatusLabel(order: { order_status?: string; status_name?: string }): string {
  return order.order_status ?? order.status_name ?? 'Unknown';
}

export function getTableLabel(order: { order_type?: string; order_options?: string | Record<string, unknown> }): string {
  try {
    const opts =
      typeof order.order_options === 'string'
        ? JSON.parse(order.order_options)
        : order.order_options;
    if (opts?.table_number) return `Table ${opts.table_number}`;
    if (opts?.location_name) return String(opts.location_name);
  } catch {
    // ignore
  }
  return order.order_type ?? '—';
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs} hr ago`;
}

// ─── Tabs config ──────────────────────────────────────────────────────────────

type TabId = 'overview' | 'revenue' | 'menu' | 'tables' | 'customers' | 'reports' | 'alerts';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview',   label: 'Overview'  },
  { id: 'revenue',    label: 'Revenue'   },
  { id: 'menu',       label: 'Menu'      },
  { id: 'tables',     label: 'Tables'    },
  { id: 'customers',  label: 'Customers' },
  { id: 'reports',    label: 'Reports'   },
  { id: 'alerts',     label: 'Alerts'    },
];

const PRESETS: { id: Exclude<DatePreset, 'custom'>; label: string }[] = [
  { id: 'today',     label: 'Today'      },
  { id: 'yesterday', label: 'Yesterday'  },
  { id: '7d',        label: '7 days'     },
  { id: '30d',       label: '30 days'    },
  { id: 'month',     label: 'This month' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [activeTab, setActiveTab]       = useState<TabId>('overview');
  const [preset, setPreset]             = useState<DatePreset>('7d');
  const [dateRange, setDateRange]       = useState<DateRange>(getPresetRange('7d'));
  const [customFrom, setCustomFrom]     = useState('');
  const [customTo, setCustomTo]         = useState('');
  const [alertCount, setAlertCount]     = useState(0);
  const [hasCritical, setHasCritical]   = useState(false);

  useEffect(() => {
    function fetchAlertCount() {
      dashboardApi.alerts()
        .then(r => {
          const list = r.data?.alerts ?? [];
          setAlertCount(list.length);
          setHasCritical(list.some((a: { severity: string }) => a.severity === 'critical'));
        })
        .catch(() => {});
    }
    fetchAlertCount();
    const id = setInterval(fetchAlertCount, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  function applyPreset(p: Exclude<DatePreset, 'custom'>) {
    setPreset(p);
    setDateRange(getPresetRange(p));
  }

  function applyCustom() {
    if (!customFrom || !customTo) return;
    setPreset('custom');
    setDateRange({ from: customFrom, to: customTo });
  }

  return (
    <div className="space-y-5 lg:space-y-6 min-w-0">
      {/* Page header */}
      <div>
        <h1 className="text-lg sm:text-xl lg:text-2xl font-black text-[#1C1917]">Dashboard</h1>
        <p className="text-[#A8A29E] text-[11px] sm:text-sm mt-0.5">
          Analytics &amp; live overview
        </p>
      </div>

      {/* Date range picker */}
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => applyPreset(p.id)}
            className="text-xs px-3 py-1.5 rounded-lg font-bold transition-colors"
            style={
              preset === p.id
                ? { backgroundColor: '#EC4824', color: '#fff' }
                : { backgroundColor: '#F5EFE8', color: '#78716C' }
            }
          >
            {p.label}
          </button>
        ))}

        {/* Custom range inputs */}
        <div className="flex items-center gap-1.5 ml-1">
          <input
            type="date"
            value={customFrom}
            onChange={e => setCustomFrom(e.target.value)}
            className="bg-white border border-[#EDE8E3] rounded-lg px-3 py-1.5 text-xs text-[#1C1917] focus:border-[#EC4824] focus:outline-none transition-colors w-36"
          />
          <span className="text-[#A8A29E] text-xs">—</span>
          <input
            type="date"
            value={customTo}
            onChange={e => setCustomTo(e.target.value)}
            className="bg-white border border-[#EDE8E3] rounded-lg px-3 py-1.5 text-xs text-[#1C1917] focus:border-[#EC4824] focus:outline-none transition-colors w-36"
          />
          <button
            onClick={applyCustom}
            disabled={!customFrom || !customTo}
            className="text-xs px-3 py-1.5 rounded-lg font-bold disabled:opacity-30 transition-colors"
            style={{ backgroundColor: '#F5EFE8', color: '#78716C' }}
          >
            Apply
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto pb-0 scrollbar-hide" style={{ borderBottom: '1px solid #EDE8E3' }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 inline-flex items-center gap-1.5 text-sm px-4 py-2.5 font-bold border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-[#EC4824] text-[#EC4824]'
                : 'border-transparent text-[#A8A29E] hover:text-[#78716C]'
            }`}
          >
            {tab.label}
            {tab.id === 'alerts' && alertCount > 0 && (
              <span
                className="w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center"
                style={{ backgroundColor: hasCritical ? '#ef4444' : '#d97706', color: '#fff' }}
              >
                {alertCount > 9 ? '9+' : alertCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview'  && <OverviewTab />}
      {activeTab === 'revenue'   && <RevenueTab   dateRange={dateRange} />}
      {activeTab === 'menu'      && <MenuTab       dateRange={dateRange} />}
      {activeTab === 'tables'    && <TablesTab     dateRange={dateRange} />}
      {activeTab === 'customers' && <CustomersTab  dateRange={dateRange} />}
      {activeTab === 'reports'   && <ReportsTab    dateRange={dateRange} />}
      {activeTab === 'alerts'    && <AlertsTab />}
    </div>
  );
}
