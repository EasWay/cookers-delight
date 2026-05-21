import React from 'react';
import { HiXMark, HiExclamationTriangle } from 'react-icons/hi2';

// ── Badge ──────────────────────────────────────────────────────────────────────
interface BadgeProps { color?: string; children: React.ReactNode; }
export function Badge({ color = '#78716C', children }: BadgeProps) {
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold"
      style={{ backgroundColor: color + '18', color }}
    >
      {children}
    </span>
  );
}

// ── Card ───────────────────────────────────────────────────────────────────────
export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`bg-white rounded-2xl ${className}`}
      style={{
        border: '1px solid #EDE8E3',
        boxShadow: '0 1px 3px rgba(28,25,23,0.06), 0 4px 12px rgba(28,25,23,0.04)',
      }}
    >
      {children}
    </div>
  );
}

// ── StatCard ───────────────────────────────────────────────────────────────────
interface StatCardProps {
  label:  string;
  value:  string | number;
  sub?:   string;
  icon:   React.ReactNode;
  color?: string;
  tint?:  string;
}
export function StatCard({ label, value, sub, icon, color = '#EC4824', tint }: StatCardProps) {
  const bgTint = tint ?? (
    color === '#22c55e' ? '#F0FDF4' :
    color === '#3b82f6' ? '#EFF6FF' :
    color === '#eab308' || color === '#d97706' ? '#FFFBEB' :
    color === '#a855f7' ? '#FAF5FF' :
    '#FFF1EE'
  );
  return (
    <div
      className="rounded-2xl p-4 sm:p-5 flex flex-col gap-3 min-w-0 overflow-hidden"
      style={{ backgroundColor: bgTint, border: `1px solid ${color}22` }}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className="text-xs font-bold uppercase tracking-[0.12em] truncate"
          style={{ color: '#78716C' }}
        >
          {label}
        </p>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: color + '18', color }}
        >
          {icon}
        </div>
      </div>
      <div>
        <p
          className="text-2xl sm:text-3xl font-black leading-none truncate"
          style={{ color: '#1C1917' }}
          title={String(value)}
        >
          {value}
        </p>
        {sub && (
          <p className="text-xs mt-1.5 font-medium truncate" style={{ color }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

// ── SaveBar ────────────────────────────────────────────────────────────────────
interface SaveBarProps { dirty: boolean; saving: boolean; onSave: () => void; onDiscard: () => void; }
export function SaveBar({ dirty, saving, onSave, onDiscard }: SaveBarProps) {
  if (!dirty) return null;
  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-white rounded-2xl px-6 py-3 shadow-2xl"
      style={{ border: '1px solid #EDE8E3' }}
    >
      <span className="text-sm text-[#78716C]">Unsaved changes</span>
      <button
        onClick={onDiscard}
        className="text-sm text-[#A8A29E] hover:text-[#1C1917] px-3 py-1.5 rounded-lg hover:bg-[#F5EFE8] transition-colors"
      >
        Discard
      </button>
      <button
        onClick={onSave}
        disabled={saving}
        className="text-sm font-bold bg-[#EC4824] text-white px-5 py-1.5 rounded-lg hover:bg-[#d4401f] disabled:opacity-50 transition-colors"
      >
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────────
interface ModalProps { open: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: 'sm' | 'md' | 'lg'; }
export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  if (!open) return null;
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };
  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative w-full ${widths[size]} bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col`}
        style={{ border: '1px solid #EDE8E3' }}
      >
        <div
          className="flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid #EDE8E3' }}
        >
          <h3 className="font-bold text-base sm:text-lg text-[#1C1917] truncate">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 flex items-center justify-center rounded-xl text-[#78716C] hover:text-[#1C1917] hover:bg-[#F5EFE8] transition-colors flex-shrink-0"
          >
            <HiXMark size={18} />
          </button>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

// ── Confirm ────────────────────────────────────────────────────────────────────
interface ConfirmProps { open: boolean; onConfirm: () => void; onCancel: () => void; message: string; danger?: boolean; }
export function Confirm({ open, onConfirm, onCancel, message, danger = false }: ConfirmProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" onClick={onCancel} />
      <div
        className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 space-y-4"
        style={{ border: '1px solid #EDE8E3' }}
      >
        <div className="flex gap-3 items-start">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              danger ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'
            }`}
          >
            <HiExclamationTriangle size={20} />
          </div>
          <p className="text-[#78716C] text-sm leading-relaxed pt-1.5">{message}</p>
        </div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-[#78716C] hover:text-[#1C1917] rounded-xl hover:bg-[#F5EFE8] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-bold rounded-xl transition-colors text-white ${
              danger ? 'bg-red-500 hover:bg-red-600' : 'bg-[#EC4824] hover:bg-[#d4401f]'
            }`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Field ──────────────────────────────────────────────────────────────────────
interface FieldProps { label: string; hint?: string; required?: boolean; children: React.ReactNode; }
export function Field({ label, hint, required, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-[#78716C] uppercase tracking-widest">
        {label}{required && <span className="text-[#EC4824] ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-[#A8A29E]">{hint}</p>}
    </div>
  );
}

// ── Input / Select class strings ───────────────────────────────────────────────
export const inputClass = "w-full bg-[#FAFAFA] border border-[#EDE8E3] rounded-xl px-4 py-2.5 text-[#1C1917] text-sm focus:border-[#EC4824] focus:ring-2 focus:ring-[#EC482410] focus:outline-none transition-all placeholder:text-[#A8A29E]";
export const selectClass = "w-full bg-[#FAFAFA] border border-[#EDE8E3] rounded-xl px-4 py-2.5 text-[#1C1917] text-sm focus:border-[#EC4824] focus:outline-none transition-all";

// ── Toggle ─────────────────────────────────────────────────────────────────────
interface ToggleProps { value: boolean; onChange: (v: boolean) => void; label?: string; }
export function Toggle({ value, onChange, label }: ToggleProps) {
  return (
    <button type="button" onClick={() => onChange(!value)} className="flex items-center gap-3 group">
      <div className={`w-11 h-6 rounded-full relative transition-colors ${value ? 'bg-[#EC4824]' : 'bg-[#E7E5E4]'}`}>
        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </div>
      {label && (
        <span className="text-sm text-[#78716C] group-hover:text-[#1C1917] transition-colors">{label}</span>
      )}
    </button>
  );
}

// ── Spinner ────────────────────────────────────────────────────────────────────
export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <div
      className="animate-spin rounded-full border-2 border-[#EDE8E3] border-t-[#EC4824]"
      style={{ width: size, height: size }}
    />
  );
}

// ── EmptyState ─────────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, action }: { icon: React.ReactNode; title: string; action?: React.ReactNode }) {
  return (
    <div className="text-center py-20 space-y-4">
      <div className="text-[#EDE8E3] flex justify-center">{icon}</div>
      <p className="text-[#A8A29E] font-bold">{title}</p>
      {action}
    </div>
  );
}
