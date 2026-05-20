import React, { useState } from 'react';
import { getPresetRange, type DatePreset, type DateRange } from './dashboard/types';
import { inputClass } from '../components/ui';
import OverviewTab   from './dashboard/OverviewTab';
import RevenueTab    from './dashboard/RevenueTab';
import MenuTab       from './dashboard/MenuTab';
import TablesTab     from './dashboard/TablesTab';
import CustomersTab  from './dashboard/CustomersTab';
import ReportsTab    from './dashboard/ReportsTab';
import AlertsTab     from './dashboard/AlertsTab';

// ─── Shared helpers (re-exported for tab components) ─────────────────────────

export const STATUS_COLORS: Record<string, string> = {
  Pending:    '#eab308',
  New:        '#eab308',
  Preparing:  '#EC4824',
  Processing: '#EC4824',
  Ready:      '#22c55e',
  Delivered:  '#22c55e',
  Completed:  '#22c55e',
  Served:     '#6b7280',
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
        <h1 className="text-lg sm:text-xl lg:text-2xl font-black">Dashboard</h1>
        <p className="text-white/40 text-[11px] sm:text-sm mt-0.5">
          Analytics &amp; live overview
        </p>
      </div>

      {/* Date range picker */}
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => applyPreset(p.id)}
            className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-colors ${
              preset === p.id
                ? 'bg-[#EC4824] text-white'
                : 'bg-white/[0.06] text-white/50 hover:text-white hover:bg-white/10'
            }`}
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
            className={`${inputClass} !py-1.5 !text-xs w-36`}
          />
          <span className="text-white/30 text-xs">—</span>
          <input
            type="date"
            value={customTo}
            onChange={e => setCustomTo(e.target.value)}
            className={`${inputClass} !py-1.5 !text-xs w-36`}
          />
          <button
            onClick={applyCustom}
            disabled={!customFrom || !customTo}
            className="text-xs px-3 py-1.5 rounded-lg font-bold bg-white/[0.06] text-white/50 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-colors"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-white/[0.06] overflow-x-auto pb-0 scrollbar-hide">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 text-sm px-4 py-2.5 font-bold border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-[#EC4824] text-white'
                : 'border-transparent text-white/40 hover:text-white/70'
            }`}
          >
            {tab.label}
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
