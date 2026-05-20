import React, { useCallback, useEffect, useState } from 'react';
import {
  HiPhoto,
  HiPencil,
  HiTrash,
  HiPlus,
  HiSquares2X2,
} from 'react-icons/hi2';
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
  selectClass,
} from '../components/ui';
import { menuItemsApi, categoriesApi, prepTimesApi } from '../api';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface MenuImage {
  thumb_url: string;
}

interface MenuItem {
  menu_id: number;
  menu_name: string;
  menu_price: number;
  menu_status: number;
  menu_category_id: number;
  menu_description: string;
  image?: MenuImage;
  prep_time_minutes?: number;
}

interface Category {
  category_id: number;
  name: string;
  status: number;
  priority: number;
}

interface PrepTimesMap {
  [menuId: number]: number;
}

interface FormState {
  menu_name: string;
  menu_description: string;
  menu_price: string;
  menu_category_id: string;
  prep_time_minutes: string;
  menu_status: boolean;
  image_url: string;
}

const DEFAULT_FORM: FormState = {
  menu_name: '',
  menu_description: '',
  menu_price: '',
  menu_category_id: '',
  prep_time_minutes: '15',
  menu_status: true,
  image_url: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function priceDisplay(price: number): string {
  return `GH₵${Number(price).toFixed(2)}`;
}

function itemToForm(item: MenuItem, prepTime: number): FormState {
  return {
    menu_name: item.menu_name,
    menu_description: item.menu_description ?? '',
    menu_price: String(item.menu_price),
    menu_category_id: String(item.menu_category_id),
    prep_time_minutes: String(prepTime ?? 15),
    menu_status: item.menu_status === 1,
    image_url: item.image?.thumb_url ?? '',
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [prepTimes, setPrepTimes] = useState<PrepTimesMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  // ── Data fetching ────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [menuRes, catRes, prepRes] = await Promise.all([
        menuItemsApi.list(),
        categoriesApi.list(),
        prepTimesApi.list(),
      ]);
      setItems(menuRes.data?.data ?? []);
      setCategories(catRes.data?.data ?? []);
      setPrepTimes(prepRes.data ?? {});
    } catch {
      // leave current state on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Modal helpers ─────────────────────────────────────────────────────────────

  function openAdd() {
    const maxPriority = categories.length > 0 ? categories[0].category_id : 0;
    setForm({ ...DEFAULT_FORM, menu_category_id: maxPriority ? String(maxPriority) : '' });
    setFormError(null);
    setShowAdd(true);
  }

  function openEdit(item: MenuItem) {
    const prepTime = prepTimes[item.menu_id] ?? item.prep_time_minutes ?? 15;
    setForm(itemToForm(item, prepTime));
    setFormError(null);
    setEditItem(item);
  }

  function closeModal() {
    setShowAdd(false);
    setEditItem(null);
    setFormError(null);
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  // ── Save ──────────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!form.menu_name.trim()) { setFormError('Item name is required.'); return; }
    if (!form.menu_price || isNaN(Number(form.menu_price))) { setFormError('Valid price is required.'); return; }
    if (!form.menu_category_id) { setFormError('Category is required.'); return; }
    setFormError(null);
    setSaving(true);

    const payload: Record<string, unknown> = {
      menu_name: form.menu_name.trim(),
      menu_description: form.menu_description.trim(),
      menu_price: parseFloat(form.menu_price),
      menu_category_id: parseInt(form.menu_category_id, 10),
      menu_status: form.menu_status ? 1 : 0,
    };
    const imageUrl = form.image_url.trim();
    if (imageUrl) {
      // SECURITY: Only allow http/https URLs to prevent javascript: and data: URI injection.
      // An <img src="javascript:..."> can execute JS in some legacy browsers.
      const lowerUrl = imageUrl.toLowerCase();
      if (!lowerUrl.startsWith('http://') && !lowerUrl.startsWith('https://')) {
        setFormError('Image URL must start with http:// or https://');
        setSaving(false);
        return;
      }
      payload.image = { thumb_url: imageUrl };
    }

    const newPrepTime = parseInt(form.prep_time_minutes, 10) || 15;

    try {
      if (editItem) {
        await menuItemsApi.update(editItem.menu_id, payload);
        const originalPrepTime = prepTimes[editItem.menu_id] ?? editItem.prep_time_minutes ?? 15;
        if (newPrepTime !== originalPrepTime) {
          await prepTimesApi.update(editItem.menu_id, newPrepTime);
        }
      } else {
        const res = await menuItemsApi.create(payload);
        const newId: number = res.data?.data?.menu_id ?? res.data?.menu_id;
        if (newId) {
          await prepTimesApi.update(newId, newPrepTime);
        }
      }
      closeModal();
      await fetchAll();
    } catch {
      setFormError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (confirmDelete === null) return;
    try {
      await menuItemsApi.delete(confirmDelete);
      setConfirmDelete(null);
      await fetchAll();
    } catch {
      setConfirmDelete(null);
    }
  }

  // ── Availability toggle ───────────────────────────────────────────────────────

  async function handleToggleAvailability(item: MenuItem) {
    const newStatus = item.menu_status === 1 ? 0 : 1;
    // Optimistic update
    setItems(prev =>
      prev.map(i => i.menu_id === item.menu_id ? { ...i, menu_status: newStatus } : i)
    );
    try {
      await menuItemsApi.update(item.menu_id, { menu_status: newStatus });
    } catch {
      // Revert on failure
      setItems(prev =>
        prev.map(i => i.menu_id === item.menu_id ? { ...i, menu_status: item.menu_status } : i)
      );
    }
  }

  // ── Category lookup ───────────────────────────────────────────────────────────

  function getCategoryName(id: number): string {
    return categories.find(c => c.category_id === id)?.name ?? 'Uncategorized';
  }

  // ── Merged prep time ──────────────────────────────────────────────────────────

  function getPrepTime(item: MenuItem): number | null {
    if (prepTimes[item.menu_id] !== undefined) return prepTimes[item.menu_id];
    if (item.prep_time_minutes !== undefined) return item.prep_time_minutes;
    return null;
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const isEditing = editItem !== null;
  const modalOpen = showAdd || isEditing;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black text-[#1C1917]">Menu Items</h1>
          {!loading && (
            <span
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold"
              style={{ backgroundColor: '#EC482422', color: '#EC4824' }}
            >
              {items.length}
            </span>
          )}
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-[#EC4824] hover:bg-[#d4401f] text-white text-sm font-bold rounded-xl transition-colors"
        >
          <HiPlus size={18} />
          Add Item
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner size={32} />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<HiSquares2X2 size={56} />}
          title="No menu items yet"
          action={
            <button
              onClick={openAdd}
              className="px-4 py-2 bg-[#EC4824] hover:bg-[#d4401f] text-white text-sm font-bold rounded-xl transition-colors"
            >
              Add First Item
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map(item => {
            const prepTime = getPrepTime(item);
            const categoryName = getCategoryName(item.menu_category_id);

            return (
              <Card key={item.menu_id} className="overflow-hidden flex flex-col">
                {/* Image */}
                <div className="relative h-44 bg-[#F5EFE8] flex-shrink-0">
                  {item.image?.thumb_url ? (
                    <img
                      src={item.image.thumb_url}
                      alt={item.menu_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#EDE8E3]">
                      <HiPhoto size={40} />
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="p-4 flex flex-col flex-1 gap-3">
                  {/* Name + badges */}
                  <div className="space-y-2">
                    <p className="font-bold text-[#1C1917] leading-snug">{item.menu_name}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge color="#78716C">{categoryName}</Badge>
                      {prepTime !== null && (
                        <Badge color="#0891b2">~{prepTime}min</Badge>
                      )}
                    </div>
                  </div>

                  {/* Price */}
                  <p className="text-[#EC4824] font-black text-lg">
                    {priceDisplay(item.menu_price)}
                  </p>

                  {/* Footer: toggle + actions */}
                  <div className="mt-auto flex items-center justify-between pt-2" style={{ borderTop: '1px solid #EDE8E3' }}>
                    <Toggle
                      value={item.menu_status === 1}
                      onChange={() => handleToggleAvailability(item)}
                      label={item.menu_status === 1 ? 'Available' : 'Unavailable'}
                    />
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(item)}
                        className="p-2 rounded-lg text-[#A8A29E] hover:text-[#1C1917] hover:bg-[#F5EFE8] transition-colors"
                        title="Edit"
                      >
                        <HiPencil size={16} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(item.menu_id)}
                        className="p-2 rounded-lg text-[#A8A29E] hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <HiTrash size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={isEditing ? `Edit "${editItem?.menu_name}"` : 'Add Menu Item'}
        size="lg"
      >
        <div className="space-y-4">
          <Field label="Item Name" required>
            <input
              className={inputClass}
              placeholder="e.g. Jollof Rice"
              value={form.menu_name}
              onChange={e => setField('menu_name', e.target.value)}
            />
          </Field>

          <Field label="Description">
            <textarea
              className={`${inputClass} resize-none`}
              rows={3}
              placeholder="Short description of the item…"
              value={form.menu_description}
              onChange={e => setField('menu_description', e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Price GH₵" required>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputClass}
                placeholder="0.00"
                value={form.menu_price}
                onChange={e => setField('menu_price', e.target.value)}
              />
            </Field>

            <Field label="Prep Time (minutes)" required>
              <input
                type="number"
                min="1"
                max="120"
                className={inputClass}
                placeholder="15"
                value={form.prep_time_minutes}
                onChange={e => setField('prep_time_minutes', e.target.value)}
              />
            </Field>
          </div>

          <Field label="Category" required>
            <select
              className={selectClass}
              value={form.menu_category_id}
              onChange={e => setField('menu_category_id', e.target.value)}
            >
              <option value="">Select a category…</option>
              {categories.map(cat => (
                <option key={cat.category_id} value={String(cat.category_id)}>
                  {cat.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Image URL">
            <input
              type="url"
              className={inputClass}
              placeholder="https://…"
              value={form.image_url}
              onChange={e => setField('image_url', e.target.value)}
            />
          </Field>

          <div className="flex items-center justify-between py-2">
            <span className="text-xs font-bold text-[#78716C] uppercase tracking-widest">Available</span>
            <Toggle
              value={form.menu_status}
              onChange={v => setField('menu_status', v)}
            />
          </div>

          {formError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2">
              {formError}
            </p>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 text-sm text-[#78716C] hover:text-[#1C1917] rounded-xl hover:bg-[#F5EFE8] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 text-sm font-bold bg-[#EC4824] hover:bg-[#d4401f] disabled:opacity-50 text-white rounded-xl transition-colors flex items-center gap-2"
            >
              {saving && <Spinner size={14} />}
              {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Add Item'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Confirm
        open={confirmDelete !== null}
        danger
        message="Are you sure you want to delete this menu item? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
