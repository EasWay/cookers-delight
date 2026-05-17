import React, { useEffect, useState } from 'react';
import {
  HiUser,
  HiPlus,
  HiTrash,
  HiQrCode,
  HiTableCells,
} from 'react-icons/hi2';
import { adminApi, locationsApi } from '../api';
import {
  Badge,
  Card,
  Spinner,
  EmptyState,
  Modal,
  Confirm,
  Field,
  inputClass,
  selectClass,
} from '../components/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActiveSession {
  order_id?: number;
  customer_name?: string;
  amount?: number | string;
  status?: string;
}

interface Table {
  table_id: number;
  table_number: number | string;
  capacity: number;
  stable_token: string;
  active_session: ActiveSession | null;
}

interface LocationGroup {
  location_id: number;
  location_name: string;
  tables: Table[];
}

interface Location {
  location_id: number;
  location_name: string;
}

interface AddTableForm {
  location_id: number | '';
  table_number: string;
  capacity: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Tables() {
  const [groups, setGroups] = useState<LocationGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [locations, setLocations] = useState<Location[]>([]);

  const [activeTab, setActiveTab] = useState<number | 'all'>('all');

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<AddTableForm>({ location_id: '', table_number: '', capacity: '4' });
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Table & { location_name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  function fetchTables() {
    return adminApi
      .get('/admin/tables')
      .then(res => {
        const payload: LocationGroup[] = res.data?.data ?? res.data ?? [];
        setGroups(Array.isArray(payload) ? payload : []);
        setError(null);
      })
      .catch(() => setError('Failed to load tables'));
  }

  function fetchLocations() {
    locationsApi
      .list()
      .then(res => {
        const payload = res.data?.data ?? res.data ?? [];
        const list: Location[] = Array.isArray(payload) ? payload : payload?.data ?? [];
        setLocations(list);
      })
      .catch(() => {/* locations are supplementary */});
  }

  useEffect(() => {
    Promise.all([fetchTables(), fetchLocations() as unknown as Promise<void>]).finally(() =>
      setLoading(false),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Filtered tables view ──────────────────────────────────────────────────

  const visibleGroups: LocationGroup[] =
    activeTab === 'all' ? groups : groups.filter(g => g.location_id === activeTab);

  const allTables = visibleGroups.flatMap(g =>
    g.tables.map(t => ({ ...t, location_name: g.location_name, location_id: g.location_id })),
  );

  const totalTables = groups.reduce((s, g) => s + g.tables.length, 0);
  const occupiedCount = groups.reduce(
    (s, g) => s + g.tables.filter(t => t.active_session !== null).length,
    0,
  );

  const multipleLocations = groups.length > 1;

  // ── Add table ─────────────────────────────────────────────────────────────

  function openAdd() {
    setAddForm({ location_id: groups[0]?.location_id ?? '', table_number: '', capacity: '4' });
    setAddError(null);
    setAddOpen(true);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.location_id || !addForm.table_number) return;
    setAddSaving(true);
    setAddError(null);
    try {
      await adminApi.post('/admin/tables', {
        location_id: Number(addForm.location_id),
        table_number: Number(addForm.table_number),
        capacity: Number(addForm.capacity) || 4,
      });
      setAddOpen(false);
      setLoading(true);
      await fetchTables();
    } catch {
      setAddError('Failed to create table. Please try again.');
    } finally {
      setAddSaving(false);
      setLoading(false);
    }
  }

  // ── Delete table ──────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminApi.delete(`/admin/tables/${deleteTarget.table_id}`);
      setDeleteTarget(null);
      await fetchTables();
    } catch {
      // surface silently — keep dialog open so user can retry
    } finally {
      setDeleting(false);
    }
  }

  // ── Print QR ─────────────────────────────────────────────────────────────

  async function handlePrintQr(tableId: number) {
    let qrUrl: string | undefined;
    let tableNumber: number | string = '';
    let orderingUrl: string | undefined;
    let lanIp: string | undefined;

    try {
      const res    = await adminApi.get(`/admin/tables/${tableId}/qr-print`);
      const data   = res.data?.data ?? res.data;
      qrUrl        = data?.qr_url;
      tableNumber  = data?.table_number ?? '';
      orderingUrl  = data?.ordering_url;
      lanIp        = data?.lan_ip;
    } catch {
      // Network failure — fall through; we'll show an error in the popup.
    }

    if (!qrUrl) {
      // Surface to the user rather than silently doing nothing.
      window.alert("Couldn't generate QR code. Make sure the table was saved and try again.");
      return;
    }

    // Open a small print-ready window. CSS hides everything but the QR
    // panel when the user hits Print (Ctrl+P or the button below the QR).
    const html = `
      <!doctype html>
      <html><head>
        <title>Table ${tableNumber} — QR Code</title>
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <style>
          *,*::before,*::after { box-sizing: border-box; }
          html,body { margin: 0; padding: 0; background: #fff; color: #111;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, system-ui, sans-serif; }
          .wrap { min-height: 100vh; display: flex; flex-direction: column;
            align-items: center; justify-content: center; padding: 32px; gap: 18px; }
          .panel { border: 2px dashed #ddd; border-radius: 16px; padding: 28px 32px;
            text-align: center; max-width: 480px; }
          h1 { margin: 0 0 4px; font-size: 14px; letter-spacing: 0.18em;
            text-transform: uppercase; color: #888; font-weight: 700; }
          .num { font-size: 64px; font-weight: 900; line-height: 1; margin: 6px 0 18px; }
          img { display: block; width: 320px; height: 320px; max-width: 100%; margin: 0 auto; }
          .scan { font-size: 13px; color: #666; margin-top: 14px; }
          .url { word-break: break-all; font-family: ui-monospace, Menlo, monospace;
            font-size: 11px; color: #999; margin-top: 6px; }
          .actions { display: flex; gap: 12px; }
          button { font: inherit; font-weight: 600; padding: 10px 18px; border-radius: 10px;
            border: 1px solid #ddd; background: #fff; cursor: pointer; }
          button.primary { background: #EC4824; border-color: #EC4824; color: #fff; }
          @media print {
            .actions { display: none; }
            .panel { border: none; padding: 0; }
            .url { display: none; }
          }
        </style>
      </head><body>
        <div class="wrap">
          <div class="panel">
            <h1>Table</h1>
            <div class="num">${tableNumber}</div>
            <img src="${qrUrl}" alt="QR code for table ${tableNumber}" />
            <p class="scan">Scan to order</p>
            ${orderingUrl ? `<p class="url">${orderingUrl}</p>` : ''}
            ${lanIp ? `<p class="url" style="color:#aaa">LAN: ${lanIp} — phone must be on the same Wi-Fi, and the dev server must bind to 0.0.0.0</p>` : ''}
          </div>
          <div class="actions">
            <button onclick="window.print()" class="primary">Print</button>
            <button onclick="window.close()">Close</button>
          </div>
        </div>
        <script>window.addEventListener('load', () => setTimeout(window.print, 350));</script>
      </body></html>
    `;

    // NOTE: do NOT pass `noopener` here — it forces the return value to
    // null and detaches the document, so document.write below would land
    // on a window we can no longer reach. We're writing our own trusted
    // HTML so the security trade-off is fine.
    const w = window.open('', '_blank', 'width=520,height=720');
    if (!w) {
      // Popup blocked — open the raw QR image in a new tab as a fallback.
      window.open(qrUrl, '_blank', 'noreferrer');
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    // Some browsers (Safari) need an explicit focus to surface the popup.
    w.focus();
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black">Tables &amp; QR Codes</h1>
          {!loading && (
            <p className="text-white/40 text-sm mt-0.5">
              {totalTables} tables · {occupiedCount} occupied
            </p>
          )}
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-[#EC4824] hover:bg-[#d4401f] text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors"
        >
          <HiPlus size={18} />
          Add Table
        </button>
      </div>

      {/* Location filter tabs */}
      {multipleLocations && (
        <div className="flex gap-1 flex-wrap">
          {(['all', ...groups.map(g => g.location_id)] as (number | 'all')[]).map(tab => {
            const label = tab === 'all' ? 'All' : groups.find(g => g.location_id === tab)?.location_name ?? '';
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                  active
                    ? 'bg-[#EC4824] text-white'
                    : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Spinner size={36} />
        </div>
      ) : error ? (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-5 py-4 text-red-400 text-sm">
          {error}
        </div>
      ) : allTables.length === 0 ? (
        <EmptyState
          icon={<HiTableCells size={56} />}
          title="No tables yet"
          action={
            <button
              onClick={openAdd}
              className="mt-2 text-sm text-[#EC4824] hover:underline font-bold"
            >
              Add your first table
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {allTables.map(table => {
            const occupied = table.active_session !== null;
            return (
              <Card key={table.table_id} className="p-5 flex flex-col gap-4">
                {/* Table number */}
                <div className="flex flex-col items-center text-center pb-3 border-b border-white/8">
                  <p className="text-xs text-white/30 uppercase tracking-widest font-bold mb-1">Table</p>
                  <p className="text-5xl font-black text-white leading-none">{table.table_number}</p>
                  {multipleLocations && (
                    <p className="text-xs text-white/40 mt-1.5">{table.location_name}</p>
                  )}
                </div>

                {/* Meta row */}
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-white/50">
                    <HiUser size={14} />
                    {table.capacity} seats
                  </span>
                  <span className="font-mono text-xs text-white/25 bg-white/5 px-2 py-0.5 rounded">
                    {(table.stable_token ?? '').slice(0, 8) || '—'}
                  </span>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between">
                  {occupied ? (
                    <Badge color="#EC4824">Occupied</Badge>
                  ) : (
                    <Badge color="#22c55e">Available</Badge>
                  )}
                  {occupied && table.active_session && (
                    <div className="text-right">
                      {table.active_session.order_id && (
                        <p className="text-xs text-white/50">
                          Order #{table.active_session.order_id}
                        </p>
                      )}
                      {table.active_session.amount !== undefined && (
                        <p className="text-xs font-bold text-white/70">
                          GH₵{table.active_session.amount}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handlePrintQr(table.table_id)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                  >
                    <HiQrCode size={14} />
                    Print QR
                  </button>
                  {!occupied && (
                    <button
                      onClick={() => setDeleteTarget(table)}
                      className="flex items-center justify-center gap-1.5 text-xs font-bold py-2 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                    >
                      <HiTrash size={14} />
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Table Modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Table" size="sm">
        <form onSubmit={handleAdd} className="space-y-5">
          {addError && (
            <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              {addError}
            </div>
          )}

          {(locations.length > 1 || groups.length > 1) && (
            <Field label="Location" required>
              <select
                className={selectClass}
                value={addForm.location_id}
                onChange={e => setAddForm(f => ({ ...f, location_id: Number(e.target.value) }))}
                required
              >
                <option value="">Select location…</option>
                {groups.map(g => (
                  <option key={g.location_id} value={g.location_id}>
                    {g.location_name}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field label="Table Number" required>
            <input
              type="number"
              min={1}
              className={inputClass}
              placeholder="e.g. 12"
              value={addForm.table_number}
              onChange={e => setAddForm(f => ({ ...f, table_number: e.target.value }))}
              required
            />
          </Field>

          <Field label="Capacity" required>
            <input
              type="number"
              min={1}
              max={50}
              className={inputClass}
              value={addForm.capacity}
              onChange={e => setAddForm(f => ({ ...f, capacity: e.target.value }))}
              required
            />
          </Field>

          <div className="flex gap-3 justify-end pt-1">
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              className="px-4 py-2 text-sm text-white/50 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addSaving}
              className="px-5 py-2 text-sm font-bold bg-[#EC4824] hover:bg-[#d4401f] disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {addSaving ? 'Creating…' : 'Create Table'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <Confirm
        open={deleteTarget !== null}
        danger
        message={
          deleteTarget?.active_session
            ? `Table ${deleteTarget.table_number} has an active session. Deleting it will end the session. Are you sure?`
            : `Delete Table ${deleteTarget?.table_number}? This cannot be undone.`
        }
        onConfirm={handleDelete}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
      />
    </div>
  );
}
