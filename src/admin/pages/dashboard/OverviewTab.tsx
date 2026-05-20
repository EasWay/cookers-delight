import React, { useEffect, useState } from 'react';
import {
  HiClipboardDocumentList,
  HiCurrencyDollar,
  HiQrCode,
  HiClock,
} from 'react-icons/hi2';
import { dashboardApi } from '../../api';
import { Badge, Card, StatCard, Spinner } from '../../components/ui';
import { STATUS_COLORS, formatRevenue, getStatusLabel, getTableLabel, timeAgo } from '../Dashboard';

interface DashboardStats {
  orders_today:    number;
  revenue_today:   number | string;
  tables_occupied: number;
  pending_orders:  number;
}

interface OrderMenu {
  name:     string;
  quantity: number;
  price:    number | string;
}

interface Order {
  order_id:      number;
  order_total:   number | string;
  order_status?: string;
  status_name?:  string;
  order_type?:   string;
  created_at:    string;
  status_id?:    number;
  order_menus?:  OrderMenu[];
  order_options?: string | Record<string, unknown>;
}

export default function OverviewTab() {
  const [stats, setStats]             = useState<DashboardStats | null>(null);
  const [statsError, setStatsError]   = useState<string | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [orders, setOrders]               = useState<Order[]>([]);
  const [ordersError, setOrdersError]     = useState<string | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(true);

  function fetchStats() {
    dashboardApi
      .stats()
      .then(res => {
        const payload = res.data?.data ?? res.data;
        setStats(payload as DashboardStats);
        setStatsError(null);
      })
      .catch(() => setStatsError('Failed to load stats'))
      .finally(() => setStatsLoading(false));
  }

  function fetchOrders() {
    dashboardApi
      .recentOrders(10)
      .then(res => {
        const payload = res.data?.data ?? res.data;
        const list: Order[] = Array.isArray(payload)
          ? payload
          : payload?.data ?? [];
        setOrders(list);
        setOrdersError(null);
      })
      .catch(() => setOrdersError('Failed to load recent orders'))
      .finally(() => setOrdersLoading(false));
  }

  useEffect(() => {
    fetchStats();
    fetchOrders();
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      fetchStats();
      fetchOrders();
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-5 lg:space-y-7">
      {/* Stats row */}
      {statsError ? (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-red-400 text-sm">
          {statsError}
        </div>
      ) : statsLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 lg:gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-4 sm:p-5 lg:p-6 h-20 sm:h-24 flex items-center justify-center">
              <Spinner size={22} />
            </Card>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 lg:gap-4">
          <StatCard
            label="Orders Today"
            value={stats.orders_today ?? 0}
            icon={<HiClipboardDocumentList size={18} />}
            color="#EC4824"
          />
          <StatCard
            label="Revenue Today"
            value={formatRevenue(stats.revenue_today ?? 0)}
            icon={<HiCurrencyDollar size={18} />}
            color="#22c55e"
          />
          <StatCard
            label="Tables Occupied"
            value={stats.tables_occupied ?? 0}
            icon={<HiQrCode size={18} />}
            color="#a855f7"
          />
          <StatCard
            label="Pending Orders"
            value={stats.pending_orders ?? 0}
            icon={<HiClock size={18} />}
            color="#eab308"
          />
        </div>
      ) : null}

      {/* Recent orders */}
      <Card>
        <div className="px-4 sm:px-5 lg:px-6 py-3 sm:py-4 border-b border-white/[0.06] flex items-center justify-between">
          <h2 className="font-bold text-sm sm:text-base">Recent Orders</h2>
          <span className="text-[10px] sm:text-xs text-white/30">Last 10</span>
        </div>

        {ordersError ? (
          <div className="px-4 sm:px-6 py-5 text-red-400 text-sm">{ordersError}</div>
        ) : ordersLoading ? (
          <div className="flex items-center justify-center py-16 sm:py-20">
            <Spinner size={28} />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex items-center justify-center py-16 sm:py-20 text-white/30 text-sm">
            No orders yet today.
          </div>
        ) : (
          <>
            {/* Mobile / tablet: stacked cards */}
            <ul className="md:hidden divide-y divide-white/[0.05]">
              {orders.map((order) => {
                const statusLabel = getStatusLabel(order);
                const statusColor = STATUS_COLORS[statusLabel] ?? '#6b7280';
                return (
                  <li key={order.order_id} className="px-4 py-3 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center justify-between gap-3 min-w-0">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[13px] font-bold text-white/85">
                            #{order.order_id}
                          </span>
                          <Badge color={statusColor}>{statusLabel}</Badge>
                        </div>
                        <p className="text-[11px] text-white/45 mt-0.5 truncate">
                          {getTableLabel(order)} · {order.order_menus?.length ?? 0} items
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-white tabular-nums truncate">
                          {formatRevenue(order.order_total ?? 0)}
                        </p>
                        <p className="text-[10px] text-white/35 mt-0.5">
                          {timeAgo(order.created_at)}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Desktop: table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-white/30 text-[11px] uppercase tracking-widest font-bold">
                    <th className="px-5 lg:px-6 py-3 text-left">Order #</th>
                    <th className="px-5 lg:px-6 py-3 text-left">Table / Type</th>
                    <th className="px-5 lg:px-6 py-3 text-left">Items</th>
                    <th className="px-5 lg:px-6 py-3 text-left">Total</th>
                    <th className="px-5 lg:px-6 py-3 text-left">Status</th>
                    <th className="px-5 lg:px-6 py-3 text-left">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const statusLabel = getStatusLabel(order);
                    const statusColor = STATUS_COLORS[statusLabel] ?? '#6b7280';
                    return (
                      <tr
                        key={order.order_id}
                        className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors"
                      >
                        <td className="px-5 lg:px-6 py-3 font-mono text-white/80 font-bold">
                          #{order.order_id}
                        </td>
                        <td className="px-5 lg:px-6 py-3 text-white/70">{getTableLabel(order)}</td>
                        <td className="px-5 lg:px-6 py-3 text-white/60">{order.order_menus?.length ?? 0}</td>
                        <td className="px-5 lg:px-6 py-3 text-white font-bold tabular-nums">
                          {formatRevenue(order.order_total ?? 0)}
                        </td>
                        <td className="px-5 lg:px-6 py-3">
                          <Badge color={statusColor}>{statusLabel}</Badge>
                        </td>
                        <td className="px-5 lg:px-6 py-3 text-white/40 text-xs">
                          {timeAgo(order.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
