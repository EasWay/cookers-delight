import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface KitchenOrder {
  id:            number;
  order_type:    'dine-in' | 'collection' | null;
  table_number:  string | null;
  customer_name: string;
  status:        'received' | 'preparing' | 'ready' | 'served' | 'pending';
  total:         string;
  comment:       string;
  created_at:    string;
  items:         { name: string; quantity: number; price: number }[];
  ghost:         boolean;
}

// ── Utilities ──────────────────────────────────────────────────────────────

function playAlert() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    [0, 0.35].forEach(delay => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + delay + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 0.45);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.5);
    });
  } catch { /* AudioContext blocked — silent fail */ }
}

// ── ElapsedTimer ───────────────────────────────────────────────────────────

function ElapsedTimer({ createdAt }: { createdAt: string }) {
  const [elapsed, setElapsed] = useState({ label: '00:00', mins: 0 });

  useEffect(() => {
    function tick() {
      const secs = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
      const m    = Math.floor(Math.max(secs, 0) / 60);
      const s    = Math.max(secs, 0) % 60;
      setElapsed({ label: `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`, mins: m });
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [createdAt]);

  const color =
    elapsed.mins < 10 ? '#22c55e'
    : elapsed.mins < 20 ? '#D97706'
    : '#ef4444';

  return (
    <span className="font-mono text-xs font-bold" style={{ color }}>
      ⏱ {elapsed.label}
    </span>
  );
}

// ── OrderCard ──────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  received:  '#D97706',
  preparing: '#6366F1',
  ready:     '#16A34A',
  served:    'rgba(91,113,107,0.5)',
  pending:   'rgba(245,240,232,0.08)',
};

const HEADER_BG: Record<string, string> = {
  received:  '#D97706',
  preparing: '#6366F1',
  ready:     '#16A34A',
  served:    '#374151',
  pending:   '#374151',
};

const STATUS_BUTTONS = [
  { key: 'received',  label: 'Received'  },
  { key: 'preparing', label: 'Preparing' },
  { key: 'ready',     label: 'Ready'     },
  { key: 'served',    label: 'Served'    },
] as const;

function OrderCard({
  order,
  updating,
  onStatus,
  checkedItems,
  onToggleCheck,
}: {
  order:         KitchenOrder;
  updating:      boolean;
  onStatus:      (id: number, status: string) => void;
  checkedItems:  Set<number>;
  onToggleCheck: (orderId: number, idx: number) => void;
}) {
  const headerBg = HEADER_BG[order.status] ?? '#374151';

  const primaryAction =
    order.status === 'received'  ? { label: 'Start',  next: 'preparing' } :
    order.status === 'preparing' ? { label: 'Finish', next: 'ready'     } :
    order.status === 'ready'     ? { label: 'Served', next: 'served'    } :
    null;

  return (
    <div
      className="rounded-2xl overflow-hidden relative select-none"
      style={{
        backgroundColor: 'var(--cd-surface)',
        border:          '1px solid var(--cd-card-border)',
        opacity:         order.ghost ? 0.35 : 1,
        boxShadow:       '0 2px 12px rgba(0,0,0,0.3)',
      }}
    >
      {/* Spinner overlay during status update */}
      {updating && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl"
          style={{ backgroundColor: 'rgba(13,27,13,0.75)' }}
        >
          <div
            className="w-7 h-7 rounded-full border-2 animate-spin"
            style={{ borderColor: 'rgba(255,255,255,0.15)', borderTopColor: headerBg }}
          />
        </div>
      )}

      {/* ── Coloured header strip ─────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-3.5 py-2.5 gap-2"
        style={{ backgroundColor: headerBg }}
      >
        {/* Left: order # + timer */}
        <div className="flex items-center gap-2.5">
          <span className="font-black text-white text-base leading-none">
            #{order.id}
          </span>
          {order.created_at && (
            <ElapsedTimer createdAt={order.created_at} />
          )}
        </div>

        {/* Right: table badge + priority button */}
        <div className="flex items-center gap-2">
          {order.table_number && (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white"
              style={{
                backgroundColor: 'rgba(255,255,255,0.22)',
                border:          '1.5px solid rgba(255,255,255,0.35)',
              }}
            >
              T{order.table_number}
            </div>
          )}
          <button
            onClick={() => onStatus(order.id, 'preparing')}
            disabled={order.status !== 'received' || updating}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white transition-opacity"
            style={{
              backgroundColor: 'rgba(255,255,255,0.18)',
              opacity:         order.status !== 'received' ? 0.3 : 1,
            }}
            title="Start preparing"
          >
            ▲
          </button>
        </div>
      </div>

      {/* ── Customer name + total ─────────────────────────────────────── */}
      <div className="px-3.5 pt-2.5 pb-1 flex items-center justify-between">
        <span className="text-xs font-semibold" style={{ color: 'var(--cd-muted)' }}>
          {order.order_type === 'collection' ? '📦 ' : '🍽️ '}
          {order.customer_name || 'Guest'}
        </span>
        <span className="text-xs font-bold" style={{ color: 'var(--cd-amber)' }}>
          GHS {order.total}
        </span>
      </div>

      <div className="h-px mx-3.5" style={{ backgroundColor: 'var(--cd-border)' }} />

      {/* ── Items with checkboxes ─────────────────────────────────────── */}
      <div className="px-3.5 py-2.5 space-y-2">
        {order.items.length === 0 && (
          <p className="text-xs italic" style={{ color: 'var(--cd-muted)' }}>
            No item details available
          </p>
        )}
        {order.items.map((item, idx) => {
          const done = checkedItems.has(idx);
          return (
            <div
              key={idx}
              className="flex items-start gap-2.5 cursor-pointer"
              onClick={() => onToggleCheck(order.id, idx)}
            >
              {/* Checkbox */}
              <div
                className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center mt-0.5 transition-all"
                style={{
                  backgroundColor: done ? 'var(--cd-primary)' : 'transparent',
                  border:          done ? 'none' : '1.5px solid var(--cd-muted)',
                }}
              >
                {done && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path
                      d="M1 4L4 7L9 1"
                      stroke="white"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>

              {/* Item info */}
              <div className="flex-1 min-w-0" style={{ opacity: done ? 0.4 : 1 }}>
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className="text-sm font-semibold leading-tight"
                    style={{
                      color:          'var(--cd-text)',
                      textDecoration: done ? 'line-through' : 'none',
                    }}
                  >
                    {item.name}
                  </span>
                  <span
                    className="text-xs font-bold flex-shrink-0"
                    style={{ color: 'var(--cd-amber)' }}
                  >
                    {item.quantity}×
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comment */}
      {order.comment && (
        <div
          className="px-3.5 pb-2 text-xs italic"
          style={{ color: 'var(--cd-muted)', borderTop: '1px solid var(--cd-border)', paddingTop: 6 }}
        >
          📝 {order.comment}
        </div>
      )}

      {/* Ghost label */}
      {order.ghost && (
        <div className="px-3.5 pb-3 text-xs italic" style={{ color: 'var(--cd-muted)' }}>
          Abandoned — payment not completed
        </div>
      )}

      {/* ── Footer: print icon + primary action ──────────────────────── */}
      {!order.ghost && (
        <div
          className="flex items-center justify-between px-3.5 py-2.5 gap-2"
          style={{ borderTop: '1px solid var(--cd-border)' }}
        >
          <button
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ color: 'var(--cd-muted)', backgroundColor: 'var(--cd-surface-2)' }}
            title="Print receipt"
          >
            🖨️
          </button>

          {primaryAction ? (
            <button
              onClick={() => !updating && onStatus(order.id, primaryAction.next)}
              disabled={updating}
              className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95"
              style={{
                backgroundColor: headerBg,
                color:           '#fff',
                opacity:         updating ? 0.5 : 1,
              }}
            >
              {primaryAction.label}
            </button>
          ) : (
            <div
              className="flex-1 py-2.5 rounded-xl text-center text-xs font-bold uppercase tracking-wider"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: 'var(--cd-muted)' }}
            >
              Complete ✓
            </div>
          )}
        </div>
      )}

      {/* ── Override status pills ─────────────────────────────────────── */}
      {!order.ghost && (
        <div className="flex gap-1 px-3.5 pb-3">
          {STATUS_BUTTONS.map(({ key, label }) => {
            const isActive = order.status === key;
            return (
              <button
                key={key}
                onClick={() => !updating && onStatus(order.id, key)}
                disabled={updating}
                className="flex-1 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                style={{
                  backgroundColor: isActive ? HEADER_BG[key] + '30' : 'transparent',
                  color:           isActive ? HEADER_BG[key] : 'var(--cd-muted)',
                  border:          `1px solid ${isActive ? HEADER_BG[key] + '60' : 'var(--cd-border)'}`,
                  opacity:         updating ? 0.5 : 1,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Column empty state ─────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 opacity-40">
      <span className="text-4xl">📋</span>
      <p className="text-sm" style={{ color: 'var(--cd-muted)' }}>
        No orders yet
      </p>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

type KitchenFilter = 'all' | 'new' | 'processing' | 'done';

export default function KitchenPage() {
  const navigate = useNavigate();
  const pin      = localStorage.getItem('cd_kitchen_pin') ?? '';

  const [orders,    setOrders]    = useState<KitchenOrder[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [pollError, setPollError] = useState(false);
  const [newAlert,  setNewAlert]  = useState(false);
  const [updating,  setUpdating]  = useState<Record<number, boolean>>({});
  const [clock,     setClock]     = useState('');
  const [filter,    setFilter]    = useState<KitchenFilter>('all');
  const [checked,   setChecked]   = useState<Record<number, Set<number>>>({});

  const lastOrderIdRef = useRef(0);
  const intervalRef    = useRef<ReturnType<typeof setInterval>>();

  function toggleCheck(orderId: number, itemIndex: number) {
    setChecked(prev => {
      const set = new Set(prev[orderId] ?? []);
      set.has(itemIndex) ? set.delete(itemIndex) : set.add(itemIndex);
      return { ...prev, [orderId]: set };
    });
  }

  function applyFilter(list: KitchenOrder[]): KitchenOrder[] {
    switch (filter) {
      case 'new':        return list.filter(o => ['received', 'pending'].includes(o.status));
      case 'processing': return list.filter(o => o.status === 'preparing');
      case 'done':       return list.filter(o => ['ready', 'served'].includes(o.status));
      default:           return list;
    }
  }

  // Auth guard
  useEffect(() => {
    if (!pin) {
      navigate('/kitchen', { replace: true });
    }
  }, []);

  // Clock + polling
  useEffect(() => {
    if (!pin) return;

    function updateClock() {
      setClock(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }

    updateClock();
    const clockTick = setInterval(updateClock, 1000);

    fetchOrders();
    intervalRef.current = setInterval(fetchOrders, 5000);

    return () => {
      clearInterval(clockTick);
      clearInterval(intervalRef.current!);
    };
  }, []);

  async function fetchOrders() {
    try {
      const res = await fetch('/api/kitchen/orders', {
        headers: { 'X-Kitchen-Pin': pin, 'Accept': 'application/json' },
      });
      setPollError(false);

      if (res.status === 401) {
        localStorage.removeItem('cd_kitchen_pin');
        navigate('/kitchen', { replace: true });
        return;
      }
      if (!res.ok) return;

      const data = await res.json();
      const incoming: KitchenOrder[] = data.orders ?? [];
      const maxId = incoming.length ? Math.max(...incoming.map(o => o.id)) : 0;

      if (lastOrderIdRef.current > 0 && maxId > lastOrderIdRef.current) {
        setNewAlert(true);
        playAlert();
        setTimeout(() => setNewAlert(false), 4000);
      }
      lastOrderIdRef.current = Math.max(lastOrderIdRef.current, maxId);
      setOrders(incoming);
      setLoading(false);
    } catch {
      setPollError(true);
    }
  }

  async function updateStatus(orderId: number, status: string) {
    setOrders(prev =>
      prev.map(o => o.id === orderId ? { ...o, status: status as KitchenOrder['status'] } : o)
    );
    setUpdating(prev => ({ ...prev, [orderId]: true }));

    try {
      const res = await fetch(`/api/kitchen/orders/${orderId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'X-Kitchen-Pin': pin,
          'Accept':        'application/json',
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        await fetchOrders();
      }
    } catch {
      await fetchOrders();
    } finally {
      setUpdating(prev => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
    }
  }

  function logout() {
    localStorage.removeItem('cd_kitchen_pin');
    navigate('/kitchen', { replace: true });
  }

  const allDineIn     = orders.filter(o => o.order_type !== 'collection');
  const allCollection = orders.filter(o => o.order_type === 'collection');

  const dineInOrders     = applyFilter(allDineIn);
  const collectionOrders = applyFilter(allCollection);

  const filterTabs: { id: KitchenFilter; label: string }[] = [
    { id: 'all',        label: 'All Order'   },
    { id: 'new',        label: 'New'         },
    { id: 'processing', label: 'In Progress' },
    { id: 'done',       label: 'Done'        },
  ];

  function tabCount(id: KitchenFilter): number {
    switch (id) {
      case 'new':        return orders.filter(o => ['received', 'pending'].includes(o.status)).length;
      case 'processing': return orders.filter(o => o.status === 'preparing').length;
      case 'done':       return orders.filter(o => ['ready', 'served'].includes(o.status)).length;
      default:           return orders.length;
    }
  }

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{ backgroundColor: 'var(--cd-bg)', color: 'var(--cd-text)' }}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--cd-border)', backgroundColor: 'var(--cd-surface)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black text-white"
            style={{ background: 'linear-gradient(135deg, #D97706, #f59e0b)' }}
          >
            🍽️
          </div>
          <div>
            <p className="text-sm font-black" style={{ color: 'var(--cd-text)', fontFamily: 'var(--font-display)' }}>
              Kitchen Display
            </p>
            <p className="text-[10px] font-semibold" style={{ color: 'var(--cd-muted)' }}>
              Cookers Delight · {clock}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white"
              style={{ background: 'linear-gradient(135deg, #1B5E20, #22c55e)' }}
            >
              KS
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-bold" style={{ color: 'var(--cd-text)' }}>Kitchen Staff</p>
              <p className="text-[10px]" style={{ color: 'var(--cd-muted)' }}>Kitchen</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="text-[10px] px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider"
            style={{
              backgroundColor: 'var(--cd-surface-2)',
              color:           'var(--cd-muted)',
              border:          '1px solid var(--cd-border)',
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Connection error banner */}
      {pollError && (
        <div
          className="text-center py-2 px-4 text-xs font-semibold tracking-wide flex-shrink-0"
          style={{ backgroundColor: '#DC2626', color: '#fff' }}
        >
          ⚠️ Connection to order system lost — retrying…
        </div>
      )}

      {/* New order alert banner */}
      {newAlert && (
        <div
          className="text-center py-2 px-4 text-sm font-semibold tracking-wide flex-shrink-0"
          style={{
            backgroundColor: 'rgba(217,119,6,0.2)',
            color:           'var(--cd-amber)',
            borderBottom:    '1px solid rgba(217,119,6,0.3)',
          }}
        >
          🔔 New Order! Check the kitchen display
        </div>
      )}

      {/* ── Status filter tabs ───────────────────────────────────────────── */}
      <div
        className="flex items-center gap-1.5 px-4 py-2.5 flex-shrink-0 overflow-x-auto"
        style={{ borderBottom: '1px solid var(--cd-border)', scrollbarWidth: 'none' }}
      >
        {filterTabs.map(tab => {
          const count    = tabCount(tab.id);
          const isActive = filter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all"
              style={{
                backgroundColor: isActive ? 'var(--cd-amber)' : 'var(--cd-surface-2)',
                color:           isActive ? '#0D1B0D' : 'var(--cd-muted)',
              }}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
                  style={{
                    backgroundColor: isActive ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.08)',
                    color:           isActive ? '#0D1B0D' : 'var(--cd-text)',
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}

        <button
          className="ml-auto flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
          style={{ backgroundColor: 'var(--cd-surface-2)', color: 'var(--cd-muted)' }}
        >
          ⚙ Filter
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex-1 flex items-center justify-center opacity-40">
          <div
            className="w-10 h-10 rounded-full border-2 animate-spin"
            style={{ borderColor: 'rgba(217,119,6,0.2)', borderTopColor: 'var(--cd-amber)' }}
          />
        </div>
      )}

      {/* ── Two-column layout ────────────────────────────────────────────── */}
      {!loading && (
        <main className="flex-1 flex overflow-hidden" style={{ minHeight: 0 }}>

          {/* Dine-in column */}
          <div
            className="flex-1 overflow-y-auto p-4"
            style={{ borderRight: '1px solid var(--cd-border)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <span>🍽️</span>
              <span
                className="text-xs uppercase tracking-widest font-semibold"
                style={{ color: 'var(--cd-muted)' }}
              >
                Dine-in · {dineInOrders.length} order{dineInOrders.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="space-y-4">
              {dineInOrders.length === 0 && <EmptyState />}
              {dineInOrders.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  updating={!!updating[order.id]}
                  onStatus={updateStatus}
                  checkedItems={checked[order.id] ?? new Set()}
                  onToggleCheck={toggleCheck}
                />
              ))}
            </div>
          </div>

          {/* Pre-arrival / collection column */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center gap-2 mb-4">
              <span>📦</span>
              <span
                className="text-xs uppercase tracking-widest font-semibold"
                style={{ color: 'var(--cd-muted)' }}
              >
                Pre-arrival · {collectionOrders.length} order{collectionOrders.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="space-y-4">
              {collectionOrders.length === 0 && <EmptyState />}
              {collectionOrders.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  updating={!!updating[order.id]}
                  onStatus={updateStatus}
                  checkedItems={checked[order.id] ?? new Set()}
                  onToggleCheck={toggleCheck}
                />
              ))}
            </div>
          </div>

        </main>
      )}
    </div>
  );
}
