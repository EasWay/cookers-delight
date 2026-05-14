/**
 * Shared admin UI primitives.
 * Keep this file focused: only stateless presentational pieces.
 */
import React from 'react';
import { HiXMark, HiExclamationTriangle } from 'react-icons/hi2';

// ─── Badge ────────────────────────────────────────────────────────────────────
interface BadgeProps { color?: string; children: React.ReactNode; }
export function Badge({ color = '#6b7280', children }: BadgeProps) {
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold"
      style={{ backgroundColor: color + '22', color }}
    >
      {children}
    </span>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#111] border border-white/8 rounded-2xl ${className}`}>
      {children}
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
interface StatCardProps { label: string; value: string | number; sub?: string; icon: React.ReactNode; color?: string; }
export function StatCard({ label, value, sub, icon, color = '#EC4824' }: StatCardProps) {
  return (
    <Card className="p-6 flex items-start gap-4">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
           style={{ backgroundColor: color + '18', color }}>
        {icon}
      </div>
      <div>
        <p className="text-white/40 text-xs font-bold uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-black text-white mt-0.5">{value}</p>
        {sub && <p className="text-xs text-white/30 mt-0.5">{sub}</p>}
      </div>
    </Card>
  );
}

// ─── SaveBar ─────────────────────────────────────────────────────────────────
interface SaveBarProps { dirty: boolean; saving: boolean; onSave: () => void; onDiscard: () => void; }
export function SaveBar({ dirty, saving, onSave, onDiscard }: SaveBarProps) {
  if (!dirty) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-[#1a1a1a] border border-white/15 rounded-2xl px-6 py-3 shadow-2xl shadow-black/60">
      <span className="text-sm text-white/60">Unsaved changes</span>
      <button onClick={onDiscard} className="text-sm text-white/40 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5">
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

// ─── Modal ────────────────────────────────────────────────────────────────────
interface ModalProps { open: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: 'sm' | 'md' | 'lg'; }
export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  if (!open) return null;
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${widths[size]} bg-[#111] border border-white/10 rounded-2xl shadow-2xl`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <h3 className="font-bold text-lg">{title}</h3>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors">
            <HiXMark size={20} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ─── Confirm dialog ───────────────────────────────────────────────────────────
interface ConfirmProps { open: boolean; onConfirm: () => void; onCancel: () => void; message: string; danger?: boolean; }
export function Confirm({ open, onConfirm, onCancel, message, danger = false }: ConfirmProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm bg-[#111] border border-white/10 rounded-2xl shadow-2xl p-6 space-y-4">
        <div className="flex gap-3 items-start">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${danger ? 'bg-red-500/15 text-red-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
            <HiExclamationTriangle size={20} />
          </div>
          <p className="text-white/80 text-sm leading-relaxed pt-1.5">{message}</p>
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-white/50 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${danger ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-[#EC4824] hover:bg-[#d4401f] text-white'}`}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────
interface FieldProps { label: string; hint?: string; required?: boolean; children: React.ReactNode; }
export function Field({ label, hint, required, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-white/50 uppercase tracking-widest">
        {label}{required && <span className="text-[#EC4824] ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-white/30">{hint}</p>}
    </div>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────
export const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-[#EC4824] focus:outline-none transition-colors placeholder:text-white/25";
export const selectClass = "w-full bg-[#0d0d0d] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-[#EC4824] focus:outline-none transition-colors";

// ─── Toggle ───────────────────────────────────────────────────────────────────
interface ToggleProps { value: boolean; onChange: (v: boolean) => void; label?: string; }
export function Toggle({ value, onChange, label }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex items-center gap-3 group"
    >
      <div className={`w-11 h-6 rounded-full relative transition-colors ${value ? 'bg-[#EC4824]' : 'bg-white/15'}`}>
        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </div>
      {label && <span className="text-sm text-white/70 group-hover:text-white transition-colors">{label}</span>}
    </button>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <div
      className="animate-spin rounded-full border-2 border-white/20 border-t-[#EC4824]"
      style={{ width: size, height: size }}
    />
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, action }: { icon: React.ReactNode; title: string; action?: React.ReactNode }) {
  return (
    <div className="text-center py-20 space-y-4">
      <div className="text-white/10 flex justify-center">{icon}</div>
      <p className="text-white/30 font-bold">{title}</p>
      {action}
    </div>
  );
}
