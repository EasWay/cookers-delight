import React, { useEffect, useState } from 'react';
import {
  HiPlus,
  HiPencil,
  HiTrash,
  HiMegaphone,
  HiCalendarDays,
} from 'react-icons/hi2';
import { announcementsApi } from '../api';
import {
  Badge,
  Card,
  Spinner,
  EmptyState,
  Modal,
  Confirm,
  Field,
  Toggle,
  inputClass,
} from '../components/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Announcement {
  id: number;
  title: string;
  description: string;
  status: 0 | 1;
  start_date: string | null;
  end_date: string | null;
}

type AnnouncementStatus = 'Active' | 'Scheduled' | 'Expired' | 'Inactive';

interface AnnouncementForm {
  title: string;
  description: string;
  status: boolean;
  start_date: string;
  end_date: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getAnnouncementStatus(a: Announcement): AnnouncementStatus {
  if (a.status === 0) return 'Inactive';

  const now = new Date();
  const start = a.start_date ? new Date(a.start_date) : null;
  const end = a.end_date ? new Date(a.end_date) : null;

  if (end && end < now) return 'Expired';
  if (start && start > now) return 'Scheduled';
  return 'Active';
}

function statusBadgeColor(s: AnnouncementStatus): string {
  switch (s) {
    case 'Active':    return '#22c55e';
    case 'Scheduled': return '#eab308';
    case 'Expired':   return '#6b7280';
    case 'Inactive':  return '#6b7280';
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function toDateInputValue(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function emptyForm(): AnnouncementForm {
  return { title: '', description: '', status: true, start_date: '', end_date: '' };
}

function formFromAnnouncement(a: Announcement): AnnouncementForm {
  return {
    title: a.title,
    description: a.description,
    status: a.status === 1,
    start_date: toDateInputValue(a.start_date),
    end_date: toDateInputValue(a.end_date),
  };
}

function formToApiPayload(form: AnnouncementForm): object {
  return {
    title: form.title,
    description: form.description,
    status: form.status ? 1 : 0,
    start_date: form.start_date || null,
    end_date: form.end_date || null,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Announcements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Announcement | null>(null);
  const [form, setForm] = useState<AnnouncementForm>(emptyForm());
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [togglingId, setTogglingId] = useState<number | null>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────

  async function fetchAnnouncements() {
    try {
      const res = await announcementsApi.list();
      const payload = res.data?.data ?? res.data ?? [];
      const list: Announcement[] = Array.isArray(payload) ? payload : payload?.data ?? [];
      setAnnouncements(list);
      setError(null);
    } catch {
      setError('Failed to load announcements');
    }
  }

  useEffect(() => {
    fetchAnnouncements().finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Modal helpers ─────────────────────────────────────────────────────────

  function openCreate() {
    setEditTarget(null);
    setForm(emptyForm());
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(a: Announcement) {
    setEditTarget(a);
    setForm(formFromAnnouncement(a));
    setFormError(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditTarget(null);
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setFormSaving(true);
    setFormError(null);
    try {
      const payload = formToApiPayload(form);
      if (editTarget) {
        const res = await announcementsApi.update(editTarget.id, payload);
        const updated: Announcement = res.data?.data ?? res.data;
        setAnnouncements(prev =>
          prev.map(a => (a.id === updated.id ? updated : a)),
        );
      } else {
        await announcementsApi.create(payload);
        await fetchAnnouncements();
      }
      closeModal();
    } catch {
      setFormError('Failed to save announcement. Please try again.');
    } finally {
      setFormSaving(false);
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await announcementsApi.delete(deleteTarget.id);
      setAnnouncements(prev => prev.filter(a => a.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      // keep dialog open on error
    } finally {
      setDeleting(false);
    }
  }

  // ── Toggle status ─────────────────────────────────────────────────────────

  async function handleToggleStatus(a: Announcement, newActive: boolean) {
    setTogglingId(a.id);
    try {
      const payload = { status: newActive ? 1 : 0 };
      const res = await announcementsApi.update(a.id, payload);
      const updated: Announcement = res.data?.data ?? res.data;
      setAnnouncements(prev =>
        prev.map(item => (item.id === updated.id ? updated : item)),
      );
    } catch {
      // silently ignore — UI stays consistent with server state on next fetch
    } finally {
      setTogglingId(null);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-[#1C1917]">Announcements</h1>
          {!loading && (
            <p className="text-[#A8A29E] text-sm mt-0.5">
              {announcements.length} {announcements.length === 1 ? 'announcement' : 'announcements'}
            </p>
          )}
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-[#EC4824] hover:bg-[#d4401f] text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors"
        >
          <HiPlus size={18} />
          New Announcement
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Spinner size={36} />
        </div>
      ) : error ? (
        <div className="rounded-xl bg-red-50 border border-red-200 px-5 py-4 text-red-600 text-sm">
          {error}
        </div>
      ) : announcements.length === 0 ? (
        <EmptyState
          icon={<HiMegaphone size={56} />}
          title="No announcements yet"
          action={
            <button
              onClick={openCreate}
              className="mt-2 text-sm text-[#EC4824] hover:underline font-bold"
            >
              Create your first announcement
            </button>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {announcements.map(a => {
            const status = getAnnouncementStatus(a);
            const badgeColor = statusBadgeColor(status);
            const isToggling = togglingId === a.id;
            const startLabel = formatDate(a.start_date);
            const endLabel = formatDate(a.end_date);

            return (
              <Card key={a.id} className="p-5">
                <div className="flex gap-4">
                  {/* Main content */}
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Title + status */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-bold text-[#1C1917]">{a.title}</h3>
                      <Badge color={badgeColor}>{status}</Badge>
                    </div>

                    {/* Description */}
                    {a.description && (
                      <p className="text-sm text-[#78716C] leading-relaxed line-clamp-2">
                        {a.description}
                      </p>
                    )}

                    {/* Date range */}
                    <div className="flex items-center gap-1.5 text-xs text-[#A8A29E]">
                      <HiCalendarDays size={13} />
                      {startLabel && endLabel ? (
                        <span>From {startLabel} to {endLabel}</span>
                      ) : startLabel ? (
                        <span>From {startLabel} · No end date</span>
                      ) : endLabel ? (
                        <span>Until {endLabel}</span>
                      ) : (
                        <span>No date range set</span>
                      )}
                    </div>
                  </div>

                  {/* Actions sidebar */}
                  <div className="flex flex-col items-end justify-between gap-3 flex-shrink-0">
                    {/* Active toggle */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#A8A29E] hidden sm:block">Active</span>
                      {isToggling ? (
                        <Spinner size={16} />
                      ) : (
                        <Toggle
                          value={a.status === 1}
                          onChange={val => handleToggleStatus(a, val)}
                        />
                      )}
                    </div>

                    {/* Edit / Delete */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(a)}
                        className="flex items-center gap-1.5 text-xs font-bold text-[#78716C] hover:text-[#1C1917] px-3 py-1.5 rounded-lg bg-[#F5EFE8] hover:bg-[#EDE8E3] transition-colors"
                      >
                        <HiPencil size={13} />
                        <span className="hidden sm:inline">Edit</span>
                      </button>
                      <button
                        onClick={() => setDeleteTarget(a)}
                        className="flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-600 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 transition-colors"
                      >
                        <HiTrash size={13} />
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editTarget ? 'Edit Announcement' : 'New Announcement'}
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-5">
          {formError && (
            <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {formError}
            </div>
          )}

          <Field label="Title" required>
            <input
              className={inputClass}
              placeholder="Announcement title"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              required
            />
          </Field>

          <Field label="Description">
            <textarea
              rows={4}
              className={`${inputClass} resize-none`}
              placeholder="Optional description…"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Start Date">
              <input
                type="date"
                className={inputClass}
                value={form.start_date}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
              />
            </Field>
            <Field label="End Date">
              <input
                type="date"
                className={inputClass}
                value={form.end_date}
                onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                min={form.start_date || undefined}
              />
            </Field>
          </div>

          <div className="flex items-center gap-3">
            <Toggle
              value={form.status}
              onChange={val => setForm(f => ({ ...f, status: val }))}
            />
            <span className="text-sm text-[#78716C]">
              {form.status ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div className="flex gap-3 justify-end pt-1">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 text-sm text-[#78716C] hover:text-[#1C1917] rounded-lg hover:bg-[#F5EFE8] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSaving}
              className="px-5 py-2 text-sm font-bold bg-[#EC4824] hover:bg-[#d4401f] disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {formSaving ? 'Saving…' : editTarget ? 'Save changes' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <Confirm
        open={deleteTarget !== null}
        danger
        message={`Delete "${deleteTarget?.title}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
      />
    </div>
  );
}
