import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HiXMark, HiChevronLeft, HiChevronRight } from 'react-icons/hi2';
import PageWrapper from '../components/PageWrapper';
import SEOHead from '../components/SEOHead';
import { GALLERY_IMAGES } from '../constants';
import { getImgUrl } from '../utils/image';

export default function GalleryPage() {
  const [index, setIndex] = useState<number | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (index === null) return;
      if (e.key === 'Escape') setIndex(null);
      if (e.key === 'ArrowRight') setIndex(i => (i! + 1) % GALLERY_IMAGES.length);
      if (e.key === 'ArrowLeft') setIndex(i => (i! - 1 + GALLERY_IMAGES.length) % GALLERY_IMAGES.length);
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
      <section className="relative h-[40vh] flex items-center justify-center overflow-hidden">
        <img src={getImgUrl(GALLERY_IMAGES[0].url)} className="absolute inset-0 w-full h-full object-cover opacity-50" alt="" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-black to-transparent" />
        <h1 className="relative z-10 text-7xl md:text-9xl font-bold">Gal<span className="italic font-normal text-brand-orange">lery</span></h1>
      </section>

      <section className="relative z-10 py-20 bg-brand-black">
        <div className="container mx-auto px-6">
          <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
            {GALLERY_IMAGES.map((img, i) => (
              <motion.div
                key={img.url}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ type: 'spring', stiffness: 350, damping: 28, delay: i * 0.05 }}
                whileHover={{ scale: 1.03, y: -4 }}
                onClick={() => setIndex(i)}
                className="relative group overflow-hidden rounded-[32px] cursor-pointer break-inside-avoid shadow-2xl"
              >
                <img src={getImgUrl(img.url)} className="w-full h-auto object-cover" alt={img.title} />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center p-10">
                  <h3 className="text-white font-display text-4xl font-bold text-center translate-y-8 group-hover:translate-y-0 transition-all duration-500">{img.title}</h3>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <AnimatePresence>
        {index !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className="fixed inset-0 z-[200] bg-black/98 backdrop-blur-3xl flex items-center justify-center p-6 lg:p-20"
          >
            <motion.button
              onClick={() => setIndex(null)}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              className="absolute top-10 right-10 text-white/40 hover:text-white transition-colors z-30"
            >
              <HiXMark size={40} />
            </motion.button>
            <motion.button
              onClick={() => setIndex((index - 1 + GALLERY_IMAGES.length) % GALLERY_IMAGES.length)}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              className="absolute left-8 top-1/2 -translate-y-1/2 w-16 h-16 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-all text-white/40 hover:text-white z-30"
            >
              <HiChevronLeft size={32} />
            </motion.button>
            <motion.button
              onClick={() => setIndex((index + 1) % GALLERY_IMAGES.length)}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              className="absolute right-8 top-1/2 -translate-y-1/2 w-16 h-16 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-all text-white/40 hover:text-white z-30"
            >
              <HiChevronRight size={32} />
            </motion.button>
            <motion.div
              key={index}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              className="relative w-full max-w-5xl h-full flex flex-col items-center justify-center gap-8"
            >
              <img
                src={getImgUrl(GALLERY_IMAGES[index].url)}
                className="max-w-full max-h-[75vh] object-contain rounded-3xl shadow-[0_0_100px_rgba(236,72,36,0.2)]"
                alt={GALLERY_IMAGES[index].title}
              />
              <div className="text-center">
                <h3 className="text-4xl font-display font-bold mb-2">{GALLERY_IMAGES[index].title}</h3>
                <p className="text-white/40 font-bold uppercase tracking-widest text-sm">{index + 1} / {GALLERY_IMAGES.length}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
}
