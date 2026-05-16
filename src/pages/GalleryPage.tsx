import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HiXMark, HiChevronLeft, HiChevronRight, HiArrowLongRight } from 'react-icons/hi2';
import PageWrapper from '../components/PageWrapper';
import SEOHead from '../components/SEOHead';
import { GALLERY_IMAGES } from '../constants';
import { getImgUrl } from '../utils/image';

export default function GalleryPage() {
  const [index, setIndex] = useState<number | null>(null);
  const featured = GALLERY_IMAGES[0];
  const rest = GALLERY_IMAGES.slice(1);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (index === null) return;
      if (e.key === 'Escape') setIndex(null);
      if (e.key === 'ArrowRight') setIndex(i => ((i ?? 0) + 1) % GALLERY_IMAGES.length);
      if (e.key === 'ArrowLeft') setIndex(i => ((i ?? 0) - 1 + GALLERY_IMAGES.length) % GALLERY_IMAGES.length);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [index]);

  return (
    <PageWrapper>
      <SEOHead
        title="Gallery | Cookers Delight"
        description="See our food, ambiance, and dining experience at Cookers Delight. Authentic Ghanaian and Nigerian cuisine served with passion in Accra."
        canonical="https://cookers-delight.vercel.app/gallery"
      />

      {/* Compact hero */}
      <section className="pt-24 pb-6 md:pt-28 md:pb-12 bg-[#F5EFE8]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12">
          <span className="warm-section-label block mb-2 md:mb-3">Gallery</span>
          <h1 className="font-display text-3xl sm:text-5xl md:text-7xl font-bold text-[#1C1917]">
            Tastes of the <span className="text-[#1B5E20] italic font-normal">kitchen</span>
          </h1>
        </div>
      </section>

      {/* Lead image hero with overlap caption (reference-style) */}
      <section className="pt-6 pb-2 md:pt-12 md:pb-4 bg-[#FFFBF7]">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="relative cursor-pointer"
            onClick={() => setIndex(0)}
          >
            <div className="aspect-[4/5] sm:aspect-[16/10] overflow-hidden rounded-[2rem] bg-[#F5EFE8]">
              <img
                src={getImgUrl(featured.url)}
                alt={featured.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute left-5 right-5 -bottom-6 sm:left-8 sm:right-auto sm:bottom-6 sm:max-w-xs">
              <div className="app-card p-4 sm:p-5 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#1B5E20]">Featured</p>
                  <p className="font-display text-lg font-bold text-[#1C1917] truncate">{featured.title}</p>
                </div>
                <span className="w-9 h-9 rounded-full bg-[#1B5E20] text-white flex items-center justify-center flex-shrink-0">
                  <HiArrowLongRight size={16} />
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Masonry */}
      <section className="pt-12 pb-12 md:pt-16 bg-[#FFFBF7]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12">
          <div className="columns-2 md:columns-3 lg:columns-4 gap-3 md:gap-5 [column-fill:_balance] space-y-3 md:space-y-5">
            {rest.map((img, i) => (
              <motion.div
                key={img.url}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ type: 'spring', stiffness: 320, damping: 28, delay: (i % 6) * 0.04 }}
                onClick={() => setIndex(i + 1)}
                className="relative overflow-hidden rounded-2xl cursor-pointer break-inside-avoid bg-[#F5EFE8] active:scale-[0.99] transition group"
                style={{ boxShadow: 'var(--shadow-soft)' }}
              >
                <img src={getImgUrl(img.url)} className="w-full h-auto object-cover" alt={img.title} loading="lazy" />
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-xs font-bold truncate">{img.title}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox */}
      <AnimatePresence>
        {index !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[200] bg-[#0F3F1F]/96 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-10"
          >
            <button
              onClick={() => setIndex(null)}
              className="absolute top-5 right-5 w-11 h-11 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition"
              aria-label="Close"
            >
              <HiXMark size={22} />
            </button>
            <button
              onClick={() => setIndex(((index ?? 0) - 1 + GALLERY_IMAGES.length) % GALLERY_IMAGES.length)}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition"
              aria-label="Previous"
            >
              <HiChevronLeft size={24} />
            </button>
            <button
              onClick={() => setIndex(((index ?? 0) + 1) % GALLERY_IMAGES.length)}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition"
              aria-label="Next"
            >
              <HiChevronRight size={24} />
            </button>
            <motion.div
              key={index}
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="relative w-full max-w-4xl flex flex-col items-center gap-5"
            >
              <img
                src={getImgUrl(GALLERY_IMAGES[index].url)}
                className="max-w-full max-h-[72vh] object-contain rounded-3xl"
                alt={GALLERY_IMAGES[index].title}
              />
              <div className="text-center">
                <h3 className="font-display text-2xl font-bold text-white">{GALLERY_IMAGES[index].title}</h3>
                <p className="text-white/50 text-xs font-bold uppercase tracking-widest mt-1">
                  {index + 1} / {GALLERY_IMAGES.length}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
}
