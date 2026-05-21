import React, { useEffect, useState, useCallback } from 'react';
import { HiClipboardDocumentList, HiChevronLeft, HiChevronRight, HiMagnifyingGlass } from 'react-icons/hi2';
import { ordersApi, statusesApi } from '../api';
import { Badge, Card, Spinner, EmptyState, Modal, inputClass, selectClass } from '../components/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderMenu {
  name: string;
  quantity: number;
  price: number | string;
}

interface Order {
  order_id: number;
  order_total: number | string;
  order_status?: string;
  status_name?: string;
  order_type?: string;
  created_at: string;
  status_id?: number;
  order_menus?: OrderMenu[];
  order_options?: string | Record<string, unknown>;
}

interface OrderStatus {
  status_id: number;
  status_name: string;
}

interface OrderOptions {
  table_number?: string | number;
  location_name?: string;
  [key: string]: unknown;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
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

const PAGE_SIZE = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRevenue(value: number | string): string {
  if (typeof value === 'number') return `GH₵${value.toFixed(2)}`;
  const num = parseFloat(String(value));
  if (!isNaN(num)) return `GH₵${num.toFixed(2)}`;
  return `GH₵${value}`;
}

function getStatusLabel(order: Order): string {
  return order.order_status ?? order.status_name ?? 'Unknown';
}

function parseOrderOptions(raw: string | Record<string, unknown> | undefined): OrderOptions {
  if (!raw) return {};
  if (typeof raw === 'object') return raw as OrderOptions;
  try {
    return JSON.parse(raw) as OrderOptions;
  } catch {
    return {};
  }
}

function getTableLabel(order: Order): string {
  const opts = parseOrderOptions(order.order_options);
  if (opts.table_number) return `Table ${opts.table_number}`;
  if (opts.location_name) return String(opts.location_name);
  return order.order_type ?? '—';
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return new Date(dateStr).toLocaleDateString();
}

function todayString(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// ─── Order detail modal ───────────────────────────────────────────────────────

interface OrderDetailModalProps {
  order: Order | null;
  statuses: OrderStatus[];
  onClose: () => void;
  onStatusChange: (orderId: number, statusId: number) => Promise<void>;
}

function OrderDetailModal({ order, statuses, onClose, onStatusChange }: OrderDetailModalProps) {
  const [updating, setUpdating] = useState(false);
  const [selectedStatusId, setSelectedStatusId] = useState<number | ''>(order?.status_id ?? '');

  useEffect(() => {
    setSelectedStatusId(order?.status_id ?? '');
  }, [order?.status_id]);

  if (!order) return null;

  const statusLabel = getStatusLabel(order);
  const statusColor = STATUS_COLORS[statusLabel] ?? '#6b7280';
  const opts = parseOrderOptions(order.order_options);

  async function handleStatusUpdate() {
    if (!order || selectedStatusId === '') return;
    setUpdating(true);
    try {
      await onStatusChange(order.order_id, Number(selectedStatusId));
    } finally {
      setUpdating(false);
    }
  }

  return (
    <Modal open={!!order} onClose={onClose} title={`Order #${order.order_id}`} size="lg">
      <div className="space-y-6">
        {/* Order header */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-[#A8A29E] text-xs uppercase tracking-widest font-bold mb-1">Order</p>
            <p className="text-[#1C1917] font-bold">#{order.order_id}</p>
          </div>
          <div>
            <p className="text-[#A8A29E] text-xs uppercase tracking-widest font-bold mb-1">Table / Type</p>
            <p className="text-[#78716C]">{getTableLabel(order)}</p>
          </div>
          <div>
            <p className="text-[#A8A29E] text-xs uppercase tracking-widest font-bold mb-1">Total</p>
            <p className="text-[#1C1917] font-bold">{formatRevenue(order.order_total ?? 0)}</p>
          </div>
          <div>
            <p className="text-[#A8A29E] text-xs uppercase tracking-widest font-bold mb-1">Time</p>
            <p className="text-[#78716C] text-sm">{timeAgo(order.created_at)}</p>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-3">
          <span className="text-[#A8A29E] text-xs uppercase tracking-widest font-bold">Status:</span>
          <Badge color={statusColor}>{statusLabel}</Badge>
        </div>

        {/* Location info from order_options */}
        {(opts.table_number || opts.location_name) && (
          <div className="bg-[#FAFAF9] border border-[#EDE8E3] rounded-xl px-4 py-3 space-y-1">
            {opts.table_number && (
              <p className="text-xs text-[#78716C]">
                <span className="text-[#A8A29E] uppercase tracking-widest font-bold mr-2">Table:</span>
                {String(opts.table_number)}
              </p>
            )}
            {opts.location_name && (
              <p className="text-xs text-[#78716C]">
                <span className="text-[#A8A29E] uppercase tracking-widest font-bold mr-2">Location:</span>
                {String(opts.location_name)}
              </p>
            )}
          </div>
        )}

        {/* Items */}
        {order.order_menus && order.order_menus.length > 0 && (
          <div>
            <p className="text-[#A8A29E] text-xs uppercase tracking-widest font-bold mb-3">Items</p>
            <div className="space-y-2">
              {order.order_menus.map((item, idx) => {
                const unitPrice = typeof item.price === 'number' ? item.price : parseFloat(String(item.price)) || 0;
                const subtotal = unitPrice * item.quantity;
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-4 py-3 bg-[#FAFAF9] border border-[#EDE8E3] rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[#A8A29E] text-xs font-bold w-5 text-center">×{item.quantity}</span>
                      <span className="text-[#1C1917] text-sm">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-[#78716C] text-xs">{formatRevenue(unitPrice)} ea</p>
                      <p className="text-[#1C1917] font-bold text-sm">{formatRevenue(subtotal)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Status change */}
        {statuses.length > 0 && (
          <div>
            <p className="text-[#A8A29E] text-xs uppercase tracking-widest font-bold mb-2">Update Status</p>
            <div className="flex gap-3">
              <select
                value={selectedStatusId}
                onChange={e => setSelectedStatusId(Number(e.target.value))}
                className={selectClass + ' flex-1'}
              >
                <option value="">Select status…</option>
                {statuses.map(s => (
                  <option key={s.status_id} value={s.status_id}>
                    {s.status_name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleStatusUpdate}
                disabled={updating || selectedStatusId === '' || selectedStatusId === order.status_id}
                className="px-5 py-2.5 text-sm font-bold bg-[#EC4824] text-white rounded-xl hover:bg-[#d4401f] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              >
                {updating ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statuses, setStatuses] = useState<OrderStatus[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState(todayString());
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Load statuses once
  useEffect(() => {
    statusesApi
      .list()
      .then(res => {
        const payload = res.data?.data ?? res.data;
        const list: OrderStatus[] = Array.isArray(payload)
          ? payload
          : payload?.data ?? [];
        setStatuses(list);
      })
      .catch(() => {/* statuses are optional for filtering */});
  }, []);

  const fetchOrders = useCallback(() => {
    const params: Record<string, string | number> = {
      pageLimit: 200,
      sort: 'created_at desc',
    };
    if (statusFilter) params['filter[status_name]'] = statusFilter;

    ordersApi
      .list(params)
      .then(res => {
        const payload = res.data?.data ?? res.data;
        const list: Order[] = Array.isArray(payload)
          ? payload
          : payload?.data ?? [];
        setOrders(list);
        setError(null);
      })
      .catch(() => setError('Failed to load orders. Please try again.'))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    fetchOrders();
  }, [fetchOrders]);

  // Poll every 30s
  useEffect(() => {
    const id = setInterval(fetchOrders, 30_000);
    return () => clearInterval(id);
  }, [fetchOrders]);

  // Client-side filtering
  const filtered = orders.filter(order => {
    if (dateFilter) {
      const orderDate = order.created_at?.slice(0, 10);
      if (orderDate !== dateFilter) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      const idMatch = String(order.order_id).includes(q);
      const tableMatch = getTableLabel(order).toLowerCase().includes(q);
      if (!idMatch && !tableMatch) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageSlice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  async function handleStatusChange(orderId: number, statusId: number) {
    setUpdatingId(orderId);
    try {
      await ordersApi.updateStatus(orderId, statusId);
      // Optimistically update local state
      setOrders(prev =>
        prev.map(o => {
          if (o.order_id !== orderId) return o;
          const matchedStatus = statuses.find(s => s.status_id === statusId);
          return {
            ...o,
            status_id: statusId,
            order_status: matchedStatus?.status_name ?? o.order_status,
            status_name: matchedStatus?.status_name ?? o.status_name,
          };
        })
      );
      if (selectedOrder?.order_id === orderId) {
        const matchedStatus = statuses.find(s => s.status_id === statusId);
        setSelectedOrder(prev =>
          prev
            ? {
                ...prev,
                status_id: statusId,
                order_status: matchedStatus?.status_name ?? prev.order_status,
                status_name: matchedStatus?.status_name ?? prev.status_name,
              }
            : prev
        );
      }
    } catch {
      // Refresh to reconcile on failure
      fetchOrders();
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-black text-[#1C1917]">Orders</h1>
        <p className="text-[#A8A29E] text-sm mt-0.5">Manage and track all orders</p>
      </div>

      {/* Filter bar */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className={selectClass + ' w-44'}
          >
            <option value="">All Statuses</option>
            {statuses.length > 0
              ? statuses.map(s => (
                  <option key={s.status_id} value={s.status_name}>
                    {s.status_name}
                  </option>
                ))
              : (
                <>
                  <option value="Pending">Pending</option>
                  <option value="Preparing">Preparing</option>
                  <option value="Ready">Ready</option>
                  <option value="Served">Served</option>
                </>
              )
            }
          </select>

          {/* Date picker */}
          <input
            type="date"
            value={dateFilter}
            onChange={e => { setDateFilter(e.target.value); setPage(1); }}
            className={inputClass + ' w-44'}
          />

          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <HiMagnifyingGlass
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Order # or table…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className={inputClass + ' pl-9'}
            />
          </div>

          <span className="text-[#A8A29E] text-xs ml-auto">
            {filtered.length} order{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </Card>

      {/* Table */}
      <Card>
        {error ? (
          <div className="px-6 py-5 text-red-400 text-sm">{error}</div>
        ) : loading ? (
          <div className="flex items-center justify-center py-24">
            <Spinner size={36} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<HiClipboardDocumentList size={56} />}
            title="No orders found"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #F5EFE8' }}>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-[#A8A29E] uppercase tracking-widest">Order #</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-[#A8A29E] uppercase tracking-widest">Table / Type</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-[#A8A29E] uppercase tracking-widest">Items</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-[#A8A29E] uppercase tracking-widest">Total</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-[#A8A29E] uppercase tracking-widest">Status</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-[#A8A29E] uppercase tracking-widest">Time</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-[#A8A29E] uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageSlice.map(order => {
                  const statusLabel = getStatusLabel(order);
                  const statusColor = STATUS_COLORS[statusLabel] ?? '#6b7280';
                  return (
                    <tr
                      key={order.order_id}
                      className="hover:bg-[#FAFAF9] transition-colors cursor-pointer"
                      style={{ borderBottom: '1px solid #F5EFE8' }}
                      onClick={() => setSelectedOrder(order)}
                    >
                      <td className="px-5 py-3.5 font-mono text-sm font-bold text-[#1C1917]">
                        #{order.order_id}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-[#78716C]">
                        {getTableLabel(order)}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-[#78716C]">
                        {order.order_menus?.length ?? 0}
                      </td>
                      <td className="px-5 py-3.5 text-sm font-bold text-[#1C1917]">
                        {formatRevenue(order.order_total ?? 0)}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge color={statusColor}>{statusLabel}</Badge>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-[#A8A29E]">
                        {timeAgo(order.created_at)}
                      </td>
                      <td
                        className="px-5 py-3.5"
                        onClick={e => e.stopPropagation()}
                      >
                        {statuses.length > 0 ? (
                          <select
                            value={order.status_id ?? ''}
                            onChange={e => handleStatusChange(order.order_id, Number(e.target.value))}
                            disabled={updatingId === order.order_id}
                            className="bg-[#FAFAFA] border border-[#EDE8E3] rounded-lg px-2.5 py-1.5 text-[#1C1917] text-xs focus:border-[#EC4824] focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-wait"
                          >
                            <option value="">Change…</option>
                            {statuses.map(s => (
                              <option key={s.status_id} value={s.status_id}>
                                {s.status_name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-[#A8A29E] text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4" style={{ borderTop: '1px solid #EDE8E3' }}>
            <span className="text-[#A8A29E] text-xs">
              Page {safePage} of {totalPages} &mdash; {filtered.length} orders
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#EDE8E3] text-[#78716C] hover:text-[#1C1917] hover:border-[#A8A29E] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <HiChevronLeft size={16} />
              </button>

              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let p: number;
                if (totalPages <= 7) {
                  p = i + 1;
                } else if (safePage <= 4) {
                  p = i + 1;
                } else if (safePage >= totalPages - 3) {
                  p = totalPages - 6 + i;
                } else {
                  p = safePage - 3 + i;
                }
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                      p === safePage
                        ? 'bg-[#EC4824] text-white'
                        : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#F5EFE8]'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#EDE8E3] text-[#78716C] hover:text-[#1C1917] hover:border-[#A8A29E] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <HiChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Order detail modal */}
      <OrderDetailModal
        order={selectedOrder}
        statuses={statuses}
        onClose={() => setSelectedOrder(null)}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
