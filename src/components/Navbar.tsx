import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { haptic } from '../utils/haptics';

const NAV_LINKS = [
  { name: 'Home',     to: '/' },
  { name: 'Menu',     to: '/menu' },
  { name: 'Gallery',  to: '/gallery' },
  { name: 'Branches', to: '/branches' },
  { name: 'Reviews',  to: '/reviews' },
  { name: 'Bookings', to: '/bookings' },
  { name: 'Contact',  to: '/contact' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-[#E8E0D8]'
          : 'bg-white/80 backdrop-blur-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="flex justify-between items-center py-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
          >
            <Link to="/" className="flex items-center">
              <span className="font-display text-2xl font-bold text-[#1C1917] leading-none">
                Cookers<span className="text-[#1B5E20]">Delight</span>
              </span>
            </Link>
          </motion.div>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(link => {
              const isActive = pathname === link.to;
              return (
                <Link
                  key={link.name}
                  to={link.to}
                  className="relative text-[11px] font-bold uppercase tracking-[0.15em] transition-colors py-1"
                  style={{ color: isActive ? '#1B5E20' : '#78716C' }}
                >
                  <motion.span
                    whileHover={{ color: '#1C1917' }}
                    transition={{ duration: 0.15 }}
                  >
                    {link.name}
                  </motion.span>
                  {isActive && (
                    <motion.span
                      layoutId="nav-active-indicator"
                      className="absolute -bottom-1 left-0 right-0 h-[2px] bg-[#1B5E20] rounded-full"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-4">
            <a
              href="https://wa.me/233243379412"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-bold uppercase tracking-widest text-[#1B5E20] hover:text-[#14532D] transition-colors"
            >
              WhatsApp
            </a>
            <motion.div whileTap={{ scale: 0.96 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}>
              <Link
                to="/menu"
                onClick={() => haptic(8)}
                className="bg-[#1B5E20] text-white px-6 py-2.5 rounded-full text-[11px] font-extrabold uppercase tracking-widest hover:bg-[#2D6A4F] transition-colors inline-block"
              >
                Order Online
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </nav>
  );
}
