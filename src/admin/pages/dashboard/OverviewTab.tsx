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
  order_id:       number;
  order_total:    number | string;
  order_status?:  string;
  status_name?:   string;
  order_type?:    string;
  created_at:     string;
  status_id?:     number;
  order_menus?:   OrderMenu[];
  order_options?: string | Record<string, unknown>;
}

export default function OverviewTab() {
  const [stats, setStats]               = useState<DashboardStats | null>(null);
  const [statsError, setStatsError]     = useState<string | null>(null);
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
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-600 text-sm">
          {statsError}
        </div>
      ) : statsLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl p-4 sm:p-5 h-24 flex items-center justify-center bg-white"
              style={{ border: '1px solid #EDE8E3' }}
            >
              <Spinner size={22} />
            </div>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <StatCard
            label="Orders Today"
            value={stats.orders_today ?? 0}
            icon={<HiClipboardDocumentList size={18} />}
            color="#3b82f6"
            tint="#EFF6FF"
          />
          <StatCard
            label="Revenue Today"
            value={formatRevenue(stats.revenue_today ?? 0)}
            icon={<HiCurrencyDollar size={18} />}
            color="#22c55e"
            tint="#F0FDF4"
          />
          <StatCard
            label="Tables Occupied"
            value={stats.tables_occupied ?? 0}
            icon={<HiQrCode size={18} />}
            color="#d97706"
            tint="#FFFBEB"
          />
          <StatCard
            label="Pending Orders"
            value={stats.pending_orders ?? 0}
            icon={<HiClock size={18} />}
            color="#EC4824"
            tint="#FFF1EE"
          />
        </div>
      ) : null}

      {/* Recent orders */}
      <Card>
        <div
          className="px-4 sm:px-5 lg:px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid #EDE8E3' }}
        >
          <div>
            <h2 className="font-bold text-base text-[#1C1917]">Recent Orders</h2>
            <p className="text-xs text-[#A8A29E] mt-0.5">Last 10 orders today</p>
          </div>
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: '#FFF1EE', color: '#EC4824' }}
          >
            Live
          </span>
        </div>

        {ordersError ? (
          <div className="px-4 sm:px-6 py-5 text-red-500 text-sm">{ordersError}</div>
        ) : ordersLoading ? (
          <div className="flex items-center justify-center py-16 sm:py-20">
            <Spinner size={28} />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex items-center justify-center py-16 sm:py-20 text-[#A8A29E] text-sm">
            No orders yet today.
          </div>
        ) : (
          <>
            {/* Mobile: stacked cards */}
            <ul className="md:hidden divide-y" style={{ borderColor: '#F5EFE8' }}>
              {orders.map((order) => {
                const statusLabel = getStatusLabel(order);
                const statusColor = STATUS_COLORS[statusLabel] ?? '#78716C';
                return (
                  <li
                    key={order.order_id}
                    className="px-4 py-3 hover:bg-[#FAFAF9] transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3 min-w-0">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[13px] font-bold text-[#1C1917]">
                            #{order.order_id}
                          </span>
                          <Badge color={statusColor}>{statusLabel}</Badge>
                        </div>
                        <p className="text-[11px] text-[#A8A29E] mt-0.5 truncate">
                          {getTableLabel(order)} Â· {order.order_menus?.length ?? 0} items
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-[#1C1917] tabular-nums truncate">
                          {formatRevenue(order.order_total ?? 0)}
                        </p>
                        <p className="text-[10px] text-[#A8A29E] mt-0.5">
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
                  <tr style={{ borderBottom: '1px solid #F5EFE8' }}>
                    <th className="px-5 lg:px-6 py-3 text-left text-[10px] font-bold text-[#A8A29E] uppercase tracking-widest">Order #</th>
                    <th className="px-5 lg:px-6 py-3 text-left text-[10px] font-bold text-[#A8A29E] uppercase tracking-widest">Table / Type</th>
                    <th className="px-5 lg:px-6 py-3 text-left text-[10px] font-bold text-[#A8A29E] uppercase tracking-widest">Items</th>
                    <th className="px-5 lg:px-6 py-3 text-left text-[10px] font-bold text-[#A8A29E] uppercase tracking-widest">Total</th>
                    <th className="px-5 lg:px-6 py-3 text-left text-[10px] font-bold text-[#A8A29E] uppercase tracking-widest">Status</th>
                    <th className="px-5 lg:px-6 py-3 text-left text-[10px] font-bold text-[#A8A29E] uppercase tracking-widest">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const statusLabel = getStatusLabel(order);
                    const statusColor = STATUS_COLORS[statusLabel] ?? '#78716C';
                    return (
                      <tr
                        key={order.order_id}
                        className="hover:bg-[#FAFAF9] transition-colors"
                        style={{ borderBottom: '1px solid #F5EFE8' }}
                      >
                        <td className="px-5 lg:px-6 py-3.5">
                          <span className="font-mono text-sm font-bold text-[#1C1917]">
                            #{order.order_id}
                          </span>
                        </td>
                        <td className="px-5 lg:px-6 py-3.5 text-sm text-[#78716C]">
                          {getTableLabel(order)}
                        </td>
                        <td className="px-5 lg:px-6 py-3.5 text-sm text-[#78716C]">
                          {order.order_menus?.length ?? 0}
                        </td>
                        <td className="px-5 lg:px-6 py-3.5">
                          <span className="text-sm font-bold text-[#1C1917] tabular-nums">
                            {formatRevenue(order.order_total ?? 0)}
                          </span>
                        </td>
                        <td className="px-5 lg:px-6 py-3.5">
                          <Badge color={statusColor}>{statusLabel}</Badge>
                        </td>
                        <td className="px-5 lg:px-6 py-3.5 text-xs text-[#A8A29E]">
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
