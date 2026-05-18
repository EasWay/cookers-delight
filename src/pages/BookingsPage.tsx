import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  HiArrowLongRight, HiArrowLeft, HiCalendarDays, HiClock, HiMapPin, HiUsers,
  HiUser, HiEnvelope, HiPhone, HiChatBubbleBottomCenterText,
} from 'react-icons/hi2';
import { reservationApi } from '../lib/api';
import { usePageContext } from './PublicLayout';
import PageWrapper from '../components/PageWrapper';
import SEOHead from '../components/SEOHead';
import { haptic } from '../utils/haptics';

// TODO: replace id with the real TastyIgniter location_id from the admin panel (Manage → Locations → Kaneshie)
export const BRANCHES = [
  { id: 1, name: 'Kaneshie', address: 'Opposite Cocoa Clinic, Kaneshie' },
];

const GUEST_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  telephone: string;
  reserve_date: string;
  reserve_time: string;
  guest_num: number;
  location_id: number;
  comment: string;
}

const DEFAULT_FORM: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  telephone: '',
  reserve_date: '',
  reserve_time: '',
  guest_num: 2,
  location_id: BRANCHES[0].id,
  comment: '',
};

const STEPS = ['When', 'Where', 'Details'] as const;
type Step = 0 | 1 | 2;

function fallbackSlots(): string[] {
  const out: string[] = [];
  for (let h = 10; h <= 21; h++) {
    out.push(`${String(h).padStart(2, '0')}:00`);
    if (h < 21) out.push(`${String(h).padStart(2, '0')}:30`);
  }
  return out;
}

export default function BookingsPage() {
  const { addToast } = usePageContext();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(0);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!form.reserve_date || !form.guest_num || !form.location_id) return;
    let cancelled = false;
    setLoadingSlots(true);
    setSlots([]);
    setForm(prev => ({ ...prev, reserve_time: '' }));

    reservationApi
      .getSlots({ date: form.reserve_date, guests: form.guest_num, location_id: form.location_id })
      .then(res => {
        if (!cancelled) setSlots(res.data?.data ?? []);
      })
      .catch(() => { if (!cancelled) setSlots(fallbackSlots()); })
      .finally(() => { if (!cancelled) setLoadingSlots(false); });

    return () => { cancelled = true; };
  }, [form.reserve_date, form.guest_num, form.location_id]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const allSlots = useMemo(() => {
    // Treat returned slots as Available; everything else (in fallback) as Occupied.
    if (slots.length > 0) return slots;
    return [];
  }, [slots]);

  const canAdvance = (s: Step) => {
    if (s === 0) return !!form.reserve_date && !!form.reserve_time;
    if (s === 1) return !!form.location_id && !!form.guest_num;
    return !!form.firstName && !!form.lastName && !!form.email && !!form.telephone;
  };

  const goNext = () => {
    if (!canAdvance(step)) return;
    haptic(8);
    if (step < 2) setStep((step + 1) as Step);
    else handleSubmit();
  };

  const goBack = () => {
    haptic(6);
    if (step === 0) navigate(-1);
    else setStep((step - 1) as Step);
  };

  const handleSubmit = async () => {
    setSubmitError('');
    setSubmitting(true);
    try {
      await reservationApi.create({
        first_name: form.firstName,
        last_name: form.lastName,
        email: form.email,
        telephone: form.telephone,
        guest_num: form.guest_num,
        reserve_date: form.reserve_date,
        reserve_time: form.reserve_time,
        location_id: form.location_id,
        comment: form.comment,
      });
      addToast('Reservation confirmed');
      navigate('/bookings/confirmation', {
        state: {
          branchName: BRANCHES.find(b => b.id === form.location_id)?.address,
          reserveDate: form.reserve_date,
          reserveTime: form.reserve_time,
          guestNum: form.guest_num,
          email: form.email,
        },
      });
    } catch {
      setSubmitError('Something went wrong. Please try again or call us directly.');
    } finally {
      setSubmitting(false);
    }
  };

  const ctaLabel =
    step === 2
      ? submitting
        ? 'Confirming…'
        : 'Confirm reservation'
      : 'Continue';

  return (
    <PageWrapper>
      <SEOHead
        title="Book a Table | Cookers Delight"
        description="Reserve a table at Cookers Delight in Accra. Book online in minutes — choose your branch, date, time, and party size."
        canonical="https://cookers-delight.vercel.app/bookings"
      />

      <div className="min-h-[100dvh] bg-[#FFFBF7] pb-32">
        {/* Top bar with back + progress */}
        <div className="sticky top-[60px] z-40 bg-[#FFFBF7]/95 backdrop-blur-md border-b border-[#E8E0D8]">
          <div className="max-w-2xl mx-auto px-5 py-4 flex items-center gap-3">
            <button
              onClick={goBack}
              className="w-10 h-10 rounded-full bg-white border border-[#E8E0D8] flex items-center justify-center text-[#1C1917] active:scale-95 transition"
              aria-label="Back"
            >
              <HiArrowLeft size={18} />
            </button>
            <div className="flex-1 text-center">
              <span className="warm-section-label">Book table</span>
              <p className="font-display text-xl font-bold text-[#1C1917] leading-none mt-0.5">
                Step {step + 1} of 3
              </p>
            </div>
            <div className="w-10" />
          </div>
          <div className="max-w-2xl mx-auto px-5 pb-3 flex items-center gap-2">
            {STEPS.map((_, i) => (
              <div key={i} className={`flex-1 h-1.5 rounded-full ${i <= step ? 'bg-[#1B5E20]' : 'bg-[#E8E0D8]'}`} />
            ))}
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-5 pt-6">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="step-0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#1C1917]">
                  Pick your <span className="text-[#1B5E20] italic font-normal">time</span>
                </h1>
                <p className="text-sm text-[#78716C] mt-2">
                  Choose the day you&apos;d like to visit, then select an available slot.
                </p>

                {/* Date */}
                <div className="app-card p-5 mt-6">
                  <label className="text-xs font-bold uppercase tracking-widest text-[#78716C] flex items-center gap-2">
                    <HiCalendarDays size={14} /> Date
                  </label>
                  <input
                    required
                    type="date"
                    value={form.reserve_date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => set('reserve_date', e.target.value)}
                    className="mt-2 w-full bg-[#F5EFE8] rounded-2xl px-4 py-3.5 text-base text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#1B5E20]/40"
                  />
                </div>

                {/* Time slots — seat-grid style */}
                <div className="app-card p-5 mt-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-widest text-[#78716C] flex items-center gap-2">
                        <HiClock size={14} /> Available times
                      </label>
                      <p className="text-[11px] text-[#78716C] mt-1">Tap a slot to select.</p>
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="app-status-dot app-status-dot--available">Open</span>
                      <span className="app-status-dot app-status-dot--selected">You</span>
                    </div>
                  </div>

                  {!form.reserve_date ? (
                    <p className="text-sm text-[#A8A29E] py-8 text-center">Pick a date to see times.</p>
                  ) : loadingSlots ? (
                    <div className="grid grid-cols-4 gap-3">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="seat-tile bg-[#F5EFE8] animate-pulse" />
                      ))}
                    </div>
                  ) : allSlots.length === 0 ? (
                    <p className="text-sm text-[#A8A29E] py-8 text-center">No slots available. Try another day.</p>
                  ) : (
                    <div className="grid grid-cols-4 gap-3">
                      {allSlots.map(slot => {
                        const selected = form.reserve_time === slot;
                        return (
                          <motion.button
                            key={slot}
                            type="button"
                            onClick={() => { set('reserve_time', slot); haptic(8); }}
                            whileTap={{ scale: 0.94 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                            className={`seat-tile ${selected ? 'seat-tile--selected' : 'seat-tile--available'}`}
                            aria-pressed={selected}
                          >
                            {slot}
                          </motion.button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#1C1917]">
                  Pick your <span className="text-[#1B5E20] italic font-normal">spot</span>
                </h1>
                <p className="text-sm text-[#78716C] mt-2">Choose a branch and how many of you are coming.</p>

                {/* Branch picker */}
                <div className="app-card p-5 mt-6">
                  <label className="text-xs font-bold uppercase tracking-widest text-[#78716C] flex items-center gap-2">
                    <HiMapPin size={14} /> Branch
                  </label>
                  <div className="mt-3 space-y-2">
                    {BRANCHES.map(branch => {
                      const selected = form.location_id === branch.id;
                      return (
                        <motion.button
                          key={branch.id}
                          type="button"
                          onClick={() => { set('location_id', branch.id); haptic(6); }}
                          whileTap={{ scale: 0.985 }}
                          className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border-2 transition-colors ${
                            selected ? 'border-[#1B5E20] bg-[#DCFCE7]' : 'border-[#E8E0D8] bg-white'
                          }`}
                          aria-pressed={selected}
                        >
                          <span className="font-bold text-[#1C1917]">{branch.name}</span>
                          <span className={selected ? 'app-status-dot app-status-dot--selected' : 'app-status-dot app-status-dot--available'}>
                            {selected ? 'Selected' : 'Open'}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Guest count */}
                <div className="app-card p-5 mt-4">
                  <label className="text-xs font-bold uppercase tracking-widest text-[#78716C] flex items-center gap-2">
                    <HiUsers size={14} /> Guests
                  </label>
                  <div className="grid grid-cols-4 gap-3 mt-3">
                    {GUEST_OPTIONS.map(n => {
                      const selected = form.guest_num === n;
                      return (
                        <motion.button
                          key={n}
                          type="button"
                          onClick={() => { set('guest_num', n); haptic(6); }}
                          whileTap={{ scale: 0.94 }}
                          className={`seat-tile ${selected ? 'seat-tile--selected' : 'seat-tile--available'}`}
                          aria-pressed={selected}
                        >
                          <span className="text-2xl font-display font-black">{n}</span>
                          <span className="text-[9px] font-bold uppercase tracking-wider opacity-70">
                            {n === 1 ? 'Guest' : 'Guests'}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#1C1917]">
                  Your <span className="text-[#1B5E20] italic font-normal">details</span>
                </h1>
                <p className="text-sm text-[#78716C] mt-2">We&apos;ll text you a confirmation.</p>

                <div className="app-card p-5 mt-6 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <InputField icon={<HiUser size={14} />} label="First name" value={form.firstName} onChange={v => set('firstName', v)} placeholder="Kwame" />
                    <InputField label="Last name" value={form.lastName} onChange={v => set('lastName', v)} placeholder="Mensah" />
                  </div>
                  <InputField icon={<HiEnvelope size={14} />} label="Email" type="email" value={form.email} onChange={v => set('email', v)} placeholder="you@example.com" />
                  <InputField icon={<HiPhone size={14} />} label="Phone" type="tel" value={form.telephone} onChange={v => set('telephone', v)} placeholder="+233 24 XXX XXXX" />
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-[#78716C] flex items-center gap-2">
                      <HiChatBubbleBottomCenterText size={12} /> Special requests (optional)
                    </label>
                    <textarea
                      value={form.comment}
                      onChange={e => set('comment', e.target.value)}
                      rows={3}
                      placeholder="Dietary requirements, seating preferences, celebrations…"
                      className="mt-2 w-full bg-[#F5EFE8] rounded-2xl px-4 py-3 text-sm text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#1B5E20]/40 resize-none"
                    />
                  </div>
                </div>

                {/* Summary */}
                <div className="app-tile-dark p-5 mt-4">
                  <span className="app-label-light">Summary</span>
                  <div className="mt-2 text-sm text-white/90 space-y-1.5">
                    <div className="flex justify-between"><span className="text-white/60">Date</span><span className="font-bold">{form.reserve_date || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-white/60">Time</span><span className="font-bold">{form.reserve_time || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-white/60">Branch</span><span className="font-bold text-right">{BRANCHES.find(b => b.id === form.location_id)?.address}</span></div>
                    <div className="flex justify-between"><span className="text-white/60">Guests</span><span className="font-bold">{form.guest_num}</span></div>
                  </div>
                </div>

                {submitError && (
                  <p className="text-[#EF4444] text-sm mt-4 text-center">{submitError}</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sticky CTA */}
        <div className="app-cta-sticky">
          <motion.button
            onClick={goNext}
            disabled={!canAdvance(step) || submitting}
            whileTap={{ scale: 0.98 }}
            className="app-cta-primary disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={ctaLabel}
          >
            <span className="text-sm">{ctaLabel}</span>
            <span className="app-cta-chip"><HiArrowLongRight size={16} /></span>
          </motion.button>
        </div>
      </div>
    </PageWrapper>
  );
}

function InputField({
  label, value, onChange, type = 'text', placeholder, icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-xs font-bold uppercase tracking-widest text-[#78716C] flex items-center gap-2">
        {icon} {label}
      </label>
      <input
        required
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full bg-[#F5EFE8] rounded-2xl px-4 py-3 text-base text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#1B5E20]/40"
      />
    </div>
  );
}
