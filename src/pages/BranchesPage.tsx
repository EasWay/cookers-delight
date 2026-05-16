import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { HiChevronRight, HiMapPin, HiPhone } from 'react-icons/hi2';
import { BsWhatsapp } from 'react-icons/bs';
import PageWrapper from '../components/PageWrapper';
import SEOHead from '../components/SEOHead';
import { useApi } from '../hooks/useApi';
import { locationApi } from '../lib/api';
import { getImgUrl } from '../utils/image';
import { haptic } from '../utils/haptics';
import type { TILocation } from '../types';

export default function BranchesPage() {
  const { data: locations, loading, error, refetch } = useApi<TILocation[]>(() => locationApi.list());

  return (
    <PageWrapper>
      <SEOHead
        title="Our Branches | Cookers Delight"
        description="Find a Cookers Delight branch near you in Accra, Ghana. Multiple locations offering dine-in, takeaway, and delivery of authentic Ghanaian and Nigerian food."
        canonical="https://cookers-delight.vercel.app/branches"
      />

      {/* Mobile-first compact hero */}
      <section className="pt-24 pb-6 md:pt-28 md:pb-12 bg-[#F5EFE8]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12">
          <span className="warm-section-label block mb-2 md:mb-3">Our locations</span>
          <h1 className="font-display text-3xl sm:text-5xl md:text-7xl font-bold text-[#1C1917]">
            Find a <span className="text-[#1B5E20] italic font-normal">branch</span>
          </h1>
          <p className="hidden md:block text-[#78716C] text-lg mt-4 max-w-xl">
            Four Cookers Delight kitchens across Accra. Dine-in, takeaway, or delivery.
          </p>
        </div>
      </section>

      <section className="py-6 md:py-12 bg-[#FFFBF7]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12">
          {loading ? (
            <div className="space-y-3 md:grid md:space-y-0 md:grid-cols-2 md:gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="app-card flex items-center gap-4 p-3 animate-pulse">
                  <div className="w-24 h-24 bg-[#F0EBE4] rounded-2xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-32 bg-[#F0EBE4] rounded-full" />
                    <div className="h-3 w-48 bg-[#F0EBE4] rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <p className="text-[#78716C] mb-4">Couldn&apos;t load branches.</p>
              <button onClick={refetch} className="warm-btn-primary text-sm px-6 py-3">Try again</button>
            </div>
          ) : (
            <div className="space-y-3 md:grid md:space-y-0 md:grid-cols-2 md:gap-6">
              {locations?.map((loc, idx) => (
                <motion.div
                  key={loc.location_id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.05, type: 'spring', stiffness: 300, damping: 28 }}
                  className="app-card overflow-hidden"
                >
                  <Link
                    to={`/branches/${loc.permalink_slug ?? loc.location_id}`}
                    onClick={() => haptic(6)}
                    className="flex items-stretch w-full text-left"
                  >
                    <div className="relative w-28 sm:w-32 flex-shrink-0 bg-[#F5EFE8]">
                      <img
                        src={getImgUrl('/assets/forcourt2.jpg')}
                        alt={loc.location_name}
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="flex-1 min-w-0 p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`app-status-dot ${loc.location_status ? 'app-status-dot--available' : 'app-status-dot--occupied'}`}>
                            {loc.location_status ? 'Open' : 'Closed'}
                          </span>
                        </div>
                        <h3 className="font-display text-xl font-bold text-[#1C1917] leading-tight">
                          {loc.location_name}
                        </h3>
                        <p className="text-xs text-[#78716C] mt-1 flex items-center gap-1">
                          <HiMapPin size={11} />
                          <span className="truncate">{loc.location_address_1}{loc.location_city ? `, ${loc.location_city}` : ''}</span>
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <a
                            href={`tel:${loc.location_telephone}`}
                            onClick={e => { e.stopPropagation(); haptic(8); }}
                            className="w-8 h-8 rounded-full bg-[#F5EFE8] flex items-center justify-center text-[#1C1917] active:scale-95 transition"
                            aria-label="Call branch"
                          >
                            <HiPhone size={14} />
                          </a>
                          <a
                            href="https://wa.me/233243379412"
                            onClick={e => { e.stopPropagation(); haptic(8); }}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 rounded-full bg-[#DCFCE7] flex items-center justify-center text-[#1B5E20] active:scale-95 transition"
                            aria-label="WhatsApp branch"
                          >
                            <BsWhatsapp size={14} />
                          </a>
                        </div>
                        <span className="w-8 h-8 rounded-full bg-[#1B5E20] text-white flex items-center justify-center">
                          <HiChevronRight size={16} />
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </PageWrapper>
  );
}
