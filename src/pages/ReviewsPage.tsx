import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { HiStar, HiArrowLongRight } from 'react-icons/hi2';
import { BsInstagram } from 'react-icons/bs';
import PageWrapper from '../components/PageWrapper';
import SEOHead from '../components/SEOHead';
import { REVIEWS, GALLERY_IMAGES } from '../constants';
import { getImgUrl } from '../utils/image';

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <HiStar key={i} size={size} className={i < rating ? 'text-[#F59E0B]' : 'text-[#E8E0D8]'} />
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const avg = REVIEWS.reduce((s, r) => s + r.rating, 0) / REVIEWS.length;
  const top = REVIEWS.slice(0, 6);
  const insta = GALLERY_IMAGES.slice(0, 6);

  return (
    <PageWrapper>
      <SEOHead
        title="Reviews | Cookers Delight"
        description="See what customers love about Cookers Delight. Hundreds of five-star reviews for our authentic Ghanaian and Nigerian food and fast delivery in Accra."
        canonical="https://cookers-delight.vercel.app/reviews"
      />

      {/* Compact hero */}
      <section className="pt-24 pb-6 md:pt-28 md:pb-12 bg-[#F5EFE8]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12">
          <span className="warm-section-label block mb-2 md:mb-3">Reviews</span>
          <h1 className="font-display text-3xl sm:text-5xl md:text-7xl font-bold text-[#1C1917]">
            What <span className="text-[#1B5E20] italic font-normal">guests</span> say
          </h1>
        </div>
      </section>

      <section className="py-6 md:py-12 bg-[#FFFBF7]">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 lg:px-12 space-y-4">

          {/* Top-rate dark hero card (matches reference's rating screen) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="app-tile-dark p-6 sm:p-7 relative overflow-hidden"
          >
            <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-[#D97706]/30 blur-3xl pointer-events-none" />
            <span className="app-label-light">Top rate</span>
            <div className="flex items-end justify-between gap-4 mt-1">
              <div>
                <p className="font-display text-5xl sm:text-6xl font-black text-white leading-none">
                  {avg.toFixed(1)}<span className="text-2xl text-white/40">/5</span>
                </p>
                <p className="text-white/60 text-xs mt-2">{REVIEWS.length}+ reviews this year</p>
              </div>
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <HiStar key={i} size={22} className={i < Math.round(avg) ? 'text-[#F59E0B]' : 'text-white/15'} />
                ))}
              </div>
            </div>

            {/* Rating distribution micro-bars */}
            <div className="mt-5 space-y-1.5">
              {[5, 4, 3, 2, 1].map(stars => {
                const count = REVIEWS.filter(r => r.rating === stars).length;
                const pct = REVIEWS.length ? (count / REVIEWS.length) * 100 : 0;
                return (
                  <div key={stars} className="flex items-center gap-2.5">
                    <span className="text-[10px] font-bold text-white/60 w-3">{stars}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full bg-[#F59E0B]" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-white/60 w-5 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Review list */}
          <div className="space-y-3">
            {top.map((r, idx) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.04, type: 'spring', stiffness: 320, damping: 28 }}
                className="app-card p-5"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#DCFCE7] text-[#1B5E20] flex items-center justify-center font-bold flex-shrink-0">
                    {r.author.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-sm text-[#1C1917] truncate">{r.author}</p>
                      <span className="text-[10px] text-[#A8A29E] flex-shrink-0">{r.date}</span>
                    </div>
                    <Stars rating={r.rating} />
                    <p className="text-sm text-[#78716C] mt-2 leading-relaxed">{r.comment}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Instagram strip */}
          <div className="app-card-flat p-5 mt-2">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#78716C]">Follow us</p>
                <p className="font-display text-xl font-bold text-[#1C1917] mt-0.5 flex items-center gap-2">
                  <BsInstagram className="text-[#D97706]" /> @cookersdelightgh
                </p>
              </div>
              <a
                href="https://instagram.com/cookersdelightgh"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-[#1B5E20] text-white flex items-center justify-center"
                aria-label="Open Instagram"
              >
                <HiArrowLongRight size={16} />
              </a>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {insta.map(img => (
                <a
                  key={img.url}
                  href="https://instagram.com/cookersdelightgh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="aspect-square rounded-2xl overflow-hidden bg-[#F5EFE8]"
                >
                  <img src={getImgUrl(img.url)} alt={img.title} className="w-full h-full object-cover" loading="lazy" />
                </a>
              ))}
            </div>
          </div>

          {/* Share own feedback */}
          <Link to="/feedback" className="block app-tile-dark p-5 active:scale-[0.99] transition">
            <div className="flex items-center justify-between">
              <div>
                <span className="app-label-light">Your turn</span>
                <p className="text-white text-base font-bold mt-1">Share your experience</p>
              </div>
              <span className="w-10 h-10 rounded-full bg-white text-[#0F3F1F] flex items-center justify-center">
                <HiArrowLongRight size={18} />
              </span>
            </div>
          </Link>
        </div>
      </section>
    </PageWrapper>
  );
}
