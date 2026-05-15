import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  HiHome, HiOutlineShoppingBag, HiCalendarDays, HiMapPin,
  HiEllipsisHorizontal, HiXMark, HiPhoto, HiStar, HiPhone,
} from 'react-icons/hi2';
import { BsWhatsapp } from 'react-icons/bs';
import { haptic } from '../utils/haptics';

const PRIMARY_TABS = [
  { name: 'Home',     to: '/',          icon: HiHome },
  { name: 'Menu',     to: '/menu',      icon: HiOutlineShoppingBag },
  { name: 'Bookings', to: '/bookings',  icon: HiCalendarDays },
  { name: 'Branches', to: '/branches',  icon: HiMapPin },
] as const;

const MORE_LINKS = [
  { name: 'Gallery',  to: '/gallery',  icon: HiPhoto },
  { name: 'Reviews',  to: '/reviews',  icon: HiStar },
  { name: 'Contact',  to: '/contact',  icon: HiPhone },
];

const sheetItemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 380, damping: 28, delay: i * 0.04 },
  }),
};

export default function BottomNav() {
  const { pathname } = useLocation();
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    setShowMore(false);
  }, [pathname]);

  return (
    <>
      {/* More sheet backdrop */}
      <AnimatePresence>
        {showMore && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setShowMore(false)}
            className="md:hidden fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* More bottom sheet */}
      <AnimatePresence>
        {showMore && (
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 380 }}
            className="md:hidden fixed left-0 right-0 z-[100] bg-white rounded-t-3xl shadow-2xl border-t border-[#E8E0D8]"
            style={{ bottom: 'var(--bottom-nav-height)', paddingBottom: 8 }}
          >
            <div className="px-6 pt-5 pb-4">
              {/* drag handle */}
              <div className="w-10 h-1 bg-[#E8E0D8] rounded-full mx-auto mb-5" />
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-xl font-bold text-[#1C1917]">More</h3>
                <motion.button
                  whileTap={{ scale: 0.88, rotate: 90 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                  onClick={() => setShowMore(false)}
                  className="w-9 h-9 rounded-full bg-[#F5EFE8] flex items-center justify-center text-[#78716C]"
                >
                  <HiXMark size={18} />
                </motion.button>
              </div>
              <div className="space-y-1">
                {MORE_LINKS.map((link, i) => (
                  <motion.div
                    key={link.name}
                    custom={i}
                    variants={sheetItemVariants}
                    initial="hidden"
                    animate="show"
                  >
                    <Link
                      to={link.to}
                      onClick={() => haptic(6)}
                      className="flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-[#F5EFE8] active:bg-[#DCFCE7] transition-colors"
                    >
                      <link.icon size={22} className="text-[#1B5E20]" />
                      <span className="font-bold text-[#1C1917] text-base">{link.name}</span>
                    </Link>
                  </motion.div>
                ))}
                <motion.div
                  custom={MORE_LINKS.length}
                  variants={sheetItemVariants}
                  initial="hidden"
                  animate="show"
                >
                  <a
                    href="https://wa.me/233243379412"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => haptic(10)}
                    className="flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-[#F5EFE8] active:bg-[#F0FFF4] transition-colors"
                  >
                    <BsWhatsapp size={22} className="text-[#25D366]" />
                    <span className="font-bold text-[#1C1917] text-base">WhatsApp Us</span>
                  </a>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom nav bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-[80] bg-white/95 backdrop-blur-md border-t border-[#E8E0D8]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-stretch h-16">
          {PRIMARY_TABS.map(tab => {
            const isActive = pathname === tab.to;
            return (
              <motion.div
                key={tab.name}
                className="flex-1"
                whileTap={{ scale: 0.88 }}
                transition={{ type: 'spring', stiffness: 600, damping: 28 }}
              >
                <Link
                  to={tab.to}
                  onClick={() => haptic(6)}
                  className="h-full flex flex-col items-center justify-center gap-0.5 relative w-full"
                  aria-label={tab.name}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {isActive && (
                    <motion.div
                      layoutId="bottomNavIndicator"
                      className="absolute top-0 w-8 h-0.5 rounded-full bg-[#1B5E20]"
                      transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                    />
                  )}
                  <tab.icon
                    size={22}
                    style={{ color: isActive ? 'var(--cd-green)' : 'var(--cd-muted)' }}
                  />
                  <span
                    className="text-[10px] font-bold leading-none"
                    style={{ color: isActive ? 'var(--cd-green)' : 'var(--cd-muted)' }}
                  >
                    {tab.name}
                  </span>
                </Link>
              </motion.div>
            );
          })}

          {/* More tab */}
          <motion.button
            className="flex-1 flex flex-col items-center justify-center gap-0.5"
            aria-label="More navigation options"
            aria-expanded={showMore}
            whileTap={{ scale: 0.88 }}
            transition={{ type: 'spring', stiffness: 600, damping: 28 }}
            onClick={() => { setShowMore(v => !v); haptic(6); }}
          >
            <AnimatePresence mode="wait" initial={false}>
              {showMore ? (
                <motion.div
                  key="x"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                >
                  <HiXMark size={22} style={{ color: 'var(--cd-green)' }} />
                </motion.div>
              ) : (
                <motion.div
                  key="dots"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                >
                  <HiEllipsisHorizontal size={22} style={{ color: 'var(--cd-muted)' }} />
                </motion.div>
              )}
            </AnimatePresence>
            <span
              className="text-[10px] font-bold leading-none"
              style={{ color: showMore ? 'var(--cd-green)' : 'var(--cd-muted)' }}
            >
              More
            </span>
          </motion.button>
        </div>
      </nav>
    </>
  );
}
