import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  HiBuildingStorefront,
  HiCog6Tooth,
  HiClock,
  HiClipboardDocumentList,
  HiCreditCard,
  HiBell,
  HiPaintBrush,
  HiExclamationTriangle,
  HiEye,
  HiEyeSlash,
} from 'react-icons/hi2';
import {
  Card,
  Field,
  Toggle,
  SaveBar,
  Spinner,
  inputClass,
} from '../components/ui';
import { cdSettingsApi, statusesApi, prepTimesApi, menuItemsApi } from '../api';

// ─── Types ────────────────────────────────────────────────────────────────────

type SettingsMap = Record<string, string>;

interface OrderStatus {
  status_id: number;
  status_name: string;
  status_color: string;
  notify_customer: boolean | number;
  sort_order?: number;
}

interface MenuItem {
  menu_id: number;
  menu_name: string;
}

interface StatusDraft {
  status_name: string;
  status_color: string;
  notify_customer: boolean;
  sort_order: number;
}

// ─── Tab IDs ──────────────────────────────────────────────────────────────────

type TabId =
  | 'restaurant'
  | 'orders'
  | 'preptimes'
  | 'statuses'
  | 'payments'
  | 'notifications'
  | 'appearance';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'restaurant',    label: 'Restaurant Info',   icon: <HiBuildingStorefront size={18} /> },
  { id: 'orders',        label: 'Order Config',       icon: <HiCog6Tooth size={18} /> },
  { id: 'preptimes',     label: 'Prep Times',         icon: <HiClock size={18} /> },
  { id: 'statuses',      label: 'Order Statuses',     icon: <HiClipboardDocumentList size={18} /> },
  { id: 'payments',      label: 'Payments',           icon: <HiCreditCard size={18} /> },
  { id: 'notifications', label: 'Notifications',      icon: <HiBell size={18} /> },
  { id: 'appearance',    label: 'Appearance',         icon: <HiPaintBrush size={18} /> },
];

// ─── Key groups per tab ───────────────────────────────────────────────────────

const RESTAURANT_KEYS = [
  'restaurant_name', 'tagline', 'whatsapp_number',
  'instagram_handle', 'facebook_url', 'twitter_handle', 'footer_text',
] as const;

const ORDERS_KEYS = [
  'order_type_delivery_enabled', 'order_type_pickup_enabled', 'order_type_dinein_enabled',
  'default_prep_time_minutes', 'max_order_items', 'min_order_amount', 'order_lead_time_minutes',
] as const;

const PAYMENTS_KEYS = [
  'paystack_public_key', 'paystack_secret_key', 'currency_code', 'currency_symbol',
] as const;

const NOTIFICATIONS_KEYS = [
  'notify_new_order_email', 'notify_new_order_sms', 'admin_email',
  'sms_number', 'notification_sound_enabled', 'low_stock_threshold',
] as const;

const APPEARANCE_KEYS = [
  'brand_color', 'brand_color_secondary', 'logo_url',
  'hero_image_url', 'show_announcement_bar', 'maintenance_mode',
] as const;

// Mirrors CdSettingsController::MASK — the placeholder returned by the API
// when a secret key is set but must not be transmitted back to the browser.
const SETTINGS_MASK = '••••••••';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function str(v: unknown): string {
  return v == null ? '' : String(v);
}

function bool(v: unknown): boolean {
  return v === true || v === 'true' || v === '1';
}

function notifyBool(v: boolean | number | undefined): boolean {
  if (typeof v === 'boolean') return v;
  return v === 1;
}

function keysDiffer(a: SettingsMap, b: SettingsMap, keys: readonly string[]): boolean {
  return keys.some(k => (a[k] ?? '') !== (b[k] ?? ''));
}

function statusDraftsDirty(drafts: Record<number, StatusDraft>, originals: OrderStatus[]): boolean {
  return originals.some(s => {
    const d = drafts[s.status_id];
    if (!d) return false;
    return (
      d.status_name !== s.status_name ||
      d.status_color !== (s.status_color || '#6b7280') ||
      d.sort_order !== (s.sort_order ?? 0)
    );
  });
}

function buildStatusDraft(s: OrderStatus): StatusDraft {
  return {
    status_name: s.status_name,
    status_color: s.status_color || '#6b7280',
    notify_customer: notifyBool(s.notify_customer),
    sort_order: s.sort_order ?? 0,
  };
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-black text-[#1C1917]">{title}</h2>
      {description && <p className="text-sm text-[#A8A29E] mt-1">{description}</p>}
    </div>
  );
}

// ─── Color field with swatch + hex input ──────────────────────────────────────

function ColorField({
  label,
  value,
  fallback = '#EC4824',
  onChange,
}: {
  label: string;
  value: string;
  fallback?: string;
  onChange: (v: string) => void;
}) {
  const resolved = value || fallback;
  return (
    <Field label={label}>
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl border border-[#EDE8E3] flex-shrink-0 relative overflow-hidden cursor-pointer"
          style={{ backgroundColor: resolved }}
        >
          <input
            type="color"
            value={resolved}
            onChange={e => onChange(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
        <input
          type="text"
          maxLength={7}
          className={inputClass}
          placeholder={fallback}
          value={value}
          onChange={e => {
            const v = e.target.value;
            if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v);
          }}
        />
      </div>
    </Field>
  );
}

// ─── Tab 1 — Restaurant Info ──────────────────────────────────────────────────

function RestaurantTab({
  settings, savedSettings, onChange, onSave, onDiscard, saving,
}: {
  settings: SettingsMap;
  savedSettings: SettingsMap;
  onChange: (k: string, v: string) => void;
  onSave: () => void;
  onDiscard: () => void;
  saving: boolean;
}) {
  const dirty = keysDiffer(settings, savedSettings, RESTAURANT_KEYS);

  return (
    <>
      <div className="space-y-5">
        <SectionHeader
          title="Restaurant Info"
          description="Public-facing identity, contact info and social links."
        />

        <Card className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Restaurant Name">
              <input
                className={inputClass}
                placeholder="Cookers Delight"
                value={str(settings.restaurant_name)}
                onChange={e => onChange('restaurant_name', e.target.value)}
              />
            </Field>
            <Field label="Tagline">
              <input
                className={inputClass}
                placeholder="Taste the difference"
                value={str(settings.tagline)}
                onChange={e => onChange('tagline', e.target.value)}
              />
            </Field>
          </div>

          <Field label="WhatsApp Number" hint="Used for the WhatsApp order button">
            <input
              className={inputClass}
              placeholder="+233 XX XXX XXXX"
              value={str(settings.whatsapp_number)}
              onChange={e => onChange('whatsapp_number', e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Field label="Instagram Handle">
              <input
                className={inputClass}
                placeholder="@cookersdelight"
                value={str(settings.instagram_handle)}
                onChange={e => onChange('instagram_handle', e.target.value)}
              />
            </Field>
            <Field label="Facebook URL">
              <input
                className={inputClass}
                placeholder="https://facebook.com/…"
                value={str(settings.facebook_url)}
                onChange={e => onChange('facebook_url', e.target.value)}
              />
            </Field>
            <Field label="Twitter / X Handle">
              <input
                className={inputClass}
                placeholder="@cookersdelight"
                value={str(settings.twitter_handle)}
                onChange={e => onChange('twitter_handle', e.target.value)}
              />
            </Field>
          </div>

          <Field label="Footer Text">
            <textarea
              rows={3}
              className={`${inputClass} resize-none`}
              placeholder="© 2025 Cookers Delight. All rights reserved."
              value={str(settings.footer_text)}
              onChange={e => onChange('footer_text', e.target.value)}
            />
          </Field>
        </Card>
      </div>

      <SaveBar dirty={dirty} saving={saving} onSave={onSave} onDiscard={onDiscard} />
    </>
  );
}

// ─── Tab 2 — Order Config ─────────────────────────────────────────────────────

function OrderConfigTab({
  settings, savedSettings, onChange, onSave, onDiscard, saving,
}: {
  settings: SettingsMap;
  savedSettings: SettingsMap;
  onChange: (k: string, v: string) => void;
  onSave: () => void;
  onDiscard: () => void;
  saving: boolean;
}) {
  const dirty = keysDiffer(settings, savedSettings, ORDERS_KEYS);

  return (
    <>
      <div className="space-y-5">
        <SectionHeader
          title="Order Configuration"
          description="Control which order types are active and set timing / quantity limits."
        />

        <Card className="p-6 space-y-6">
          <div>
            <p className="text-xs font-bold text-[#78716C] uppercase tracking-widest mb-4">Order Types</p>
            <div className="space-y-4">
              {(
                [
                  ['order_type_delivery_enabled', 'Enable Delivery', 'Allow customers to place delivery orders'],
                  ['order_type_pickup_enabled',   'Enable Pickup',   'Allow customers to pick up in-store'],
                  ['order_type_dinein_enabled',   'Enable Dine-In',  'Allow orders placed at the table'],
                ] as [string, string, string][]
              ).map(([key, label, description], idx, arr) => (
                <React.Fragment key={key}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">{label}</p>
                      <p className="text-xs text-[#A8A29E] mt-0.5">{description}</p>
                    </div>
                    <Toggle
                      value={bool(settings[key])}
                      onChange={v => onChange(key, v ? '1' : '0')}
                    />
                  </div>
                  {idx < arr.length - 1 && <div className="h-px bg-[#EDE8E3]" />}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="h-px bg-[#EDE8E3]" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Default Prep Time (minutes)">
              <input
                type="number"
                min={1}
                max={120}
                className={inputClass}
                placeholder="15"
                value={str(settings.default_prep_time_minutes)}
                onChange={e => onChange('default_prep_time_minutes', e.target.value)}
              />
            </Field>
            <Field label="Order Lead Time (minutes)" hint="How far in advance orders must be placed">
              <input
                type="number"
                min={0}
                className={inputClass}
                placeholder="0"
                value={str(settings.order_lead_time_minutes)}
                onChange={e => onChange('order_lead_time_minutes', e.target.value)}
              />
            </Field>
            <Field label="Minimum Order Amount (GH₵)">
              <input
                type="number"
                min={0}
                step={0.01}
                className={inputClass}
                placeholder="0.00"
                value={str(settings.min_order_amount)}
                onChange={e => onChange('min_order_amount', e.target.value)}
              />
            </Field>
            <Field label="Maximum Items Per Order">
              <input
                type="number"
                min={1}
                className={inputClass}
                placeholder="50"
                value={str(settings.max_order_items)}
                onChange={e => onChange('max_order_items', e.target.value)}
              />
            </Field>
          </div>
        </Card>
      </div>

      <SaveBar dirty={dirty} saving={saving} onSave={onSave} onDiscard={onDiscard} />
    </>
  );
}

// ─── Tab 3 — Prep Times ───────────────────────────────────────────────────────

interface PrepTimesTabProps {
  menuItems: MenuItem[];
  prepTimes: Record<number, number>;
  localPrepTimes: Record<number, number>;
  onChangePrepTime: (menuId: number, minutes: number) => void;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
  loading: boolean;
}

function PrepTimesTab({
  menuItems,
  prepTimes,
  localPrepTimes,
  onChangePrepTime,
  dirty,
  saving,
  onSave,
  onDiscard,
  loading,
}: PrepTimesTabProps) {
  const changedCount = menuItems.filter(item => {
    const local = localPrepTimes[item.menu_id];
    if (local === undefined) return false;
    return local !== (prepTimes[item.menu_id] ?? 15);
  }).length;

  return (
    <>
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <SectionHeader
            title="Prep Times"
            description="Set per-item preparation time. Used to estimate wait times shown to customers."
          />
          {dirty && (
            <span className="text-xs font-bold text-[#EC4824] bg-[#EC4824]/10 border border-[#EC4824]/20 rounded-lg px-3 py-1.5 flex-shrink-0 -mt-1">
              {changedCount} unsaved {changedCount === 1 ? 'change' : 'changes'}
            </span>
          )}
        </div>

        <Card>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner size={32} />
            </div>
          ) : menuItems.length === 0 ? (
            <div className="px-6 py-10 text-center text-[#A8A29E] text-sm">No menu items found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#EDE8E3] text-[#A8A29E] text-xs uppercase tracking-widest font-bold">
                    <th className="px-5 py-3 text-left">Menu Item</th>
                    <th className="px-5 py-3 text-left w-44">Prep Time (minutes)</th>
                  </tr>
                </thead>
                <tbody>
                  {menuItems.map(item => {
                    const saved = prepTimes[item.menu_id] ?? 15;
                    const local = localPrepTimes[item.menu_id];
                    const current = local !== undefined ? local : saved;
                    const changed = local !== undefined && local !== saved;

                    return (
                      <tr
                        key={item.menu_id}
                        className={`border-b border-[#F5EFE8] last:border-0 transition-colors ${
                          changed ? 'bg-[#EC4824]/[0.04]' : ''
                        }`}
                      >
                        <td className="px-5 py-3.5">
                          <span className="text-[#1C1917]">{item.menu_name}</span>
                          {changed && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#EC4824]/15 text-[#EC4824]">
                              edited
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <input
                            type="number"
                            min={1}
                            max={300}
                            value={current}
                            onChange={e =>
                              onChangePrepTime(item.menu_id, Math.max(1, parseInt(e.target.value, 10) || 1))
                            }
                            className="w-28 bg-[#FAFAFA] border border-[#EDE8E3] rounded-lg px-3 py-1.5 text-[#1C1917] text-sm focus:border-[#EC4824] focus:outline-none transition-colors"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <SaveBar dirty={dirty} saving={saving} onSave={onSave} onDiscard={onDiscard} />
    </>
  );
}

// ─── Tab 4 — Order Statuses ───────────────────────────────────────────────────

interface OrderStatusesTabProps {
  statuses: OrderStatus[];
  drafts: Record<number, StatusDraft>;
  onChangeDraft: (id: number, patch: Partial<StatusDraft>) => void;
  onToggleNotify: (id: number) => Promise<void>;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
  loading: boolean;
}

function OrderStatusesTab({
  statuses, drafts, onChangeDraft, onToggleNotify,
  dirty, saving, onSave, onDiscard, loading,
}: OrderStatusesTabProps) {
  return (
    <>
      <div className="space-y-5">
        <SectionHeader
          title="Order Statuses"
          description="Customise status labels, colors and when customers receive notifications."
        />

        <Card>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner size={32} />
            </div>
          ) : statuses.length === 0 ? (
            <div className="px-6 py-10 text-center text-[#A8A29E] text-sm">No statuses found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#EDE8E3] text-[#A8A29E] text-xs uppercase tracking-widest font-bold">
                    <th className="px-5 py-3 text-left">Status Name</th>
                    <th className="px-5 py-3 text-left w-44">Color</th>
                    <th className="px-5 py-3 text-center w-36">Notify Customer</th>
                    <th className="px-5 py-3 text-center w-28">Sort Order</th>
                  </tr>
                </thead>
                <tbody>
                  {statuses.map(status => {
                    const d = drafts[status.status_id];
                    if (!d) return null;

                    return (
                      <tr
                        key={status.status_id}
                        className="border-b border-[#F5EFE8] last:border-0 hover:bg-[#FAFAF9]"
                      >
                        {/* Name */}
                        <td className="px-5 py-3.5">
                          <input
                            value={d.status_name}
                            onChange={e =>
                              onChangeDraft(status.status_id, { status_name: e.target.value })
                            }
                            className="bg-[#FAFAFA] border border-[#EDE8E3] rounded-lg px-3 py-1.5 text-[#1C1917] text-sm focus:border-[#EC4824] focus:outline-none w-40 transition-colors"
                          />
                        </td>

                        {/* Color */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-8 h-8 rounded-lg border border-[#EDE8E3] flex-shrink-0 relative overflow-hidden cursor-pointer"
                              style={{ backgroundColor: d.status_color }}
                            >
                              <input
                                type="color"
                                value={d.status_color}
                                onChange={e =>
                                  onChangeDraft(status.status_id, { status_color: e.target.value })
                                }
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              />
                            </div>
                            <input
                              type="text"
                              maxLength={7}
                              value={d.status_color}
                              onChange={e => {
                                const v = e.target.value;
                                if (/^#[0-9a-fA-F]{0,6}$/.test(v)) {
                                  onChangeDraft(status.status_id, { status_color: v });
                                }
                              }}
                              className="w-24 bg-[#FAFAFA] border border-[#EDE8E3] rounded-lg px-2 py-1.5 text-[#1C1917] text-xs font-mono focus:border-[#EC4824] focus:outline-none transition-colors"
                            />
                          </div>
                        </td>

                        {/* Notify customer */}
                        <td className="px-5 py-3.5 text-center">
                          <div className="flex justify-center">
                            <Toggle
                              value={d.notify_customer}
                              onChange={() => onToggleNotify(status.status_id)}
                            />
                          </div>
                        </td>

                        {/* Sort order */}
                        <td className="px-5 py-3.5 text-center">
                          <input
                            type="number"
                            min={0}
                            value={d.sort_order}
                            onChange={e =>
                              onChangeDraft(status.status_id, {
                                sort_order: parseInt(e.target.value, 10) || 0,
                              })
                            }
                            className="w-16 bg-[#FAFAFA] border border-[#EDE8E3] rounded-lg px-2 py-1.5 text-[#1C1917] text-sm text-center focus:border-[#EC4824] focus:outline-none transition-colors mx-auto block"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <SaveBar dirty={dirty} saving={saving} onSave={onSave} onDiscard={onDiscard} />
    </>
  );
}

// ─── Tab 5 — Payments ─────────────────────────────────────────────────────────

function PaymentsTab({
  settings, savedSettings, onChange, onSave, onDiscard, saving,
}: {
  settings: SettingsMap;
  savedSettings: SettingsMap;
  onChange: (k: string, v: string) => void;
  onSave: () => void;
  onDiscard: () => void;
  saving: boolean;
}) {
  const [showSecret, setShowSecret] = useState(false);
  const dirty = keysDiffer(settings, savedSettings, PAYMENTS_KEYS);

  return (
    <>
      <div className="space-y-5">
        <SectionHeader
          title="Payment Settings"
          description="Configure Paystack credentials and currency display."
        />

        <div className="flex gap-3 items-start bg-yellow-500/10 border border-yellow-500/25 rounded-xl px-5 py-4">
          <HiExclamationTriangle size={18} className="text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-300/80 leading-relaxed">
            Payment credentials are stored securely in the database. Never share your secret key
            with anyone or commit it to source control.
          </p>
        </div>

        <Card className="p-6 space-y-5">
          <Field label="Paystack Public Key">
            <input
              className={inputClass}
              placeholder="pk_live_…"
              value={str(settings.paystack_public_key)}
              onChange={e => onChange('paystack_public_key', e.target.value)}
            />
          </Field>

          <Field label="Paystack Secret Key">
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                className={`${inputClass} pr-12`}
                placeholder="sk_live_…"
                value={str(settings.paystack_secret_key)}
                onChange={e => onChange('paystack_secret_key', e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowSecret(s => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#A8A29E] hover:text-[#1C1917] transition-colors"
                tabIndex={-1}
              >
                {showSecret ? <HiEyeSlash size={16} /> : <HiEye size={16} />}
              </button>
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-5">
            <Field label="Currency Code" hint="ISO 4217, e.g. GHS">
              <input
                className={inputClass}
                placeholder="GHS"
                value={str(settings.currency_code)}
                onChange={e => onChange('currency_code', e.target.value)}
              />
            </Field>
            <Field label="Currency Symbol">
              <input
                className={inputClass}
                placeholder="GH₵"
                value={str(settings.currency_symbol)}
                onChange={e => onChange('currency_symbol', e.target.value)}
              />
            </Field>
          </div>
        </Card>
      </div>

      <SaveBar dirty={dirty} saving={saving} onSave={onSave} onDiscard={onDiscard} />
    </>
  );
}

// ─── Tab 6 — Notifications ────────────────────────────────────────────────────

function NotificationsTab({
  settings, savedSettings, onChange, onSave, onDiscard, saving,
}: {
  settings: SettingsMap;
  savedSettings: SettingsMap;
  onChange: (k: string, v: string) => void;
  onSave: () => void;
  onDiscard: () => void;
  saving: boolean;
}) {
  const dirty = keysDiffer(settings, savedSettings, NOTIFICATIONS_KEYS);

  return (
    <>
      <div className="space-y-5">
        <SectionHeader
          title="Notifications"
          description="Configure admin alerts and notification channels for incoming orders."
        />

        <Card className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Admin Email" hint="Receives order notification emails">
              <input
                type="email"
                className={inputClass}
                placeholder="admin@cookersdelight.com"
                value={str(settings.admin_email)}
                onChange={e => onChange('admin_email', e.target.value)}
              />
            </Field>
            <Field label="SMS Number" hint="Receives order SMS alerts">
              <input
                type="tel"
                className={inputClass}
                placeholder="+233 XX XXX XXXX"
                value={str(settings.sms_number)}
                onChange={e => onChange('sms_number', e.target.value)}
              />
            </Field>
          </div>

          <div className="h-px bg-[#EDE8E3]" />

          <div className="space-y-4">
            {(
              [
                ['notify_new_order_email', 'Email on New Order',      'Send an email when a new order is placed'],
                ['notify_new_order_sms',   'SMS on New Order',        'Send an SMS when a new order is placed'],
                ['notification_sound_enabled', 'Notification Sound',  'Play a sound in admin panel when new order arrives'],
              ] as [string, string, string][]
            ).map(([key, label, description], idx, arr) => (
              <React.Fragment key={key}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{label}</p>
                    <p className="text-xs text-[#A8A29E] mt-0.5">{description}</p>
                  </div>
                  <Toggle
                    value={bool(settings[key])}
                    onChange={v => onChange(key, v ? '1' : '0')}
                  />
                </div>
                {idx < arr.length - 1 && <div className="h-px bg-[#EDE8E3]" />}
              </React.Fragment>
            ))}
          </div>

          <div className="h-px bg-[#EDE8E3]" />

          <Field
            label="Low Stock Alert Threshold"
            hint="Alert when a menu item has been ordered X times without update — set to 0 to disable"
          >
            <input
              type="number"
              min={0}
              className={inputClass}
              placeholder="0"
              value={str(settings.low_stock_threshold)}
              onChange={e => onChange('low_stock_threshold', e.target.value)}
            />
          </Field>
        </Card>
      </div>

      <SaveBar dirty={dirty} saving={saving} onSave={onSave} onDiscard={onDiscard} />
    </>
  );
}

// ─── Tab 7 — Appearance ───────────────────────────────────────────────────────

function AppearanceTab({
  settings, savedSettings, onChange, onSave, onDiscard, saving,
}: {
  settings: SettingsMap;
  savedSettings: SettingsMap;
  onChange: (k: string, v: string) => void;
  onSave: () => void;
  onDiscard: () => void;
  saving: boolean;
}) {
  const dirty = keysDiffer(settings, savedSettings, APPEARANCE_KEYS);
  const maintenanceOn = bool(settings.maintenance_mode);

  return (
    <>
      <div className="space-y-5">
        <SectionHeader
          title="Appearance"
          description="Brand colors, assets and site-wide display settings."
        />

        <Card className="p-6 space-y-6">
          {/* Colors */}
          <div>
            <p className="text-xs font-bold text-[#78716C] uppercase tracking-widest mb-4">Brand Colors</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <ColorField
                label="Brand Color"
                value={str(settings.brand_color)}
                fallback="#EC4824"
                onChange={v => onChange('brand_color', v)}
              />
              <ColorField
                label="Secondary Color"
                value={str(settings.brand_color_secondary)}
                fallback="#0d0d0d"
                onChange={v => onChange('brand_color_secondary', v)}
              />
            </div>
          </div>

          <div className="h-px bg-[#EDE8E3]" />

          {/* URLs */}
          <div className="space-y-5">
            <Field label="Logo URL">
              <input
                type="url"
                className={inputClass}
                placeholder="https://example.com/logo.png"
                value={str(settings.logo_url)}
                onChange={e => onChange('logo_url', e.target.value)}
              />
            </Field>
            <Field label="Hero Image URL">
              <input
                type="url"
                className={inputClass}
                placeholder="https://example.com/hero.jpg"
                value={str(settings.hero_image_url)}
                onChange={e => onChange('hero_image_url', e.target.value)}
              />
            </Field>
          </div>

          <div className="h-px bg-[#EDE8E3]" />

          {/* Display toggles */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Show Announcement Bar</p>
                <p className="text-xs text-[#A8A29E] mt-0.5">
                  Display the scrolling announcement banner on the public site
                </p>
              </div>
              <Toggle
                value={bool(settings.show_announcement_bar)}
                onChange={v => onChange('show_announcement_bar', v ? '1' : '0')}
              />
            </div>

            <div className="h-px bg-[#EDE8E3]" />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Maintenance Mode</p>
                {maintenanceOn ? (
                  <p className="text-xs text-red-400 mt-0.5 flex items-center gap-1.5">
                    <HiExclamationTriangle size={12} />
                    Enabling this will show a maintenance page to all visitors
                  </p>
                ) : (
                  <p className="text-xs text-[#A8A29E] mt-0.5">
                    Take the site offline for maintenance
                  </p>
                )}
              </div>
              <Toggle
                value={maintenanceOn}
                onChange={v => onChange('maintenance_mode', v ? '1' : '0')}
              />
            </div>
          </div>
        </Card>
      </div>

      <SaveBar dirty={dirty} saving={saving} onSave={onSave} onDiscard={onDiscard} />
    </>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────

export default function Settings() {
  const [activeTab, setActiveTab] = useState<TabId>('restaurant');

  // ── Global settings state ─────────────────────────────────────────────────
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [settings, setSettings]               = useState<SettingsMap>({});
  const [savedSettings, setSavedSettings]     = useState<SettingsMap>({});

  // ── Statuses state ────────────────────────────────────────────────────────
  const [loadingStatuses, setLoadingStatuses]     = useState(false);
  const [statuses, setStatuses]                   = useState<OrderStatus[]>([]);
  const [statusDrafts, setStatusDrafts]           = useState<Record<number, StatusDraft>>({});
  const [savedStatusDrafts, setSavedStatusDrafts] = useState<Record<number, StatusDraft>>({});

  // ── Prep times state ──────────────────────────────────────────────────────
  const [loadingPrepTimes, setLoadingPrepTimes] = useState(false);
  const [menuItems, setMenuItems]               = useState<MenuItem[]>([]);
  const [prepTimes, setPrepTimes]               = useState<Record<number, number>>({});
  const [localPrepTimes, setLocalPrepTimes]     = useState<Record<number, number>>({});

  // ── Per-tab saving flags ──────────────────────────────────────────────────
  const [savingRestaurant,    setSavingRestaurant]    = useState(false);
  const [savingOrders,        setSavingOrders]        = useState(false);
  const [savingPrepTimes,     setSavingPrepTimes]     = useState(false);
  const [savingStatuses,      setSavingStatuses]      = useState(false);
  const [savingPayments,      setSavingPayments]      = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [savingAppearance,    setSavingAppearance]    = useState(false);

  // Track which lazy tabs have already been fetched
  const loadedTabs = useRef(new Set<TabId>());

  // ── Load core settings on mount ───────────────────────────────────────────

  useEffect(() => {
    cdSettingsApi
      .list()
      .then(res => {
        const data: SettingsMap = res.data?.data ?? {};
        setSettings(data);
        setSavedSettings(data);
      })
      .catch(() => {/* leave empty state */})
      .finally(() => setLoadingSettings(false));
  }, []);

  // ── Lazy load: statuses ───────────────────────────────────────────────────

  useEffect(() => {
    if (activeTab !== 'statuses' || loadedTabs.current.has('statuses')) return;
    loadedTabs.current.add('statuses');
    setLoadingStatuses(true);
    statusesApi
      .list()
      .then(res => {
        const payload = res.data?.data ?? res.data ?? [];
        const list: OrderStatus[] = Array.isArray(payload) ? payload : (payload?.data ?? []);
        setStatuses(list);
        const drafts: Record<number, StatusDraft> = {};
        for (const s of list) drafts[s.status_id] = buildStatusDraft(s);
        setStatusDrafts(drafts);
        setSavedStatusDrafts(structuredClone(drafts));
      })
      .catch(() => {/* leave empty state */})
      .finally(() => setLoadingStatuses(false));
  }, [activeTab]);

  // ── Lazy load: prep times + menu items ────────────────────────────────────

  useEffect(() => {
    if (activeTab !== 'preptimes' || loadedTabs.current.has('preptimes')) return;
    loadedTabs.current.add('preptimes');
    setLoadingPrepTimes(true);
    Promise.all([menuItemsApi.list(), prepTimesApi.list()])
      .then(([menuRes, prepRes]) => {
        const items: MenuItem[] = (menuRes.data?.data ?? []).map((m: Record<string, unknown>) => ({
          menu_id: m.menu_id as number,
          menu_name: m.menu_name as string,
        }));
        const times: Record<number, number> = prepRes.data ?? {};
        setMenuItems(items);
        setPrepTimes(times);
        setLocalPrepTimes({});
      })
      .catch(() => {/* leave empty state */})
      .finally(() => setLoadingPrepTimes(false));
  }, [activeTab]);

  // ── Generic settings change ───────────────────────────────────────────────

  const handleSettingChange = useCallback((key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  // ── Generic save + discard for key groups ─────────────────────────────────

  const saveKeys = useCallback(
    async (keys: readonly string[], setSaving: (v: boolean) => void) => {
      setSaving(true);
      const pairs: SettingsMap = {};
      for (const k of keys) {
        const v = settings[k] ?? '';
        // Skip keys still holding the server-side mask — the user hasn't
        // changed them, and sending '••••••••' would overwrite the real key.
        if (v !== SETTINGS_MASK) pairs[k] = v;
      }
      try {
        await cdSettingsApi.setMany(pairs as Record<string, unknown>);
        setSavedSettings(prev => ({ ...prev, ...pairs }));
      } finally {
        setSaving(false);
      }
    },
    [settings],
  );

  const discardKeys = useCallback(
    (keys: readonly string[]) => {
      setSettings(prev => {
        const next = { ...prev };
        for (const k of keys) next[k] = savedSettings[k] ?? '';
        return next;
      });
    },
    [savedSettings],
  );

  // ── Restaurant ────────────────────────────────────────────────────────────

  const handleSaveRestaurant = useCallback(
    () => saveKeys(RESTAURANT_KEYS, setSavingRestaurant),
    [saveKeys],
  );
  const handleDiscardRestaurant = useCallback(
    () => discardKeys(RESTAURANT_KEYS),
    [discardKeys],
  );

  // ── Orders ────────────────────────────────────────────────────────────────

  const handleSaveOrders = useCallback(
    () => saveKeys(ORDERS_KEYS, setSavingOrders),
    [saveKeys],
  );
  const handleDiscardOrders = useCallback(
    () => discardKeys(ORDERS_KEYS),
    [discardKeys],
  );

  // ── Payments ──────────────────────────────────────────────────────────────

  const handleSavePayments = useCallback(
    () => saveKeys(PAYMENTS_KEYS, setSavingPayments),
    [saveKeys],
  );
  const handleDiscardPayments = useCallback(
    () => discardKeys(PAYMENTS_KEYS),
    [discardKeys],
  );

  // ── Notifications ─────────────────────────────────────────────────────────

  const handleSaveNotifications = useCallback(
    () => saveKeys(NOTIFICATIONS_KEYS, setSavingNotifications),
    [saveKeys],
  );
  const handleDiscardNotifications = useCallback(
    () => discardKeys(NOTIFICATIONS_KEYS),
    [discardKeys],
  );

  // ── Appearance ────────────────────────────────────────────────────────────

  const handleSaveAppearance = useCallback(
    () => saveKeys(APPEARANCE_KEYS, setSavingAppearance),
    [saveKeys],
  );
  const handleDiscardAppearance = useCallback(
    () => discardKeys(APPEARANCE_KEYS),
    [discardKeys],
  );

  // ── Prep times ────────────────────────────────────────────────────────────

  const handleChangePrepTime = useCallback((menuId: number, minutes: number) => {
    setLocalPrepTimes(prev => ({ ...prev, [menuId]: minutes }));
  }, []);

  const handleSavePrepTimes = useCallback(async () => {
    setSavingPrepTimes(true);
    const changed = Object.entries(localPrepTimes).filter(
      ([id, min]) => min !== (prepTimes[Number(id)] ?? 15),
    );
    try {
      await Promise.all(
        changed.map(([id, minutes]) => prepTimesApi.update(Number(id), minutes)),
      );
      setPrepTimes(prev => {
        const next = { ...prev };
        for (const [id, min] of changed) next[Number(id)] = min;
        return next;
      });
      setLocalPrepTimes({});
    } finally {
      setSavingPrepTimes(false);
    }
  }, [localPrepTimes, prepTimes]);

  const handleDiscardPrepTimes = useCallback(() => {
    setLocalPrepTimes({});
  }, []);

  // ── Statuses ──────────────────────────────────────────────────────────────

  const handleChangeStatusDraft = useCallback(
    (id: number, patch: Partial<StatusDraft>) => {
      setStatusDrafts(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
    },
    [],
  );

  const handleToggleNotify = useCallback(async (id: number) => {
    const current = statusDrafts[id]?.notify_customer ?? false;
    const next = !current;

    // Optimistic update across all state layers
    const applyUpdate = (
      setDrafts: React.Dispatch<React.SetStateAction<Record<number, StatusDraft>>>,
    ) => {
      setDrafts(prev =>
        prev[id] ? { ...prev, [id]: { ...prev[id], notify_customer: next } } : prev,
      );
    };

    applyUpdate(setStatusDrafts);
    applyUpdate(setSavedStatusDrafts);
    setStatuses(prev =>
      prev.map(s => s.status_id === id ? { ...s, notify_customer: next } : s),
    );

    try {
      await statusesApi.update(id, { notify_customer: next });
    } catch {
      // Revert everything on failure
      const revert = (
        setDrafts: React.Dispatch<React.SetStateAction<Record<number, StatusDraft>>>,
      ) => {
        setDrafts(prev =>
          prev[id] ? { ...prev, [id]: { ...prev[id], notify_customer: current } } : prev,
        );
      };
      revert(setStatusDrafts);
      revert(setSavedStatusDrafts);
      setStatuses(prev =>
        prev.map(s => s.status_id === id ? { ...s, notify_customer: current } : s),
      );
    }
  }, [statusDrafts]);

  const handleSaveStatuses = useCallback(async () => {
    setSavingStatuses(true);
    const toUpdate = statuses.filter(s => {
      const d = statusDrafts[s.status_id];
      if (!d) return false;
      return (
        d.status_name !== s.status_name ||
        d.status_color !== (s.status_color || '#6b7280') ||
        d.sort_order !== (s.sort_order ?? 0)
      );
    });
    try {
      await Promise.all(
        toUpdate.map(s =>
          statusesApi.update(s.status_id, {
            status_name:      statusDrafts[s.status_id].status_name,
            status_color:     statusDrafts[s.status_id].status_color,
            notify_customer:  statusDrafts[s.status_id].notify_customer,
            sort_order:       statusDrafts[s.status_id].sort_order,
          }),
        ),
      );
      // Sync canonical statuses with saved drafts
      setStatuses(prev =>
        prev.map(s => {
          const d = statusDrafts[s.status_id];
          if (!d) return s;
          return {
            ...s,
            status_name:     d.status_name,
            status_color:    d.status_color,
            sort_order:      d.sort_order,
            notify_customer: d.notify_customer,
          };
        }),
      );
      setSavedStatusDrafts(structuredClone(statusDrafts));
    } finally {
      setSavingStatuses(false);
    }
  }, [statuses, statusDrafts]);

  const handleDiscardStatuses = useCallback(() => {
    setStatusDrafts(structuredClone(savedStatusDrafts));
  }, [savedStatusDrafts]);

  // ── Dirty flags ───────────────────────────────────────────────────────────

  const dirtyRestaurant = keysDiffer(settings, savedSettings, RESTAURANT_KEYS);
  const dirtyOrders     = keysDiffer(settings, savedSettings, ORDERS_KEYS);
  const dirtyPayments   = keysDiffer(settings, savedSettings, PAYMENTS_KEYS);
  const dirtyNotifs     = keysDiffer(settings, savedSettings, NOTIFICATIONS_KEYS);
  const dirtyAppearance = keysDiffer(settings, savedSettings, APPEARANCE_KEYS);
  const dirtyStatuses   = statusDraftsDirty(statusDrafts, statuses);
  const dirtyPrepTimes  = Object.entries(localPrepTimes).some(
    ([id, min]) => min !== (prepTimes[Number(id)] ?? 15),
  );

  function tabIsDirty(id: TabId): boolean {
    switch (id) {
      case 'restaurant':    return dirtyRestaurant;
      case 'orders':        return dirtyOrders;
      case 'preptimes':     return dirtyPrepTimes;
      case 'statuses':      return dirtyStatuses;
      case 'payments':      return dirtyPayments;
      case 'notifications': return dirtyNotifs;
      case 'appearance':    return dirtyAppearance;
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loadingSettings) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner size={36} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-black text-[#1C1917]">Settings</h1>
        <p className="text-[#A8A29E] text-sm mt-0.5">Configure every aspect of your restaurant app</p>
      </div>

      <div className="flex gap-6 items-start">

        {/* Sidebar tab list */}
        <aside className="w-52 flex-shrink-0 sticky top-6 space-y-0.5">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            const hasDirty = tabIsDirty(tab.id);

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                  isActive
                    ? 'bg-[#EC4824] text-white shadow-sm'
                    : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#F5EFE8]'
                }`}
              >
                <span className="flex-shrink-0">{tab.icon}</span>
                <span className="flex-1 truncate">{tab.label}</span>
                {hasDirty && (
                  <span className="w-2 h-2 rounded-full bg-[#EC4824] flex-shrink-0" />
                )}
              </button>
            );
          })}
        </aside>

        {/* Tab content */}
        <div className="flex-1 min-w-0">
          {activeTab === 'restaurant' && (
            <RestaurantTab
              settings={settings}
              savedSettings={savedSettings}
              onChange={handleSettingChange}
              dirty={dirtyRestaurant}
              saving={savingRestaurant}
              onSave={handleSaveRestaurant}
              onDiscard={handleDiscardRestaurant}
            />
          )}

          {activeTab === 'orders' && (
            <OrderConfigTab
              settings={settings}
              savedSettings={savedSettings}
              onChange={handleSettingChange}
              dirty={dirtyOrders}
              saving={savingOrders}
              onSave={handleSaveOrders}
              onDiscard={handleDiscardOrders}
            />
          )}

          {activeTab === 'preptimes' && (
            <PrepTimesTab
              menuItems={menuItems}
              prepTimes={prepTimes}
              localPrepTimes={localPrepTimes}
              onChangePrepTime={handleChangePrepTime}
              dirty={dirtyPrepTimes}
              saving={savingPrepTimes}
              onSave={handleSavePrepTimes}
              onDiscard={handleDiscardPrepTimes}
              loading={loadingPrepTimes}
            />
          )}

          {activeTab === 'statuses' && (
            <OrderStatusesTab
              statuses={statuses}
              drafts={statusDrafts}
              onChangeDraft={handleChangeStatusDraft}
              onToggleNotify={handleToggleNotify}
              dirty={dirtyStatuses}
              saving={savingStatuses}
              onSave={handleSaveStatuses}
              onDiscard={handleDiscardStatuses}
              loading={loadingStatuses}
            />
          )}

          {activeTab === 'payments' && (
            <PaymentsTab
              settings={settings}
              savedSettings={savedSettings}
              onChange={handleSettingChange}
              dirty={dirtyPayments}
              saving={savingPayments}
              onSave={handleSavePayments}
              onDiscard={handleDiscardPayments}
            />
          )}

          {activeTab === 'notifications' && (
            <NotificationsTab
              settings={settings}
              savedSettings={savedSettings}
              onChange={handleSettingChange}
              dirty={dirtyNotifs}
              saving={savingNotifications}
              onSave={handleSaveNotifications}
              onDiscard={handleDiscardNotifications}
            />
          )}

          {activeTab === 'appearance' && (
            <AppearanceTab
              settings={settings}
              savedSettings={savedSettings}
              onChange={handleSettingChange}
              dirty={dirtyAppearance}
              saving={savingAppearance}
              onSave={handleSaveAppearance}
              onDiscard={handleDiscardAppearance}
            />
          )}
        </div>
      </div>
    </div>
  );
}
