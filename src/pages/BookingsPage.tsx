import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  HiCalendarDays,
  HiClock,
  HiUsers,
  HiMapPin,
  HiCheckCircle,
  HiEnvelope,
  HiPhone,
  HiUser,
  HiChatBubbleBottomCenterText,
} from 'react-icons/hi2';
import { reservationApi } from '../lib/api';
import { usePageContext } from './PublicLayout';
import PageWrapper from '../components/PageWrapper';
import SEOHead from '../components/SEOHead';

// ─── Static branch data (4 Cookers Delight locations) ────────────────────────
const BRANCHES = [
  { id: 1, name: 'Adenta Command' },
  { id: 2, name: 'Madina Zongo Junction' },
  { id: 3, name: 'Ashiyie' },
  { id: 4, name: 'Haatso' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const inputClass =
  'w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-base text-white focus:border-brand-orange outline-none transition-colors placeholder:text-white/30 min-h-[44px]';

const labelClass = 'block text-xs uppercase font-bold text-white/40 tracking-widest mb-2';

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

// ─── Component ────────────────────────────────────────────────────────────────
export default function BookingsPage() {
  const { addToast } = usePageContext();

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [slotError, setSlotError] = useState('');
  const [submitError, setSubmitError] = useState('');

  // ── Fetch time slots whenever date, guests, or location changes ────────────
  useEffect(() => {
    if (!form.reserve_date || !form.guest_num || !form.location_id) return;

    let cancelled = false;
    setLoadingSlots(true);
    setSlots([]);
    setForm(prev => ({ ...prev, reserve_time: '' }));

    reservationApi
      .getSlots({
        date: form.reserve_date,
        guests: form.guest_num,
        location_id: form.location_id,
      })
      .then(res => {
        if (!cancelled) {
          const data = res.data?.data ?? [];
          setSlots(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          // Fall back to default half-hour slots (10:00–21:30)
          const fallback: string[] = [];
          for (let h = 10; h <= 21; h++) {
            fallback.push(`${String(h).padStart(2, '0')}:00`);
            if (h < 21) fallback.push(`${String(h).padStart(2, '0')}:30`);
          }
          setSlots(fallback);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });

    return () => { cancelled = true; };
  }, [form.reserve_date, form.guest_num, form.location_id]);

  // ── Input helpers ──────────────────────────────────────────────────────────
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!form.reserve_time) {
      setSlotError('Please select a time slot before confirming.');
      return;
    }
    setSlotError('');

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
      setSuccess(true);
      addToast('Reservation confirmed! See you soon. ✓');
    } catch {
      setSubmitError('Something went wrong. Please try again or call us directly.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ────────────────────────────────────────────────────────
  if (success) {
    return (
      <PageWrapper>
        <section className="min-h-screen bg-brand-black flex items-center justify-center px-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="bg-white/5 border border-white/10 rounded-[40px] p-16 max-w-xl w-full text-center"
          >
            <div className="text-brand-orange flex justify-center mb-8">
              <HiCheckCircle size={80} />
            </div>
            <h2 className="text-5xl font-bold mb-4">
              You're <span className="text-brand-orange italic font-normal">booked!</span>
            </h2>
            <p className="text-white/50 text-lg mb-4">
              Your reservation at{' '}
              <span className="text-white font-bold">
                {BRANCHES.find(b => b.id === form.location_id)?.name}
              </span>{' '}
              on{' '}
              <span className="text-white font-bold">
                {form.reserve_date} at {form.reserve_time}
              </span>{' '}
              for{' '}
              <span className="text-white font-bold">{form.guest_num} guest{form.guest_num > 1 ? 's' : ''}</span>{' '}
              has been received.
            </p>
            <p className="text-white/40 text-sm mb-12">
              We'll send a confirmation to{' '}
              <span className="text-brand-orange">{form.email}</span>. Want to order food at the
              table? Scan the QR code when you arrive.
            </p>
            <button
              onClick={() => { setSuccess(false); setForm(DEFAULT_FORM); }}
              className="bg-brand-orange text-white px-10 py-4 rounded-2xl font-bold hover:scale-105 transition-all"
            >
              Make Another Booking
            </button>
          </motion.div>
        </section>
      </PageWrapper>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <PageWrapper>
      <SEOHead
        title="Book a Table | Cookers Delight"
        description="Reserve a table at Cookers Delight in Accra. Book online in minutes — choose your branch, date, time, and party size. We'll confirm your reservation promptly."
        canonical="https://cookers-delight.vercel.app/bookings"
      />
      {/* Hero */}
      <section className="relative h-[40vh] flex items-center justify-center overflow-hidden">
        <img
          src="/assets/forcourt2.jpg"
          className="absolute inset-0 w-full h-full object-cover opacity-40"
          alt=""
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-black to-transparent" />
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 text-7xl md:text-9xl font-bold text-center"
        >
          Reser<span className="italic font-normal text-brand-orange">vations</span>
        </motion.h1>
      </section>

      {/* Body */}
      <section className="py-24 bg-brand-black">
        <div className="container mx-auto px-6 max-w-4xl">

          {/* Intro */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-center mb-16"
          >
            <p className="text-white/40 text-lg max-w-xl mx-auto">
              Book your table in under a minute. We'll hold it just for you.
            </p>
          </motion.div>

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="bg-white/5 border border-white/5 rounded-[40px] p-10 md:p-16"
          >
            <form onSubmit={handleSubmit} className="space-y-10">

              {/* ── Row 1: Name ── */}
              <div>
                <p className="text-brand-orange text-xs font-bold uppercase tracking-widest mb-5 flex items-center gap-2">
                  <HiUser size={14} /> Guest Details
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className={labelClass}>First Name</label>
                    <input
                      required
                      type="text"
                      value={form.firstName}
                      onChange={e => set('firstName', e.target.value)}
                      placeholder="Kwame"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Last Name</label>
                    <input
                      required
                      type="text"
                      value={form.lastName}
                      onChange={e => set('lastName', e.target.value)}
                      placeholder="Mensah"
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              {/* ── Row 2: Email & Phone ── */}
              <div className="space-y-6">
                <div>
                  <label className={labelClass}>
                    <HiEnvelope className="inline mr-1" size={12} />
                    Email Address
                  </label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={e => set('email', e.target.value)}
                    placeholder="you@example.com"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    <HiPhone className="inline mr-1" size={12} />
                    Phone Number
                  </label>
                  <input
                    required
                    type="tel"
                    value={form.telephone}
                    onChange={e => set('telephone', e.target.value)}
                    placeholder="+233 24 XXX XXXX"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* ── Row 3: Date, Guests, Location ── */}
              <div>
                <p className="text-brand-orange text-xs font-bold uppercase tracking-widest mb-5 flex items-center gap-2">
                  <HiCalendarDays size={14} /> Booking Details
                </p>
                <div className="space-y-6">
                  <div>
                    <label className={labelClass}>Date</label>
                    <input
                      required
                      type="date"
                      value={form.reserve_date}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={e => set('reserve_date', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className={labelClass}>
                        <HiUsers className="inline mr-1" size={12} />
                        Guests
                      </label>
                      <select
                        value={form.guest_num}
                        onChange={e => set('guest_num', Number(e.target.value))}
                        className={inputClass}
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                          <option key={n} value={n} className="bg-black">
                            {n} {n === 1 ? 'Guest' : 'Guests'}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>
                        <HiMapPin className="inline mr-1" size={12} />
                        Branch Location
                      </label>
                      <select
                        value={form.location_id}
                        onChange={e => set('location_id', Number(e.target.value))}
                        className={inputClass}
                      >
                        {BRANCHES.map(b => (
                          <option key={b.id} value={b.id} className="bg-black">
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Row 4: Time Slots ── */}
              <div>
                <p className="text-brand-orange text-xs font-bold uppercase tracking-widest mb-5 flex items-center gap-2">
                  <HiClock size={14} /> Available Times
                </p>
                {!form.reserve_date ? (
                  <p className="text-white/30 text-sm">Select a date to see available times.</p>
                ) : loadingSlots ? (
                  <div className="flex gap-3 flex-wrap">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="h-12 w-20 bg-white/5 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : slots.length === 0 ? (
                  <p className="text-white/30 text-sm">No slots available for this date. Please choose another day.</p>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {slots.map(slot => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => { set('reserve_time', slot); setSlotError(''); }}
                        className={`px-5 py-3 min-h-[44px] rounded-xl text-sm font-bold border transition-all ${
                          form.reserve_time === slot
                            ? 'bg-brand-orange border-brand-orange text-white'
                            : 'bg-white/5 border-white/10 text-white/70 hover:border-brand-orange/50 hover:text-white'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                )}
                {slotError && (
                  <p className="text-red-400 text-sm mt-3">{slotError}</p>
                )}
              </div>

              {/* ── Row 5: Special Requests ── */}
              <div>
                <label className={labelClass}>
                  <HiChatBubbleBottomCenterText className="inline mr-1" size={12} />
                  Special Requests (optional)
                </label>
                <textarea
                  value={form.comment}
                  onChange={e => set('comment', e.target.value)}
                  rows={4}
                  placeholder="Dietary requirements, seating preferences, celebrations…"
                  className={`${inputClass} resize-none`}
                />
              </div>

              {/* ── Submit ── */}
              {submitError && (
                <p className="text-red-400 text-sm text-center">{submitError}</p>
              )}
              <motion.button
                type="submit"
                disabled={submitting}
                whileTap={{ scale: 0.97 }}
                className="w-full bg-brand-orange text-white py-6 rounded-2xl font-bold text-xl hover:scale-105 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
              >
                {submitting ? 'Confirming Reservation…' : 'Confirm Reservation'}
              </motion.button>

            </form>
          </motion.div>

          {/* QR note */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center text-white/30 text-sm mt-10"
          >
            Want to order food at the table? Scan the QR code when you arrive.
          </motion.p>

        </div>
      </section>
    </PageWrapper>
  );
}
