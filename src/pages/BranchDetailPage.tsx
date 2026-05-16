import React, { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  HiArrowLeft, HiArrowLongRight, HiClock, HiMapPin, HiPhone, HiShare, HiStar,
} from 'react-icons/hi2';
import { BsWhatsapp } from 'react-icons/bs';
import { useApi } from '../hooks/useApi';
import { locationApi, menuApi } from '../lib/api';
import { getImgUrl } from '../utils/image';
import { haptic } from '../utils/haptics';
import SEOHead from '../components/SEOHead';
import type { TILocation, TIMenuItem } from '../types';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function BranchDetailPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: locations } = useApi<TILocation[]>(() => locationApi.list());
  const { data: menuItems } = useApi<TIMenuItem[]>(() => menuApi.getItems());

  const branch = useMemo(() => {
    if (!locations) return undefined;
    const matchById = !isNaN(Number(slug)) && locations.find(l => l.location_id === Number(slug));
    return matchById || locations.find(l => l.permalink_slug === slug) || locations[0];
  }, [locations, slug]);

  const featured = (menuItems ?? []).slice(0, 5);

  if (!branch) {
    return (
      <div className="min-h-[100dvh] bg-[#FFFBF7] flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-[#78716C] mb-4">Loading branch…</p>
          <div className="w-12 h-12 mx-auto rounded-full border-4 border-[#E8E0D8] border-t-[#1B5E20] animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title={`${branch.location_name} | Cookers Delight`}
        description={`Visit Cookers Delight ${branch.location_name} in ${branch.location_city || 'Accra'}.`}
        canonical={`https://cookers-delight.vercel.app/branches/${branch.permalink_slug ?? branch.location_id}`}
      />

      <div className="min-h-[100dvh] bg-[#FFFBF7] pb-32">
        {/* Hero image */}
        <div className="relative bg-[#F5EFE8]">
          <div className="aspect-[16/10] sm:aspect-[16/7] w-full overflow-hidden">
            <img src={getImgUrl('/assets/forcourt2.jpg')} alt={branch.location_name} className="w-full h-full object-cover" />
          </div>

          <div className="absolute top-4 left-4 right-4 flex items-center justify-between" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
            <Link
              to="/branches"
              onClick={() => haptic(6)}
              className="w-11 h-11 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center text-[#1C1917] shadow-md active:scale-95 transition"
              aria-label="Back"
            >
              <HiArrowLeft size={20} />
            </Link>
            <button
              onClick={() => {
                if (navigator.share) navigator.share({ title: branch.location_name, url: window.location.href }).catch(() => {});
              }}
              className="w-11 h-11 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center text-[#1C1917] shadow-md active:scale-95 transition"
              aria-label="Share branch"
            >
              <HiShare size={18} />
            </button>
          </div>
        </div>

        {/* Dark hero card (mirrors reference's Boston Market panel) */}
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="relative -mt-10 mx-4 sm:mx-8 app-tile-dark p-5 sm:p-7"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <span className="app-label-light">Cookers Delight</span>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-1 leading-tight">
                {branch.location_name}
              </h1>
              <p className="text-white/60 text-xs mt-1 flex items-center gap-1.5">
                <HiMapPin size={12} />
                <span className="truncate">{branch.location_address_1}{branch.location_city ? `, ${branch.location_city}` : ''}</span>
              </p>
            </div>
            <span className="w-10 h-10 rounded-full bg-[#D97706] flex items-center justify-center text-white flex-shrink-0">
              <HiMapPin size={18} />
            </span>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <span className={`app-status-dot ${branch.location_status ? 'app-status-dot--available' : 'app-status-dot--occupied'}`}>
              {branch.location_status ? 'Open now' : 'Closed'}
            </span>
            <span className="text-white/70 text-xs flex items-center gap-1.5">
              <HiStar size={12} className="text-[#F59E0B]" /> 4.6 · 282 reviews
            </span>
          </div>

          {/* Current menu carousel */}
          <div className="mt-5">
            <div className="flex items-center justify-between mb-3">
              <span className="app-label-light">Current menu</span>
              <Link to="/menu" className="text-white/60 hover:text-white text-[11px] font-bold uppercase tracking-widest">
                See all
              </Link>
            </div>
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
              {featured.length === 0 ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="w-32 h-32 rounded-2xl bg-white/5 flex-shrink-0 animate-pulse" />
                ))
              ) : (
                featured.map(item => (
                  <Link
                    key={item.menu_id}
                    to={`/menu/${item.menu_id}`}
                    className="w-32 flex-shrink-0 rounded-2xl bg-white/8 overflow-hidden active:scale-95 transition"
                  >
                    <div className="aspect-square bg-white/10">
                      <img src={item.thumb ?? getImgUrl('/assets/jollof.jpg')} alt={item.menu_name} className="w-full h-full object-cover" />
                    </div>
                    <div className="px-2.5 py-2">
                      <p className="text-white text-[11px] font-bold leading-tight line-clamp-1">{item.menu_name}</p>
                      <p className="text-white/50 text-[10px] mt-0.5">GH₵{Number(item.menu_price).toFixed(2)}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </motion.div>

        {/* Hours */}
        <div className="mx-4 sm:mx-8 mt-4 app-card-flat p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#78716C]">Hours</p>
              <p className="font-display text-xl font-bold text-[#1C1917] mt-0.5 flex items-center gap-2">
                <HiClock size={16} className="text-[#1B5E20]" /> Today open till 10:00 PM
              </p>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {DAYS.map((d, i) => {
              const today = new Date().getDay() === i;
              return (
                <div
                  key={d}
                  className={`rounded-xl py-2 text-center text-[11px] font-bold ${
                    today ? 'bg-[#1B5E20] text-white' : 'bg-[#F5EFE8] text-[#78716C]'
                  }`}
                >
                  {d}
                </div>
              );
            })}
          </div>
        </div>

        {/* Map placeholder + contact */}
        <div className="mx-4 sm:mx-8 mt-4 app-card-flat overflow-hidden">
          <div className="aspect-[16/9] bg-[#F5EFE8] relative">
            <iframe
              title={`Map for ${branch.location_name}`}
              src={`https://maps.google.com/maps?q=${encodeURIComponent(branch.location_address_1 + ' ' + (branch.location_city ?? ''))}&output=embed`}
              className="absolute inset-0 w-full h-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <div className="p-5 flex items-center justify-between gap-3">
            <a
              href={`tel:${branch.location_telephone}`}
              onClick={() => haptic(8)}
              className="flex-1 rounded-full bg-[#F5EFE8] py-3 text-sm font-bold text-[#1C1917] flex items-center justify-center gap-2 active:scale-[0.98] transition"
            >
              <HiPhone size={14} /> Call
            </a>
            <a
              href="https://wa.me/233243379412"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => haptic(8)}
              className="flex-1 rounded-full bg-[#DCFCE7] py-3 text-sm font-bold text-[#1B5E20] flex items-center justify-center gap-2 active:scale-[0.98] transition"
            >
              <BsWhatsapp size={14} /> WhatsApp
            </a>
          </div>
        </div>

        {/* Sticky CTA */}
        <div className="app-cta-sticky">
          <Link
            to={`/bookings?branch=${branch.location_id}`}
            className="app-cta-primary"
            aria-label="Book a table at this branch"
          >
            <span className="text-sm">Book a table</span>
            <span className="app-cta-chip"><HiArrowLongRight size={16} /></span>
          </Link>
        </div>
      </div>
    </>
  );
}
