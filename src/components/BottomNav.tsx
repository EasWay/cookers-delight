import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  HiHome, HiOutlineShoppingBag, HiCalendarDays, HiMapPin,
  HiEllipsisHorizontal, HiXMark, HiPhoto, HiStar, HiPhone,
} from 'react-icons/hi2';
import { BsWhatsapp } from 'react-icons/bs';

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
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="md:hidden fixed left-0 right-0 z-[100] bg-white rounded-t-3xl shadow-2xl"
            style={{ bottom: 'var(--bottom-nav-height)', paddingBottom: 8 }}
          >
            <div className="px-6 pt-5 pb-4">
              {/* drag handle */}
              <div className="w-10 h-1 bg-[#E8E0D8] rounded-full mx-auto mb-5" />
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-xl font-bold text-[#1C1917]">More</h3>
                <button
                  onClick={() => setShowMore(false)}
                  className="w-9 h-9 rounded-full bg-[#F5EFE8] flex items-center justify-center text-[#78716C]"
                >
                  <HiXMark size={18} />
                </button>
              </div>
              <div className="space-y-1">
                {MORE_LINKS.map(link => (
                  <Link
                    key={link.name}
                    to={link.to}
                    className="flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-[#F5EFE8] active:bg-[#DCFCE7] transition-colors"
                  >
                    <link.icon size={22} className="text-[#1B5E20]" />
                    <span className="font-bold text-[#1C1917] text-base">{link.name}</span>
                  </Link>
                ))}
                <a
                  href="https://wa.me/233243379412"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-[#F5EFE8] active:bg-[#F0FFF4] transition-colors"
                >
                  <BsWhatsapp size={22} className="text-[#25D366]" />
                  <span className="font-bold text-[#1C1917] text-base">WhatsApp Us</span>
                </a>
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
              <Link
                key={tab.name}
                to={tab.to}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 relative"
                aria-label={tab.name}
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute top-0 w-8 h-0.5 rounded-full bg-[#1B5E20]"
                    transition={{ type: 'spring', damping: 30, stiffness: 350 }}
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
            );
          })}

          {/* More tab */}
          <button
            onClick={() => setShowMore(v => !v)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5"
            aria-label="More navigation options"
            aria-expanded={showMore}
          >
            {showMore
              ? <HiXMark size={22} style={{ color: 'var(--cd-green)' }} />
              : <HiEllipsisHorizontal size={22} style={{ color: 'var(--cd-muted)' }} />
            }
            <span
              className="text-[10px] font-bold leading-none"
              style={{ color: showMore ? 'var(--cd-green)' : 'var(--cd-muted)' }}
            >
              More
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
