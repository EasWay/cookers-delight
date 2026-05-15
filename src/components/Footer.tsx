import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { BsInstagram, BsFacebook, BsWhatsapp } from 'react-icons/bs';
import { HiArrowRight } from 'react-icons/hi2';
import { usePageContext } from '../pages/PublicLayout';
import { haptic } from '../utils/haptics';

const NAV = [
  { label: 'Home', to: '/' },
  { label: 'Menu', to: '/menu' },
  { label: 'Gallery', to: '/gallery' },
  { label: 'Branches', to: '/branches' },
  { label: 'Reviews', to: '/reviews' },
  { label: 'Bookings', to: '/bookings' },
  { label: 'Contact', to: '/contact' },
];

const SOCIALS = [
  { icon: BsInstagram, href: 'https://www.instagram.com/cookersdelightgh/', label: 'Instagram', hoverColor: '#1B5E20' },
  { icon: BsFacebook,  href: 'https://www.facebook.com/cookersdelightgh/', label: 'Facebook',  hoverColor: '#1B5E20' },
  { icon: BsWhatsapp,  href: 'https://wa.me/233243379412',                label: 'WhatsApp',  hoverColor: '#25D366' },
];

export default function Footer() {
  const { addToast } = usePageContext();
  const [email, setEmail] = useState('');

  const subscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    haptic(8);
    addToast('Subscribed! ✓');
    setEmail('');
  };

  return (
    <footer className="bg-[#1C1917] text-white pt-20 pb-10 relative overflow-hidden">
      {/* Green-amber top accent */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#1B5E20] via-[#F59E0B] to-[#1B5E20]" />

      {/* Background text watermark */}
      <div className="absolute inset-0 flex items-center overflow-hidden pointer-events-none select-none">
        <span className="text-[20vw] font-display font-black text-white/[0.025] whitespace-nowrap">
          COOKERS DELIGHT
        </span>
      </div>

      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-14 mb-16">
          {/* Brand */}
          <div className="space-y-6">
            <span className="font-display text-3xl font-bold">
              Cookers<span className="text-[#F59E0B]">Delight</span>
            </span>
            <p className="text-white/50 text-sm leading-relaxed max-w-xs">
              Great Foods. Great People. Delivering authentic West African flavours since 2016.
            </p>
            <div className="flex gap-3">
              {SOCIALS.map(({ icon: Icon, href, label }) => (
                <motion.a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  whileHover={{ y: -4, scale: 1.12 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                  className="w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:bg-[#1B5E20] hover:text-white hover:border-[#1B5E20] transition-colors"
                >
                  <Icon size={16} />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="space-y-6">
            <h4 className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#F59E0B]">Navigation</h4>
            <ul className="space-y-1">
              {NAV.map(l => (
                <li key={l.label}>
                  <motion.div
                    whileHover={{ x: 4 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  >
                    <Link
                      to={l.to}
                      className="min-h-[44px] text-sm text-white/50 hover:text-white transition-colors flex items-center gap-1.5 group"
                    >
                      <HiArrowRight size={12} className="opacity-0 group-hover:opacity-100 text-[#F59E0B] transition-opacity" />
                      {l.label}
                    </Link>
                  </motion.div>
                </li>
              ))}
            </ul>
          </div>

          {/* Hours */}
          <div className="space-y-6">
            <h4 className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#F59E0B]">Opening Hours</h4>
            <div className="space-y-3 text-sm text-white/50">
              {[
                { day: 'Monday – Friday', hrs: '7AM – 10PM' },
                { day: 'Saturday',        hrs: '7AM – 11PM' },
                { day: 'Sunday',          hrs: '8AM – 10PM' },
              ].map(({ day, hrs }) => (
                <div key={day} className="flex justify-between gap-4">
                  <span>{day}</span>
                  <span className="text-white font-bold">{hrs}</span>
                </div>
              ))}
            </div>
            <div className="pt-4 border-t border-white/10">
              <p className="text-[#F59E0B] text-[10px] font-bold uppercase tracking-wider mb-1">Support</p>
              <motion.a
                href="tel:+233243379412"
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                className="text-xl font-display font-bold text-white hover:text-[#F59E0B] transition-colors inline-block"
              >
                +233 24 337 9412
              </motion.a>
            </div>
          </div>

          {/* Newsletter */}
          <div className="space-y-6">
            <h4 className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#F59E0B]">Newsletter</h4>
            <p className="text-sm text-white/50 leading-relaxed">
              Join for weekly specials and new dish alerts.
            </p>
            <form onSubmit={subscribe} className="space-y-2">
              <label htmlFor="newsletter-email" className="block text-xs font-bold text-white/40 uppercase tracking-widest">
                Your email address
              </label>
              <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1 focus-within:border-[#1B5E20] transition-colors">
                <input
                  id="newsletter-email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  type="email"
                  placeholder="your@email.com"
                  className="bg-transparent flex-1 px-4 py-2.5 outline-none text-sm text-white placeholder:text-white/30"
                />
                <motion.button
                  type="submit"
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="bg-[#1B5E20] hover:bg-[#2D6A4F] text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-colors"
                >
                  Subscribe
                </motion.button>
              </div>
            </form>

            {/* Location pills */}
            <div className="space-y-2 pt-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/30">Locations</p>
              <div className="flex flex-wrap gap-2">
                {['Kaneshie', 'East Legon', 'Circle', 'Tema'].map(loc => (
                  <span key={loc} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-white/50">
                    {loc}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-white/25 text-xs font-bold uppercase tracking-widest">
            © 2026 Cookers Delight. Accra, Ghana.
          </p>
          <p className="text-[#F59E0B] text-xs font-bold uppercase tracking-widest">
            Professional Service Delivery
          </p>
        </div>
      </div>
    </footer>
  );
}
