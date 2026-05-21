import React, { useEffect, useState } from 'react';
import {
  HiPencil,
  HiXMark,
  HiCheckCircle,
  HiMapPin,
  HiPhone,
  HiEnvelope,
  HiBuildingStorefront,
} from 'react-icons/hi2';
import { locationsApi } from '../api';
import {
  Badge,
  Card,
  Spinner,
  EmptyState,
  Field,
  Toggle,
  inputClass,
} from '../components/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LocationOptions {
  is_open?: boolean;
  [key: string]: unknown;
}

interface Location {
  location_id: number;
  location_name: string;
  location_address_1: string;
  location_telephone: string;
  location_email: string;
  location_status: number | boolean;
  options: LocationOptions;
}

interface DraftLocation {
  location_name: string;
  location_address_1: string;
  location_telephone: string;
  location_email: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isActive(loc: Location): boolean {
  return loc.location_status === 1 || loc.location_status === true;
}

function draftFromLocation(loc: Location): DraftLocation {
  return {
    location_name: loc.location_name,
    location_address_1: loc.location_address_1,
    location_telephone: loc.location_telephone,
    location_email: loc.location_email,
  };
}

function isDirty(loc: Location, draft: DraftLocation): boolean {
  return (
    draft.location_name !== loc.location_name ||
    draft.location_address_1 !== loc.location_address_1 ||
    draft.location_telephone !== loc.location_telephone ||
    draft.location_email !== loc.location_email
  );
}

// ─── LocationCard ─────────────────────────────────────────────────────────────

interface LocationCardProps {
  location: Location;
  onUpdated: (updated: Location) => void;
}

function LocationCard({ location, onUpdated }: LocationCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<DraftLocation>(draftFromLocation(location));
  const [saving, setSaving] = useState(false);
  const [togglingOpen, setTogglingOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const dirty = editing && isDirty(location, draft);

  function startEdit() {
    setDraft(draftFromLocation(location));
    setSaveError(null);
    setEditing(true);
  }

  function discardEdit() {
    setDraft(draftFromLocation(location));
    setSaveError(null);
    setEditing(false);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await locationsApi.update(location.location_id, draft);
      const updated: Location = res.data?.data ?? res.data;
      onUpdated(updated);
      setEditing(false);
    } catch {
      setSaveError('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleOpen(newValue: boolean) {
    setTogglingOpen(true);
    try {
      const res = await locationsApi.update(location.location_id, {
        options: { ...location.options, is_open: newValue },
      });
      const updated: Location = res.data?.data ?? res.data;
      onUpdated(updated);
    } catch {
      // revert — caller state remains unchanged
    } finally {
      setTogglingOpen(false);
    }
  }

  const isOpen = !!location.options?.is_open;

  return (
    <Card className="flex flex-col">
      {/* Card header */}
      <div className="flex items-start justify-between gap-3 px-5 py-4" style={{ borderBottom: '1px solid #EDE8E3' }}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#FFF1EE] text-[#EC4824] flex items-center justify-center flex-shrink-0">
            <HiBuildingStorefront size={18} />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-[#1C1917] truncate">{location.location_name}</p>
            <div className="mt-0.5">
              {isActive(location) ? (
                <Badge color="#16A34A">Active</Badge>
              ) : (
                <Badge color="#78716C">Inactive</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Open Now toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#A8A29E] hidden sm:block">Open Now</span>
            {togglingOpen ? (
              <Spinner size={16} />
            ) : (
              <Toggle value={isOpen} onChange={handleToggleOpen} />
            )}
          </div>

          {/* Edit / Cancel */}
          {!editing ? (
            <button
              onClick={startEdit}
              className="flex items-center gap-1.5 text-xs font-bold text-[#78716C] hover:text-[#1C1917] px-3 py-1.5 rounded-lg bg-[#F5EFE8] hover:bg-[#EDE8E3] transition-colors"
            >
              <HiPencil size={13} />
              Edit
            </button>
          ) : (
            <button
              onClick={discardEdit}
              className="flex items-center gap-1.5 text-xs font-bold text-[#78716C] hover:text-[#1C1917] px-3 py-1.5 rounded-lg bg-[#F5EFE8] hover:bg-[#EDE8E3] transition-colors"
            >
              <HiXMark size={14} />
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Card body */}
      <div className="px-5 py-4 flex-1 space-y-4">
        {saveError && (
          <div className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
            {saveError}
          </div>
        )}

        {editing ? (
          /* Editable form */
          <div className="space-y-4">
            <Field label="Location Name" required>
              <input
                className={inputClass}
                value={draft.location_name}
                onChange={e => setDraft(d => ({ ...d, location_name: e.target.value }))}
              />
            </Field>
            <Field label="Address">
              <input
                className={inputClass}
                value={draft.location_address_1}
                onChange={e => setDraft(d => ({ ...d, location_address_1: e.target.value }))}
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Phone">
                <input
                  type="tel"
                  className={inputClass}
                  value={draft.location_telephone}
                  onChange={e => setDraft(d => ({ ...d, location_telephone: e.target.value }))}
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  className={inputClass}
                  value={draft.location_email}
                  onChange={e => setDraft(d => ({ ...d, location_email: e.target.value }))}
                />
              </Field>
            </div>
          </div>
        ) : (
          /* Read-only display */
          <div className="space-y-3">
            <div className="flex items-start gap-3 text-sm">
              <HiMapPin size={15} className="text-[#A8A29E] mt-0.5 flex-shrink-0" />
              <span className="text-[#78716C]">
                {location.location_address_1 || <span className="text-[#A8A29E] italic">No address</span>}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <HiPhone size={15} className="text-[#A8A29E] flex-shrink-0" />
              <span className="text-[#78716C]">
                {location.location_telephone || <span className="text-[#A8A29E] italic">No phone</span>}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <HiEnvelope size={15} className="text-[#A8A29E] flex-shrink-0" />
              <span className="text-[#78716C]">
                {location.location_email || <span className="text-[#A8A29E] italic">No email</span>}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Per-card save bar — shown when editing and dirty */}
      {editing && (
        <div
          className={`px-5 py-3 flex items-center justify-between gap-4 transition-opacity ${dirty ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}
          style={{ borderTop: '1px solid #EDE8E3' }}
        >
          <span className="text-xs text-[#A8A29E]">Unsaved changes</span>
          <div className="flex gap-2">
            <button
              onClick={discardEdit}
              className="text-xs text-[#A8A29E] hover:text-[#1C1917] transition-colors px-3 py-1.5 rounded-lg hover:bg-[#F5EFE8]"
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              className="flex items-center gap-1.5 text-xs font-bold bg-[#EC4824] hover:bg-[#d4401f] disabled:opacity-50 text-white px-4 py-1.5 rounded-lg transition-colors"
            >
              {saving ? (
                <>
                  <Spinner size={12} />
                  Saving…
                </>
              ) : (
                <>
                  <HiCheckCircle size={13} />
                  Save changes
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Locations() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    locationsApi
      .list()
      .then(res => {
        const payload = res.data?.data ?? res.data ?? [];
        const list: Location[] = Array.isArray(payload) ? payload : payload?.data ?? [];
        setLocations(list);
        setError(null);
      })
      .catch(() => setError('Failed to load locations'))
      .finally(() => setLoading(false));
  }, []);

  function handleUpdated(updated: Location) {
    setLocations(prev =>
      prev.map(l => (l.location_id === updated.location_id ? updated : l)),
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-[#1C1917]">Locations</h1>
        {!loading && (
          <p className="text-[#A8A29E] text-sm mt-0.5">
            {locations.length} {locations.length === 1 ? 'branch' : 'branches'}
          </p>
        )}
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
      ) : locations.length === 0 ? (
        <EmptyState
          icon={<HiBuildingStorefront size={56} />}
          title="No locations found"
        />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {locations.map(loc => (
            <LocationCard key={loc.location_id} location={loc} onUpdated={handleUpdated} />
          ))}
        </div>
      )}
    </div>
  );
}
