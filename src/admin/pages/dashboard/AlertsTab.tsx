import React, { useEffect, useState } from 'react';
import { dashboardApi } from '../../api';
import { Card, EmptyState, Spinner } from '../../components/ui';
import { HiBell, HiExclamationTriangle, HiExclamationCircle } from 'react-icons/hi2';
import type { DashboardAlert } from './types';

export default function AlertsTab() {
  const [alerts, setAlerts]   = useState<DashboardAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  function fetchAlerts() {
    dashboardApi
      .alerts()
      .then(res => {
        setAlerts((res.data?.alerts ?? []) as DashboardAlert[]);
        setError(null);
      })
      .catch(() => setError('Failed to load alerts'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchAlerts();
    const id = setInterval(fetchAlerts, 60_000);
    return () => clearInterval(id);
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;
  if (error)   return <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-red-400 text-sm">{error}</div>;

  if (alerts.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<HiBell size={48} />}
          title="All clear â€” no active alerts"
        />
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert, i) => {
        const isCritical = alert.severity === 'critical';
        return (
          <Card key={i} className={`flex gap-4 p-4 sm:p-5 border ${isCritical ? 'border-red-500/30' : 'border-yellow-500/20'}`}>
            <div
              className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
                isCritical ? 'bg-red-500/15 text-red-400' : 'bg-yellow-500/15 text-yellow-400'
              }`}
            >
              {isCritical
                ? <HiExclamationCircle size={20} />
                : <HiExclamationTriangle size={20} />
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                    isCritical
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}
                >
                  {alert.severity}
                </span>
              </div>
              <p className="text-sm text-[#1C1917] leading-relaxed">{alert.message}</p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
