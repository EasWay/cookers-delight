import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  HiArrowRight, HiStar, HiRocketLaunch, HiSparkles, HiUsers,
} from 'react-icons/hi2';
import { BsWhatsapp, BsInstagram, BsFacebook } from 'react-icons/bs';
import PageWrapper from '../components/PageWrapper';
import SEOHead from '../components/SEOHead';
import CDBoatDownloadSection from '../components/CDBoatDownloadSection';
import { useCountUp } from '../hooks/useCountUp';
import { formatImg } from '../utils/image';
import { useApi } from '../hooks/useApi';
import { menuApi } from '../lib/api';
import { usePageContext } from './PublicLayout';
import { haptic } from '../utils/haptics';
import type { TIMenuItem } from '../types';

// ─── Spring presets ───────────────────────────────────────────────────────────
const springEntrance = { type: 'spring', stiffness: 350, damping: 28 } as const;
const springHover    = { type: 'spring', stiffness: 400, damping: 22 } as const;

// ─── Stagger variants ─────────────────────────────────────────────────────────
const cardContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const cardItem = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 350, damping: 28 } },
};

// ─── Star rating helper ───────────────────────────────────────────────────────
function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <HiStar
          key={i}
          size={14}
          className={i < Math.round(rating) ? 'text-[#F59E0B]' : 'text-[#D6D3D1]'}
        />
      ))}
      <span className="ml-1.5 text-xs font-bold text-[#78716C]">{rating.toFixed(1)}</span>
    </div>
  );
}

// ─── Dish card (featured + hero float card) ───────────────────────────────────
function DishCard({
  item,
  onOrder,
}: {
  item: TIMenuItem;
  onOrder: () => void;
}) {
  const categoryName = item.categories?.[0]?.name ?? 'Ghanaian';
  return (
    <motion.div
      variants={cardItem}
      whileHover={{ y: -6, scale: 1.02, transition: springHover }}
      className="warm-card group overflow-hidden flex flex-col"
    >
      {/* Image */}
      <div className="relative h-52 overflow-hidden rounded-t-[1.25rem]">
        <img
          src={item.thumb ?? '/assets/jollof.jpg'}
          alt={item.menu_name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-600"
          loading="lazy"
        />
        <span className="absolute top-3 left-3 warm-pill">{categoryName}</span>
        <span className="absolute top-3 right-3 warm-price">GH₵{Number(item.menu_price).toFixed(2)}</span>
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col gap-3 flex-1">
        <StarRating rating={4.5 + Math.random() * 0.5} />
        <h3 className="font-display text-lg font-bold text-[#1C1917] leading-tight">
          {item.menu_name}
        </h3>
        <p className="text-sm text-[#78716C] line-clamp-2 flex-1">
          {item.menu_description || 'A classic West African dish prepared with the freshest local ingredients.'}
        </p>
        <motion.button
          onClick={onOrder}
          whileTap={{ scale: 0.98 }}
          className="warm-btn-primary justify-center text-sm mt-1"
        >
          Order Now <HiArrowRight size={16} />
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { navigate } = usePageContext();
  const [heroSlide, setHeroSlide] = useState(0);

  const { data: menuItems } = useApi<TIMenuItem[]>(() => menuApi.getItems());
  const featured = (menuItems ?? []).slice(0, 4);

  const years    = useCountUp(10);
  const branches = useCountUp(4);
  const reviews  = useCountUp(200);
  const dishes   = useCountUp(50);

  const heroImages = [
    '/assets/jollof2.jpg',
    '/assets/cookers delight1.webp',
    '/assets/forcourt2.jpg',
  ];

  useEffect(() => {
    const t = setInterval(() => setHeroSlide(s => (s + 1) % heroImages.length), 5000);
    return () => clearInterval(t);
  }, []);

  const goMenu = () => navigate('menu');
  const goBook = () => navigate('bookings');

  return (
    <PageWrapper>
      <SEOHead
        title="Cookers Delight | Authentic Ghanaian & Nigerian Food in Accra"
        description="Order authentic Ghanaian and Nigerian food from Cookers Delight. Fast delivery across Accra. Dine in, take away, or order online. Great Foods. Great People."
        canonical="https://cookers-delight.vercel.app/"
      />

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="min-h-[100dvh] bg-[#FFFBF7] pt-20 flex items-center overflow-hidden relative">
        {/* Decorative background blobs */}
        <div className="absolute top-24 right-0 w-[480px] h-[480px] rounded-full bg-[#DCFCE7] opacity-50 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[320px] h-[320px] rounded-full bg-[#FEF3C7] opacity-40 blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-16">
          {/* Left: text */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...springEntrance, delay: 0.1 }}
            className="space-y-7 relative z-10"
          >
            <span className="warm-section-label">Ghana's Favourite Restaurant</span>

            <h1 className="font-display text-5xl sm:text-6xl md:text-[96px] lg:text-[108px] leading-[0.88] font-bold text-[#1C1917]">
              Hot &<br />
              <span className="text-[#1B5E20] italic font-normal">Tasty.</span>
            </h1>

            <p className="text-[#78716C] text-base md:text-lg max-w-md leading-relaxed">
              Authentic Ghanaian and Nigerian dishes, served fast across Accra.
            </p>

            {/* Star proof */}
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    className="w-9 h-9 rounded-full border-2 border-white bg-[#E8E0D8] overflow-hidden"
                    style={{ backgroundImage: `url(${'/assets/cookers delight1.webp'})`, backgroundSize: 'cover' }}
                  />
                ))}
              </div>
              <div>
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => <HiStar key={i} size={14} className="text-[#F59E0B]" />)}
                </div>
                <p className="text-xs text-[#78716C] font-bold">200+ happy customers</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 pt-2">
              <motion.button
                onClick={() => { haptic(10); goMenu(); }}
                whileTap={{ scale: 0.97 }}
                className="warm-btn-primary text-sm px-7 py-3.5"
              >
                Explore Menu <HiArrowRight size={16} />
              </motion.button>
              <motion.button
                onClick={() => { haptic(8); goBook(); }}
                whileTap={{ scale: 0.97 }}
                className="warm-btn-outline text-sm px-7 py-3.5"
              >
                Reserve a Table
              </motion.button>
            </div>
          </motion.div>

          {/* Right: circular food image + floating cards */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 280, damping: 30, delay: 0.2 }}
            className="relative flex justify-center items-center lg:justify-end"
          >
            {/* Main circle */}
            <div className="relative w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] lg:w-[460px] lg:h-[460px]">
              <div className="absolute inset-0 rounded-full overflow-hidden border-[10px] border-white shadow-2xl">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={heroSlide}
                    src={formatImg(heroImages[heroSlide], 900)}
                    initial={{ opacity: 0, scale: 1.08 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.9 }}
                    className="w-full h-full object-cover"
                    alt="Featured dish"
                  />
                </AnimatePresence>
              </div>

              {/* Price badge — top right of circle */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...springEntrance, delay: 0.9 }}
                className="absolute -top-4 -right-4 bg-[#FEF3C7] border-2 border-white rounded-2xl px-5 py-3 shadow-lg"
              >
                <p className="text-xs font-bold text-[#78716C] uppercase tracking-wider">Chef's Pick</p>
                <p className="text-2xl font-display font-black text-[#92400E]">GH₵65</p>
              </motion.div>

              {/* Star rating card — bottom left */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springEntrance, delay: 1.1 }}
                className="absolute -bottom-6 -left-6 bg-white rounded-2xl px-5 py-4 shadow-xl border border-[#E8E0D8] max-w-[200px]"
              >
                <StarRating rating={4.8} />
                <p className="text-sm font-bold text-[#1C1917] mt-1 leading-tight">Jollof Rice Special</p>
                <p className="text-xs text-[#78716C] mt-0.5">Grilled Tilapia & Shito</p>
              </motion.div>

              {/* Delivery badge — right */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...springEntrance, delay: 1.3 }}
                className="absolute top-1/2 -right-8 -translate-y-1/2 bg-[#1B5E20] rounded-2xl px-4 py-3 shadow-xl text-white text-center hidden lg:block"
              >
                <HiRocketLaunch size={18} className="mx-auto mb-1" />
                <p className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">Fast Delivery</p>
                <p className="text-xs font-bold">30–45 min</p>
              </motion.div>
            </div>

            {/* Slide dots */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 lg:hidden">
              {heroImages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setHeroSlide(i)}
                  className={`rounded-full transition-all ${i === heroSlide ? 'w-6 h-2 bg-[#1B5E20]' : 'w-2 h-2 bg-[#D6D3D1]'}`}
                />
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── STATS STRIP (desktop only on mobile-first redesign) ─────────── */}
      <section className="hidden md:block relative z-10 bg-white border-t border-[#E8E0D8]">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-nowrap overflow-x-auto no-scrollbar lg:overflow-visible lg:justify-around items-center gap-10">
          {[
            { label: 'Years Serving', val: years.count,    ref: years.ref,    suffix: '+' },
            { label: 'Branches',      val: branches.count, ref: branches.ref, suffix: '' },
            { label: 'Happy Reviews', val: reviews.count,  ref: reviews.ref,  suffix: '+' },
            { label: 'Unique Dishes', val: dishes.count,   ref: dishes.ref,   suffix: '+' },
          ].map((stat, i) => (
            <div key={i} ref={stat.ref} className="flex flex-col items-center min-w-[130px]">
              <span className="text-3xl font-display font-black text-[#1B5E20]">{stat.val}{stat.suffix}</span>
              <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#78716C]">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURED MENU ──────────────────────────────────────────────────── */}
      <section className="py-12 md:py-28 bg-[#FFFBF7]">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="flex flex-col md:flex-row justify-between items-end mb-14 gap-6">
            <div>
              <span className="warm-section-label block mb-3">Chef's Selection</span>
              <h2 className="font-display text-5xl md:text-6xl font-bold text-[#1C1917] leading-tight">
                Featured<br /><span className="text-[#1B5E20] italic font-normal">Delicacies.</span>
              </h2>
            </div>
            <motion.button
              onClick={goMenu}
              whileTap={{ scale: 0.97 }}
              className="warm-btn-outline text-sm px-7 py-3"
            >
              View Full Menu <HiArrowRight size={16} />
            </motion.button>
          </div>

          <motion.div
            variants={cardContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            {featured.length > 0
              ? featured.map((item) => (
                  <DishCard key={item.menu_id} item={item} onOrder={goMenu} />
                ))
              : /* Skeleton placeholders */ Array.from({ length: 4 }).map((_, i) => (
                  <motion.div
                    key={i}
                    variants={cardItem}
                    className="warm-card h-[420px] animate-pulse"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  >
                    <div className="h-52 bg-[#F5EFE8] rounded-t-[1.25rem]" />
                    <div className="p-5 space-y-3">
                      <div className="h-3 bg-[#F5EFE8] rounded-full w-2/3" />
                      <div className="h-5 bg-[#F5EFE8] rounded-full w-3/4" />
                      <div className="h-3 bg-[#F5EFE8] rounded-full w-full" />
                      <div className="h-3 bg-[#F5EFE8] rounded-full w-5/6" />
                    </div>
                  </motion.div>
                ))
            }
          </motion.div>
        </div>
      </section>

      {/* ── WHY CHOOSE US (desktop-only; mobile uses bottom-nav + tiles) ── */}
      <section className="hidden md:block py-24 bg-[#F5EFE8]">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-center mb-16">
            <span className="warm-section-label block mb-3">Why Cookers Delight</span>
            <h2 className="font-display text-4xl md:text-6xl font-bold text-[#1C1917]">
              The Gold <span className="text-[#1B5E20] italic font-normal">Standard</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-0">
            {[
              { icon: <HiRocketLaunch size={48} />, title: 'Fast Delivery',     desc: 'Hot food at your door in 30–45 mins' },
              { icon: <HiSparkles size={48} />,     title: 'Fresh Ingredients', desc: 'Sourced daily from local markets' },
              { icon: <HiUsers size={48} />,        title: 'Expert Chefs',      desc: '10+ years of West African culinary mastery' },
              { icon: <BsWhatsapp size={48} />,     title: 'Easy Ordering',     desc: "One WhatsApp message and you're done" },
            ].map((item, i) => {
              const isOdd = i % 2 !== 0;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ ...springEntrance, delay: i * 0.08 }}
                  className={`grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-8 items-center border-b border-[#E8E0D8] py-10 ${isOdd ? 'md:[direction:rtl]' : ''}`}
                >
                  <div className={`flex items-center justify-center md:justify-start text-[#1B5E20] ${isOdd ? 'md:[direction:ltr]' : ''}`}>
                    {item.icon}
                  </div>
                  <div className={isOdd ? 'md:[direction:ltr]' : ''}>
                    <h4 className="font-display text-2xl font-bold text-[#1C1917] mb-2">{item.title}</h4>
                    <p className="text-base text-[#78716C] leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── ABOUT ──────────────────────────────────────────────────────────── */}
      <section className="py-12 md:py-28 bg-[#FFFBF7]">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={springEntrance}
            className="space-y-8"
          >
            <span className="warm-section-label block">Our Story</span>
            <h2 className="font-display text-5xl md:text-7xl font-bold text-[#1C1917] leading-tight">
              Crafting<br /><span className="text-[#1B5E20] italic font-normal">Excellence.</span>
            </h2>
            <p className="text-[#78716C] text-lg leading-relaxed max-w-xl">
              Cookers Delight is more than a restaurant — it's a celebration of West African culinary mastery. From our humble beginnings in Accra, we've remained dedicated to one mission: bringing you the soul of Ghana and Nigeria on a plate.
            </p>
            <div className="flex items-center gap-5 pt-2">
              <motion.button
                onClick={goMenu}
                whileTap={{ scale: 0.97 }}
                className="warm-btn-primary text-sm px-7 py-3.5"
              >
                View Full Menu <HiArrowRight size={16} />
              </motion.button>
              <motion.button
                onClick={goBook}
                whileTap={{ scale: 0.97 }}
                className="warm-btn-outline text-sm px-7 py-3.5"
              >
                Make a Reservation
              </motion.button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={springEntrance}
            whileHover={{ scale: 1.02, transition: springHover }}
            className="relative"
          >
            <div className="rounded-3xl overflow-hidden shadow-2xl h-[520px] border-4 border-white">
              <img
                src={formatImg('/assets/forcourt.jpg', 1200)}
                className="w-full h-full object-cover"
                alt="Cookers Delight interior"
              />
            </div>
            {/* Badge overlay */}
            <div className="absolute -bottom-6 -left-6 bg-[#1B5E20] text-white p-8 rounded-2xl shadow-2xl">
              <p className="text-5xl font-display font-black">10+</p>
              <p className="text-sm font-bold uppercase tracking-widest text-[#DCFCE7] mt-1">Years of Taste</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CATERING CTA (desktop-only; mobile gets a compact tile below) ─ */}
      <section className="hidden md:block relative py-36 overflow-hidden">
        <img
          src={formatImg('/assets/flyer1.jpg', 1920)}
          className="absolute inset-0 w-full h-full object-cover opacity-20"
          alt=""
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1B5E20]/80 to-[#1C1917]/90" />
        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center text-white">
          <span className="warm-section-label text-[#DCFCE7] block mb-4">Catering Services</span>
          <h2 className="font-display text-6xl md:text-8xl lg:text-[9rem] font-bold mb-6 leading-[0.85]">
            We Cater for<br /><span className="text-[#F59E0B] italic font-normal">Your Events</span>
          </h2>
          <p className="text-white/80 text-lg mb-10 leading-relaxed max-w-2xl mx-auto">
            Corporate events, weddings, funerals, parties — we bring the feast to you across Greater Accra.
          </p>
          <div className="flex flex-wrap justify-center gap-5">
            <motion.a
              href="https://wa.me/233243379412?text=Hi, I'd like a catering quote"
              target="_blank"
              rel="noopener noreferrer"
              whileTap={{ scale: 0.97 }}
              className="bg-[#F59E0B] text-[#1C1917] font-black px-9 py-4 rounded-full hover:bg-[#FCD34D] transition-all flex items-center gap-2"
            >
              <BsWhatsapp size={20} /> Get a Quote on WhatsApp
            </motion.a>
            <motion.a
              href="tel:+233243379412"
              whileTap={{ scale: 0.97 }}
              className="border-2 border-white/40 text-white font-bold px-9 py-4 rounded-full hover:bg-white/10 transition-all"
            >
              Call Us Now
            </motion.a>
          </div>
        </div>
      </section>

      {/* ── SOCIAL / CONNECT (desktop-only; mobile uses "More" sheet) ───── */}
      <section className="hidden md:block py-20 bg-[#F5EFE8]">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 text-center">
          <span className="warm-section-label block mb-3">Stay Connected</span>
          <h2 className="font-display text-4xl font-bold text-[#1C1917] mb-8">
            Follow Us on Social Media
          </h2>
          <div className="flex justify-center gap-5 flex-wrap">
            <motion.a
              href="https://www.instagram.com/cookersdelightgh/"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ y: -3, transition: springHover }}
              whileTap={{ scale: 0.96 }}
              className="flex items-center gap-2 bg-white border border-[#E8E0D8] text-[#1C1917] px-7 py-3.5 rounded-full font-bold hover:border-[#1B5E20] hover:text-[#1B5E20] transition-colors"
            >
              <BsInstagram size={18} /> Instagram
            </motion.a>
            <motion.a
              href="https://www.facebook.com/cookersdelightgh/"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ y: -3, transition: springHover }}
              whileTap={{ scale: 0.96 }}
              className="flex items-center gap-2 bg-white border border-[#E8E0D8] text-[#1C1917] px-7 py-3.5 rounded-full font-bold hover:border-[#1B5E20] hover:text-[#1B5E20] transition-colors"
            >
              <BsFacebook size={18} /> Facebook
            </motion.a>
            <motion.a
              href="https://wa.me/233243379412"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ y: -3, transition: springHover }}
              whileTap={{ scale: 0.96 }}
              className="flex items-center gap-2 bg-[#25D366] text-white px-7 py-3.5 rounded-full font-bold hover:bg-[#1DAA55] transition-colors"
            >
              <BsWhatsapp size={18} /> WhatsApp
            </motion.a>
          </div>
        </div>
      </section>

      <div className="hidden md:block">
        <CDBoatDownloadSection />
      </div>

      {/* ── Mobile-only compact catering + feedback tiles ──────────────── */}
      <section className="md:hidden px-5 pb-10 pt-2 bg-[#FFFBF7] space-y-3">
        <a
          href="https://wa.me/233243379412?text=Hi, I'd like a catering quote"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => haptic(8)}
          className="block app-tile-dark p-5 relative overflow-hidden active:scale-[0.99] transition"
        >
          <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-[#D97706]/30 blur-3xl pointer-events-none" />
          <div className="relative flex items-center justify-between">
            <div>
              <span className="app-label-light">Catering</span>
              <p className="font-display text-xl font-bold text-white mt-1 leading-tight">
                We cater your events
              </p>
              <p className="text-white/60 text-xs mt-1">Tap to get a quote on WhatsApp</p>
            </div>
            <span className="w-10 h-10 rounded-full bg-[#25D366] text-white flex items-center justify-center flex-shrink-0">
              <BsWhatsapp size={16} />
            </span>
          </div>
        </a>

        <a
          href="/feedback"
          className="block app-card p-5 flex items-center justify-between active:scale-[0.99] transition"
        >
          <div>
            <span className="warm-section-label">Feedback</span>
            <p className="font-display text-base font-bold text-[#1C1917] mt-0.5">Tell us how we did</p>
          </div>
          <span className="w-10 h-10 rounded-full bg-[#1B5E20] text-white flex items-center justify-center">
            <HiArrowRight size={16} />
          </span>
        </a>
      </section>

      {/* ── MARQUEE (desktop only) ───────────────────────────────────────── */}
      <div className="hidden md:block bg-[#1B5E20] py-4 overflow-hidden">
        <div className="animate-marquee-scroll whitespace-nowrap">
          {[...Array(10)].map((_, i) => (
            <span key={i} className="text-4xl md:text-6xl font-display font-bold text-white/10 uppercase mx-10">
              Ghana's Best Jollof • Authentic Nigerian Soups • Professional Catering • Hot Delivery
            </span>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
