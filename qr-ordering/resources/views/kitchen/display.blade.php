<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Kitchen Display — Cookers Delight</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
    <style>
        :root {
            --cd-bg: #0D1B0D;
            --cd-surface: #152415;
            --cd-surface-2: #1A2E1A;
            --cd-amber: #D97706;
            --cd-text: #F5F0E8;
            --cd-text-muted: #7A8F7A;
            --cd-primary: #1B5E20;
            --cd-border: rgba(245,240,232,0.08);
            --font-serif: 'Cormorant Garamond', Georgia, serif;
            --font-sans: 'Syne', system-ui, sans-serif;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        html, body {
            height: 100%;
            background: var(--cd-bg);
            color: var(--cd-text);
            font-family: var(--font-sans);
            overscroll-behavior: none;
        }

        /* ─── Layout ─────────────────────────────────────── */
        .kitchen-layout {
            display: flex;
            flex-direction: column;
            min-height: 100dvh;
        }

        /* ─── Header ─────────────────────────────────────── */
        .header {
            background: var(--cd-surface);
            border-bottom: 1px solid var(--cd-border);
            padding: 0.875rem 1.25rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            position: sticky;
            top: 0;
            z-index: 40;
            flex-shrink: 0;
        }

        .header-title {
            font-family: var(--font-serif);
            font-size: 1.35rem;
            font-weight: 600;
            color: var(--cd-amber);
            letter-spacing: 0.02em;
        }

        .header-right {
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .live-clock {
            font-size: 0.9rem;
            color: var(--cd-text-muted);
            letter-spacing: 0.05em;
            font-variant-numeric: tabular-nums;
        }

        .logout-btn {
            background: transparent;
            border: 1px solid var(--cd-border);
            border-radius: 8px;
            color: var(--cd-text-muted);
            font-family: var(--font-sans);
            font-size: 0.8rem;
            padding: 0.4rem 0.875rem;
            cursor: pointer;
            transition: color 0.15s, border-color 0.15s;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
        }

        .logout-btn:hover {
            color: var(--cd-text);
            border-color: rgba(245,240,232,0.25);
        }

        /* ─── Orders grid ────────────────────────────────── */
        .orders-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 1rem;
            padding: 1.25rem;
            align-items: start;
            flex: 1;
        }

        @media (min-width: 768px) {
            .orders-grid {
                grid-template-columns: repeat(2, 1fr);
                gap: 1.25rem;
                padding: 1.5rem;
            }
        }

        @media (min-width: 1200px) {
            .orders-grid {
                grid-template-columns: repeat(3, 1fr);
            }
        }

        /* ─── Order card ─────────────────────────────────── */
        .order-card {
            background: var(--cd-surface);
            border-radius: 18px;
            border: 2px solid var(--cd-border);
            overflow: hidden;
            position: relative;
            /* No transition — status colour must be instant and permanent */
        }

        .order-card[data-status="received"]  { border-color: #D97706; }
        .order-card[data-status="preparing"] { border-color: #6366F1; }
        .order-card[data-status="ready"]     { border-color: #16A34A; }
        .order-card[data-status="served"]    { border-color: rgba(122,143,122,0.3); opacity: 0.65; }
        .order-card.ghost-order              { opacity: 0.3; filter: grayscale(0.6); }

        .card-header {
            padding: 1rem 1rem 0.625rem;
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 0.5rem;
        }

        .order-id {
            font-family: var(--font-serif);
            font-size: 1.55rem;
            font-weight: 700;
            color: var(--cd-amber);
            line-height: 1;
        }

        .header-meta {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            flex-wrap: wrap;
            justify-content: flex-end;
        }

        .table-pill {
            background: rgba(217,119,6,0.15);
            border: 1px solid rgba(217,119,6,0.4);
            border-radius: 20px;
            color: var(--cd-amber);
            font-size: 0.75rem;
            font-weight: 700;
            padding: 0.25rem 0.625rem;
            letter-spacing: 0.06em;
            text-transform: uppercase;
        }

        .time-ago {
            font-size: 0.75rem;
            color: var(--cd-text-muted);
        }

        .customer-name {
            padding: 0 1rem 0.625rem;
            font-size: 0.85rem;
            color: var(--cd-text-muted);
            letter-spacing: 0.03em;
        }

        /* ─── Items list ─────────────────────────────────── */
        .divider {
            height: 1px;
            background: var(--cd-border);
            margin: 0 1rem;
        }

        .items-list {
            padding: 0.625rem 1rem;
            display: flex;
            flex-direction: column;
            gap: 0.375rem;
        }

        .item-row {
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            gap: 0.5rem;
            font-size: 0.875rem;
        }

        .item-name {
            color: var(--cd-text);
            flex: 1;
        }

        .item-qty {
            font-weight: 700;
            color: var(--cd-amber);
            flex-shrink: 0;
        }

        .item-price {
            color: var(--cd-text-muted);
            font-size: 0.8rem;
            flex-shrink: 0;
        }

        .no-items {
            color: var(--cd-text-muted);
            font-size: 0.8rem;
            font-style: italic;
        }

        .comment-row {
            font-size: 0.78rem;
            color: var(--cd-text-muted);
            font-style: italic;
            padding: 0 1rem 0.375rem;
        }

        /* ─── Card footer ────────────────────────────────── */
        .card-footer {
            padding: 0.625rem 1rem 1rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.5rem;
        }

        .order-total {
            font-size: 1.05rem;
            font-weight: 700;
            color: var(--cd-amber);
        }

        .total-label {
            font-size: 0.75rem;
            color: var(--cd-text-muted);
            font-weight: 400;
            margin-right: 0.25rem;
        }

        /* ─── Status buttons ─────────────────────────────── */
        .status-bar {
            padding: 0.5rem 1rem 1rem;
            display: flex;
            gap: 0.375rem;
        }

        .status-btn {
            flex: 1;
            border-radius: 20px;
            border: 1.5px solid transparent;
            font-family: var(--font-sans);
            font-size: 0.7rem;
            font-weight: 700;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            padding: 0.5rem 0.25rem;
            cursor: pointer;
            transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.08s ease;
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
            min-height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .status-btn:active { transform: scale(0.94); }

        .status-btn.ghost {
            background: transparent;
            color: var(--cd-text-muted);
            border-color: var(--cd-border);
        }

        .status-btn.active-received  { background: rgba(217,119,6,0.18); color: #D97706; border-color: #D97706; }
        .status-btn.active-preparing { background: rgba(99,102,241,0.18); color: #818CF8; border-color: #6366F1; }
        .status-btn.active-ready     { background: rgba(22,163,74,0.18);  color: #4ADE80; border-color: #16A34A; }
        .status-btn.active-served    { background: rgba(122,143,122,0.15); color: var(--cd-text-muted); border-color: rgba(122,143,122,0.4); }

        /* ─── Spinner overlay on card ─────────────────────── */
        .updating-overlay {
            position: absolute;
            inset: 0;
            background: rgba(13,27,13,0.6);
            border-radius: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 5;
            pointer-events: none; /* never eat taps when visible — spinner is display-only */
        }
        /* When Alpine shows the overlay during an update, restore pointer-events so
           the card feels locked during the request */
        .updating-overlay[style=""] {
            pointer-events: auto;
        }

        .spinner {
            width: 28px;
            height: 28px;
            border: 3px solid rgba(217,119,6,0.3);
            border-top-color: var(--cd-amber);
            border-radius: 50%;
            animation: spin 0.7s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        /* ─── New order alert overlay ─────────────────────── */
        .new-order-overlay {
            position: fixed;
            inset: 0;
            z-index: 50;
            background: rgba(217,119,6,0.92);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 1rem;
            animation: flashIn 0.2s ease;
        }

        .new-order-overlay.fade-out {
            animation: flashOut 0.4s ease forwards;
        }

        @keyframes flashIn {
            from { opacity: 0; transform: scale(1.04); }
            to   { opacity: 1; transform: scale(1); }
        }

        @keyframes flashOut {
            from { opacity: 1; }
            to   { opacity: 0; pointer-events: none; }
        }

        .alert-icon {
            font-size: 4rem;
            animation: pulse 0.6s ease infinite alternate;
        }

        @keyframes pulse {
            from { transform: scale(1); }
            to   { transform: scale(1.1); }
        }

        .alert-title {
            font-family: var(--font-serif);
            font-size: clamp(2.5rem, 8vw, 4.5rem);
            font-weight: 700;
            color: #fff;
            text-align: center;
        }

        .alert-sub {
            font-size: 1rem;
            color: rgba(255,255,255,0.8);
            letter-spacing: 0.08em;
            text-transform: uppercase;
        }

        /* ─── Empty state ─────────────────────────────────── */
        .empty-state {
            grid-column: 1 / -1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 1rem;
            padding: 4rem 2rem;
            color: var(--cd-text-muted);
            text-align: center;
        }

        .empty-state-icon { font-size: 3rem; }
        .empty-state-title { font-size: 1.1rem; color: var(--cd-text-muted); }
        .empty-state-sub { font-size: 0.85rem; }
    </style>
</head>
<body>
<div class="kitchen-layout" x-data="kitchen()" x-init="init()">

    <!-- ── New order alert overlay ──────────────────────────── -->
    <div
        class="new-order-overlay"
        x-show="newAlert"
        x-transition:enter="transition ease-out duration-200"
        x-transition:enter-start="opacity-0"
        x-transition:enter-end="opacity-100"
        x-transition:leave="transition ease-in duration-400"
        x-transition:leave-start="opacity-100"
        x-transition:leave-end="opacity-0"
        @click="newAlert = false"
        style="display:none"
    >
        <div class="alert-icon">🔔</div>
        <div class="alert-title">New Order!</div>
        <div class="alert-sub">Check the kitchen display</div>
    </div>

    <!-- ── Header ───────────────────────────────────────────── -->
    <header class="header">
        <div class="header-title">
            🍽️ Kitchen — Cookers Delight
            <span
                x-show="orders.length > 0"
                x-text="'(' + orders.length + ' order' + (orders.length !== 1 ? 's' : '') + ')'"
                style="font-size:0.85rem;font-family:var(--font-sans);font-weight:400;color:var(--cd-text-muted);margin-left:0.5rem;vertical-align:middle;">
            </span>
        </div>
        <div class="header-right">
            <div class="live-clock" x-text="clock"></div>
            <a href="{{ route('kitchen') }}?logout=1" class="logout-btn"
               onclick="event.preventDefault(); fetch('/kitchen/logout', {method:'POST', headers:{'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]').content}}).then(()=>location.reload())">
                Logout
            </a>
        </div>
    </header>

    <!-- ── Poll error banner ───────────────────────────────────── -->
    <div
        x-show="pollError"
        style="display:none;background:#DC2626;color:#fff;text-align:center;padding:0.5rem 1rem;font-size:0.82rem;letter-spacing:0.04em;">
        ⚠️ Connection to order system lost — retrying…
    </div>

    <!-- ── Orders grid ──────────────────────────────────────── -->
    <main class="orders-grid">

        <!-- Empty state -->
        <template x-if="orders.length === 0">
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <div class="empty-state-title">No orders today yet</div>
                <div class="empty-state-sub">New orders will appear automatically</div>
            </div>
        </template>

        <!-- Order cards -->
        <template x-for="order in orders" :key="order.id">
            <div class="order-card" :data-status="order.status" :class="order.ghost ? 'ghost-order' : ''">

                <!-- Updating spinner overlay — hidden by default so it never blocks taps before Alpine inits -->
                <div class="updating-overlay" x-show="!!updating[order.id]" style="display:none">
                    <div class="spinner"></div>
                </div>

                <!-- Card header -->
                <div class="card-header">
                    <div class="order-id" x-text="'#' + order.id"></div>
                    <div class="header-meta">
                        <template x-if="order.table_number">
                            <span class="table-pill" x-text="'Table ' + order.table_number"></span>
                        </template>
                        <span class="time-ago" x-text="timeAgo(order.created_at)"></span>
                    </div>
                </div>

                <!-- Customer name -->
                <div class="customer-name" x-text="order.customer_name || 'Guest'"></div>

                <div class="divider"></div>

                <!-- Items list -->
                <div class="items-list">
                    <template x-for="(item, i) in (order.items || [])" :key="i">
                        <div class="item-row">
                            <span class="item-qty" x-text="item.quantity + '×'"></span>
                            <span class="item-name" x-text="item.name"></span>
                            <span class="item-price" x-text="'GHS ' + Number(item.price).toFixed(2)"></span>
                        </div>
                    </template>
                    <span class="no-items" x-show="!order.items || order.items.length === 0">
                        No item details available
                    </span>
                </div>

                <!-- Comment -->
                <template x-if="order.comment">
                    <div class="comment-row" x-text="'Note: ' + order.comment"></div>
                </template>

                <div class="divider"></div>

                <!-- Total -->
                <div class="card-footer">
                    <div class="order-total">
                        <span class="total-label">Total</span>
                        <span x-text="'GHS ' + order.total"></span>
                    </div>
                </div>

                <!-- Ghost label for abandoned orders -->
                <template x-if="order.ghost">
                    <div style="padding:0.5rem 1rem 1rem;font-size:0.75rem;color:var(--cd-text-muted);font-style:italic;">
                        Abandoned — payment not completed
                    </div>
                </template>

                <!-- Status buttons — inlined to avoid nested x-for scope loss -->
                <div class="status-bar" x-show="!order.ghost">
                    <button type="button"
                        class="status-btn"
                        :class="order.status === 'received' ? 'active-received' : 'ghost'"
                        @click.prevent="updateStatus(order.id, 'received')"
                        :disabled="!!updating[order.id]">
                        Received
                    </button>
                    <button type="button"
                        class="status-btn"
                        :class="order.status === 'preparing' ? 'active-preparing' : 'ghost'"
                        @click.prevent="updateStatus(order.id, 'preparing')"
                        :disabled="!!updating[order.id]">
                        Preparing
                    </button>
                    <button type="button"
                        class="status-btn"
                        :class="order.status === 'ready' ? 'active-ready' : 'ghost'"
                        @click.prevent="updateStatus(order.id, 'ready')"
                        :disabled="!!updating[order.id]">
                        Ready
                    </button>
                    <button type="button"
                        class="status-btn"
                        :class="order.status === 'served' ? 'active-served' : 'ghost'"
                        @click.prevent="updateStatus(order.id, 'served')"
                        :disabled="!!updating[order.id]">
                        Served
                    </button>
                </div>

            </div>
        </template>

    </main>

</div>

<script>
function kitchen() {
    return {
        orders: [],
        lastOrderId: 0,
        newAlert: false,
        updating: {},
        clock: '',
        pollError: false,

        statuses: [
            { key: 'received',  label: 'Received'  },
            { key: 'preparing', label: 'Preparing' },
            { key: 'ready',     label: 'Ready'     },
            { key: 'served',    label: 'Served'    },
        ],

        async init() {
            this.updateClock();
            setInterval(() => this.updateClock(), 1000);
            await this.fetchOrders();
            setInterval(() => this.fetchOrders(), 5000);

            // Handle logout link properly
            document.querySelector('.logout-btn').addEventListener('click', async (e) => {
                e.preventDefault();
                const csrf = document.querySelector('meta[name=csrf-token]').content;
                await fetch('/kitchen/logout', {
                    method: 'POST',
                    headers: { 'X-CSRF-TOKEN': csrf, 'X-Requested-With': 'XMLHttpRequest' }
                });
                window.location.href = '/kitchen';
            });
        },

        updateClock() {
            const now = new Date();
            this.clock = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        },

        async fetchOrders() {
            try {
                const r = await fetch('/kitchen/orders/poll', {
                    headers: { 'X-Requested-With': 'XMLHttpRequest' }
                });
                // If we got ANY response the server is reachable — clear the error flag.
                this.pollError = false;

                if (r.status === 401) { window.location.href = '/kitchen'; return; }
                if (!r.ok) {
                    console.warn('Kitchen poll returned', r.status);
                    return;
                }

                const data = await r.json();
                const orders = data.orders || [];
                const maxId = orders.length > 0 ? Math.max(...orders.map(o => o.id)) : 0;

                if (this.lastOrderId > 0 && maxId > this.lastOrderId) {
                    this.newAlert = true;
                    this.playAlert();
                    setTimeout(() => { this.newAlert = false; }, 4000);
                }

                this.lastOrderId = Math.max(this.lastOrderId, maxId);
                this.orders = orders;
            } catch (err) {
                // Only reaches here when fetch() itself throws (server completely unreachable).
                console.error('Kitchen poll error:', err);
                this.pollError = true;
            }
        },

        async updateStatus(orderId, status) {
            const order = this.orders.find(o => o.id === orderId);
            if (!order) return;

            // Optimistic update — show new status immediately
            const previousStatus = order.status;
            order.status = status;

            this.updating = { ...this.updating, [orderId]: true };

            try {
                const csrf = document.querySelector('meta[name=csrf-token]').content;
                const r = await fetch(`/kitchen/orders/${orderId}/status`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': csrf,
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    body: JSON.stringify({ status })
                });

                if (!r.ok) {
                    const errData = await r.json().catch(() => ({}));
                    console.error('Status update failed:', r.status, errData);
                    // Roll back optimistic update on failure
                    order.status = previousStatus;
                }
                // On success: keep the optimistic status.
                // The 5-second poll will confirm it from TI on the next cycle.
            } catch (err) {
                console.error('Status update network error:', err);
                order.status = previousStatus;
            } finally {
                const upd = { ...this.updating };
                delete upd[orderId];
                this.updating = upd;
                // Do NOT call fetchOrders() here — TI may not have committed the
                // write yet, which would immediately revert the status colour.
            }
        },

        playAlert() {
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
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
            } catch (e) { /* AudioContext blocked — silent fail */ }
        },

        timeAgo(createdAt) {
            if (!createdAt) return '';
            const diff = Math.floor((Date.now() - new Date(createdAt)) / 1000);
            if (diff < 60)   return diff + 's ago';
            if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
            return Math.floor(diff / 3600) + 'h ago';
        },
    };
}
</script>
</body>
</html>
