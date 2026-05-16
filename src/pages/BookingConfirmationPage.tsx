import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { HiArrowLongRight, HiCheckCircle, HiHome } from 'react-icons/hi2';
import SEOHead from '../components/SEOHead';

interface ConfirmationState {
  branchName?: string;
  reserveDate?: string;
  reserveTime?: string;
  guestNum?: number;
  email?: string;
}

export default function BookingConfirmationPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const data = (state ?? {}) as ConfirmationState;

  return (
    <>
      <SEOHead
        title="Reservation Confirmed | Cookers Delight"
        description="Your table at Cookers Delight is being prepared."
        canonical="https://cookers-delight.vercel.app/bookings/confirmation"
      />

      <div className="min-h-[100dvh] bg-[#FFFBF7] flex flex-col">
        {/* Top bar */}
        <div className="px-5 pt-12 sm:pt-16 pb-2 max-w-2xl mx-auto w-full flex items-center justify-between">
          <span className="warm-section-label">Cookers Delight</span>
          <Link to="/" className="text-[#78716C] text-xs font-bold uppercase tracking-widest hover:text-[#1B5E20] transition-colors">
            Skip
          </Link>
        </div>

        {/* Hero card */}
        <div className="flex-1 px-5 py-6 max-w-2xl mx-auto w-full">
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className="app-tile-dark p-8 sm:p-10 text-center relative overflow-hidden"
          >
            {/* Decorative ambient glow */}
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-[#D97706]/25 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-12 w-56 h-56 rounded-full bg-[#1B5E20]/25 blur-3xl pointer-events-none" />

            <div className="relative">
              {/* Illustration placeholder — chef icon over plate */}
              <div className="w-40 h-40 sm:w-52 sm:h-52 mx-auto rounded-full bg-white/10 flex items-center justify-center mb-6 border border-white/10">
                <ChefIllustration />
              </div>

              <h1 className="font-display text-3xl sm:text-4xl font-bold text-white leading-tight">
                Preparing your seat
              </h1>
              <p className="text-white/60 text-sm sm:text-base mt-3 max-w-sm mx-auto leading-relaxed">
                {data.branchName ? (
                  <>
                    We&apos;re holding a table at <span className="text-white font-bold">{data.branchName}</span>
                    {data.reserveDate && data.reserveTime && (
                      <> on <span className="text-white font-bold">{data.reserveDate} at {data.reserveTime}</span></>
                    )}
                    {data.guestNum && (
                      <> for <span className="text-white font-bold">{data.guestNum} guest{data.guestNum > 1 ? 's' : ''}</span></>
                    )}.
                  </>
                ) : (
                  <>It can take a few minutes. Just relax and prepare for a good meal.</>
                )}
              </p>

              {data.email && (
                <p className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/8 text-white/70 text-xs">
                  <HiCheckCircle size={14} className="text-[#86EFAC]" />
                  Confirmation sent to <span className="text-white font-bold">{data.email}</span>
                </p>
              )}
            </div>
          </motion.div>

          {/* Secondary CTAs */}
          <div className="mt-6 space-y-3">
            <button
              onClick={() => navigate('/bookings')}
              className="w-full rounded-full bg-white border border-[#E8E0D8] py-4 text-sm font-bold text-[#1C1917] flex items-center justify-center gap-2 active:scale-[0.98] transition"
            >
              Change reservation
            </button>
          </div>
        </div>

        {/* Sticky primary CTA */}
        <div className="app-cta-sticky">
          <Link to="/" className="app-cta-primary" aria-label="Back to home">
            <span className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
                <HiHome size={16} />
              </span>
              <span className="text-sm">Back to home</span>
            </span>
            <span className="app-cta-chip"><HiArrowLongRight size={16} /></span>
          </Link>
        </div>
      </div>
    </>
  );
}

function ChefIllustration() {
  return (
    <svg viewBox="0 0 120 120" className="w-24 h-24 sm:w-32 sm:h-32" fill="none" aria-hidden>
      <circle cx="60" cy="60" r="56" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      <path
        d="M40 70c0-11 9-20 20-20s20 9 20 20H40z"
        fill="#FEF3C7"
      />
      <ellipse cx="60" cy="72" rx="26" ry="4" fill="#D97706" />
      <path
        d="M48 50c0-7 5.5-12 12-12s12 5 12 12c5 0 9 4 9 9 0 4-3 7-7 8H46c-4-1-7-4-7-8 0-5 4-9 9-9z"
        fill="white"
      />
      <circle cx="56" cy="58" r="1.5" fill="#1C1917" />
      <circle cx="64" cy="58" r="1.5" fill="#1C1917" />
    </svg>
  );
}
