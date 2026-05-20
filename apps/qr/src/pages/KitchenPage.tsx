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

function timeAgo(createdAt: string): string {
  if (!createdAt) return '';
  const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
  if (diff < 60)   return diff + 's ago';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  return Math.floor(diff / 3600) + 'h ago';
}

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

// ── OrderCard ──────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  received:  '#D97706',
  preparing: '#6366F1',
  ready:     '#16A34A',
  served:    'rgba(91,113,107,0.5)',
  pending:   'rgba(245,240,232,0.08)',
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
}: {
  order:    KitchenOrder;
  updating: boolean;
  onStatus: (id: number, status: string) => void;
}) {
  const borderColor = STATUS_COLORS[order.status] ?? 'var(--cd-border)';

  return (
    <div
      className="rounded-[18px] overflow-hidden relative"
      style={{
        backgroundColor: 'var(--cd-surface)',
        border:          `2px solid ${borderColor}`,
        opacity:         order.ghost ? 0.3 : 1,
      }}
    >
      {/* Spinner overlay during status update */}
      {updating && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center rounded-[18px]"
          style={{ backgroundColor: 'rgba(13,27,13,0.7)' }}
        >
          <div
            className="w-7 h-7 rounded-full border-2 animate-spin"
            style={{ borderColor: 'rgba(217,119,6,0.3)', borderTopColor: 'var(--cd-amber)' }}
          />
        </div>
      )}

      {/* Header — order ID + table + time */}
      <div className="flex items-start justify-between gap-2 p-4 pb-2.5">
        <div
          className="text-[1.55rem] font-bold leading-none"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--cd-amber)' }}
        >
          #{order.id}
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {order.table_number && (
            <span
              className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider"
              style={{
                backgroundColor: 'rgba(217,119,6,0.15)',
                color:           'var(--cd-amber)',
                border:          '1px solid rgba(217,119,6,0.4)',
              }}
            >
              Table {order.table_number}
            </span>
          )}
          <span className="text-xs" style={{ color: 'var(--cd-muted)' }}>
            {timeAgo(order.created_at)}
          </span>
        </div>
      </div>

      {/* Customer name */}
      <div className="px-4 pb-2.5 text-sm" style={{ color: 'var(--cd-muted)' }}>
        {order.customer_name || 'Guest'}
      </div>

      <div className="h-px mx-4" style={{ backgroundColor: 'var(--cd-border)' }} />

      {/* Items */}
      <div className="px-4 py-2.5 space-y-1.5">
        {order.items.length === 0 && (
          <span className="text-sm italic" style={{ color: 'var(--cd-muted)' }}>
            No item details
          </span>
        )}
        {order.items.map((item, i) => (
          <div key={i} className="flex items-baseline justify-between gap-2 text-sm">
            <span className="font-bold flex-shrink-0" style={{ color: 'var(--cd-amber)' }}>
              {item.quantity}×
            </span>
            <span className="flex-1" style={{ color: 'var(--cd-text)' }}>
              {item.name}
            </span>
            <span className="text-xs flex-shrink-0" style={{ color: 'var(--cd-muted)' }}>
              GHS {item.price.toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      {/* Comment */}
      {order.comment && (
        <div className="px-4 pb-2 text-xs italic" style={{ color: 'var(--cd-muted)' }}>
          Note: {order.comment}
        </div>
      )}

      <div className="h-px mx-4" style={{ backgroundColor: 'var(--cd-border)' }} />

      {/* Total */}
      <div className="px-4 py-2.5">
        <span className="text-xs" style={{ color: 'var(--cd-muted)' }}>Total </span>
        <span className="text-lg font-bold" style={{ color: 'var(--cd-amber)' }}>
          GHS {order.total}
        </span>
      </div>

      {/* Ghost label */}
      {order.ghost && (
        <div className="px-4 pb-3 text-xs italic" style={{ color: 'var(--cd-muted)' }}>
          Abandoned — payment not completed
        </div>
      )}

      {/* Status buttons */}
      {!order.ghost && (
        <div
          className="flex border-t"
          style={{ borderColor: 'var(--cd-border)' }}
        >
          {STATUS_BUTTONS.map(({ key, label }) => {
            const isActive = order.status === key;
            return (
              <button
                key={key}
                onClick={() => onStatus(order.id, key)}
                disabled={updating}
                className="flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors"
                style={{
                  backgroundColor: isActive ? STATUS_COLORS[key] : 'transparent',
                  color:           isActive ? '#0D1B0D' : 'var(--cd-muted)',
                  cursor:          updating ? 'not-allowed' : 'pointer',
                  opacity:         updating ? 0.5 : 1,
                  borderRight:     key !== 'served' ? '1px solid var(--cd-border)' : undefined,
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

export default function KitchenPage() {
  const navigate = useNavigate();
  const pin      = localStorage.getItem('cd_kitchen_pin') ?? '';

  const [orders,    setOrders]    = useState<KitchenOrder[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [pollError, setPollError] = useState(false);
  const [newAlert,  setNewAlert]  = useState(false);
  const [updating,  setUpdating]  = useState<Record<number, boolean>>({});
  const [clock,     setClock]     = useState('');

  const lastOrderIdRef = useRef(0);
  const intervalRef    = useRef<ReturnType<typeof setInterval>>();

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
    // Optimistic update
    setOrders(prev =>
      prev.map(o => o.id === orderId ? { ...o, status: status as KitchenOrder['status'] } : o)
    );
    setUpdating(prev => ({ ...prev, [orderId]: true }));

    try {
      const res = await fetch(`/api/kitchen/orders/${orderId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Kitchen-Pin': pin,
          'Accept':        'application/json',
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        // Rollback — next poll will also correct state
        await fetchOrders();
      }
      // On success: keep optimistic state; TI may not have committed yet.
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

  const dineInOrders     = orders.filter(o => o.order_type !== 'collection');
  const collectionOrders = orders.filter(o => o.order_type === 'collection');
  const totalOrders      = orders.length;

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{ backgroundColor: 'var(--cd-bg)', color: 'var(--cd-text)' }}
    >
      {/* Header */}
      <header
        className="flex items-center justify-between px-5 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--cd-border)' }}
      >
        <div
          className="text-xl font-bold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--cd-amber)' }}
        >
          🍽️ Kitchen — Cookers Delight
          {totalOrders > 0 && (
            <span
              className="ml-2 text-sm font-normal"
              style={{ color: 'var(--cd-muted)', fontFamily: 'var(--font-body)' }}
            >
              ({totalOrders} order{totalOrders !== 1 ? 's' : ''})
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm tabular-nums" style={{ color: 'var(--cd-muted)' }}>
            {clock}
          </span>
          <button
            onClick={logout}
            className="text-xs px-3 py-1.5 rounded-lg uppercase tracking-widest font-semibold"
            style={{
              backgroundColor: 'rgba(217,119,6,0.12)',
              color:           'var(--cd-amber)',
              border:          '1px solid rgba(217,119,6,0.3)',
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
          style={{ backgroundColor: 'rgba(217,119,6,0.2)', color: 'var(--cd-amber)', borderBottom: '1px solid rgba(217,119,6,0.3)' }}
        >
          🔔 New Order! Check the kitchen display
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex-1 flex items-center justify-center opacity-40">
          <div
            className="w-10 h-10 rounded-full border-2 animate-spin"
            style={{ borderColor: 'rgba(217,119,6,0.2)', borderTopColor: 'var(--cd-amber)' }}
          />
        </div>
      )}

      {/* Two-column layout */}
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
                />
              ))}
            </div>
          </div>

        </main>
      )}
    </div>
  );
}
