export interface DateRange { from: string; to: string; }
export type DatePreset = 'today' | 'yesterday' | '7d' | '30d' | 'month' | 'custom';

export function getPresetRange(preset: Exclude<DatePreset, 'custom'>): DateRange {
  const today = new Date();
  const fmt   = (d: Date) => d.toISOString().slice(0, 10);
  const sub   = (d: Date, days: number) => { const r = new Date(d); r.setDate(r.getDate() - days); return r; };
  switch (preset) {
    case 'today':     return { from: fmt(today),         to: fmt(today) };
    case 'yesterday': return { from: fmt(sub(today, 1)),  to: fmt(sub(today, 1)) };
    case '7d':        return { from: fmt(sub(today, 6)),  to: fmt(today) };
    case '30d':       return { from: fmt(sub(today, 29)), to: fmt(today) };
    case 'month': {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: fmt(first), to: fmt(today) };
    }
  }
}

export function formatGHS(v: number | string | null | undefined): string {
  const n = typeof v === 'string' ? parseFloat(v) : (v ?? 0);
  return `GH₵${isNaN(n as number) ? '0.00' : (n as number).toFixed(2)}`;
}

export function formatPct(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${v > 0 ? '+' : ''}${v}%`;
}

export interface DashboardAlert {
  type:     string;
  severity: 'warning' | 'critical';
  message:  string;
  metadata: Record<string, unknown>;
}
