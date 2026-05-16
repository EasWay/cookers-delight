import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { HiArrowLeft, HiArrowLongRight, HiCheckCircle } from 'react-icons/hi2';
import { usePageContext } from './PublicLayout';
import SEOHead from '../components/SEOHead';
import { haptic } from '../utils/haptics';

const LEVELS = [
  { value: 5, label: 'Loved it', emoji: '🤩', color: '#1B5E20' },
  { value: 4, label: 'Very satisfied', emoji: '😀', color: '#16A34A' },
  { value: 3, label: 'Good', emoji: '🙂', color: '#D97706' },
  { value: 2, label: 'Okay', emoji: '😐', color: '#F59E0B' },
  { value: 1, label: 'Not great', emoji: '😞', color: '#EF4444' },
];

export default function FeedbackPage() {
  const navigate = useNavigate();
  const { addToast } = usePageContext();
  const [rating, setRating] = useState<number>(4);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const current = LEVELS.find(l => l.value === rating) ?? LEVELS[1];

  const submit = () => {
    haptic(12);
    try {
      const log = JSON.parse(window.localStorage.getItem('cd_feedback_v1') ?? '[]');
      log.push({ rating, comment, at: new Date().toISOString() });
      window.localStorage.setItem('cd_feedback_v1', JSON.stringify(log));
    } catch {
      /* non-fatal */
    }
    setSubmitted(true);
    addToast('Thanks for your feedback');
  };

  if (submitted) {
    return (
      <>
        <SEOHead
          title="Thanks | Cookers Delight"
          description="Your feedback has been received."
          canonical="https://cookers-delight.vercel.app/feedback"
        />
        <div className="min-h-[100dvh] bg-[#FFFBF7] flex flex-col px-5 pt-20 pb-32 max-w-2xl mx-auto">
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="app-tile-dark p-10 text-center"
          >
            <HiCheckCircle size={56} className="mx-auto text-[#86EFAC]" />
            <h1 className="font-display text-3xl font-bold text-white mt-4">Thanks for sharing</h1>
            <p className="text-white/60 text-sm mt-2 max-w-xs mx-auto">
              Your feedback helps us cook better, every day.
            </p>
          </motion.div>
          <div className="app-cta-sticky">
            <Link to="/" className="app-cta-primary">
              <span className="text-sm">Back to home</span>
              <span className="app-cta-chip"><HiArrowLongRight size={16} /></span>
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead
        title="Share Feedback | Cookers Delight"
        description="Tell us how your visit went."
        canonical="https://cookers-delight.vercel.app/feedback"
      />

      <div className="min-h-[100dvh] bg-[#FFFBF7] pb-32">
        <div className="max-w-2xl mx-auto px-5 pt-16 sm:pt-20">
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-white border border-[#E8E0D8] flex items-center justify-center text-[#1C1917] active:scale-95 transition"
              aria-label="Close"
            >
              <HiArrowLeft size={18} />
            </button>
            <span className="warm-section-label">Feedback</span>
            <div className="w-10" />
          </div>

          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#1C1917] text-center leading-tight">
            How was your overall <span className="text-[#1B5E20] italic font-normal">food experience?</span>
          </h1>

          {/* Vertical gradient slider — coral-to-cream */}
          <div className="mt-10 flex justify-center gap-8 items-stretch">
            <div className="relative w-16 sm:w-20 rounded-full overflow-hidden bg-gradient-to-b from-[#D97706] via-[#F59E0B] to-[#FEF3C7] shadow-inner">
              {LEVELS.map(level => {
                const active = rating === level.value;
                return (
                  <button
                    key={level.value}
                    onClick={() => { setRating(level.value); haptic(6); }}
                    className="block w-full h-[20%] focus:outline-none"
                    aria-label={level.label}
                    aria-pressed={active}
                  >
                    <motion.span
                      initial={false}
                      animate={{ scale: active ? 1.15 : 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                      className="block text-xl"
                    >
                      {/* visual sliver only; selection marker on the right side */}
                    </motion.span>
                  </button>
                );
              })}
              {/* Selected indicator */}
              <motion.div
                layout
                className="absolute -right-2 w-4 h-4 rotate-45 bg-[#1C1917]"
                style={{ top: `calc(${(LEVELS.findIndex(l => l.value === rating)) * 20}% + 10%)` }}
                transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              />
            </div>

            {/* Active emoji card */}
            <motion.div
              layout
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="flex-1 max-w-[16rem] app-card flex flex-col items-center justify-center p-6"
            >
              <motion.span
                key={current.value}
                initial={{ scale: 0.6, rotate: -10, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                className="text-7xl"
              >
                {current.emoji}
              </motion.span>
              <p className="font-display text-xl font-bold text-[#1C1917] mt-3">{current.label}</p>
              <p className="text-xs text-[#78716C] mt-1">{current.value} / 5</p>
            </motion.div>
          </div>

          <p className="text-center text-sm text-[#78716C] mt-8">
            Thank you for your feedback
          </p>

          {/* Optional comment */}
          <div className="app-card p-5 mt-8">
            <label className="text-xs font-bold uppercase tracking-widest text-[#78716C]">Tell us more (optional)</label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={4}
              placeholder="What worked? What could we do better?"
              className="mt-2 w-full bg-[#F5EFE8] rounded-2xl px-4 py-3 text-sm text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#1B5E20]/40 resize-none"
            />
          </div>
        </div>

        <div className="app-cta-sticky">
          <motion.button onClick={submit} whileTap={{ scale: 0.98 }} className="app-cta-primary">
            <span className="text-sm">Submit feedback</span>
            <span className="app-cta-chip"><HiArrowLongRight size={16} /></span>
          </motion.button>
        </div>
      </div>
    </>
  );
}
