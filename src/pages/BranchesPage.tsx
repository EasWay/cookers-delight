import React from 'react';
import { motion } from 'motion/react';
import { FiPhone } from 'react-icons/fi';
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
      <section className="relative h-[40vh] flex items-center justify-center overflow-hidden">
        <img src={getImgUrl('/assets/forcourt2.jpg')} className="absolute inset-0 w-full h-full object-cover opacity-50" alt="" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-black to-transparent" />
        <h1 className="relative z-10 text-7xl md:text-9xl font-bold text-center">Our <span className="italic font-normal text-brand-orange">Locations</span></h1>
      </section>

      <section className="relative z-10 py-24 bg-brand-black">
        <div className="container mx-auto px-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="bg-white/5 h-[400px] rounded-[50px] animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-white/40">Failed to load locations</p>
              <button onClick={refetch} className="text-brand-orange font-bold underline">Try Again</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {locations?.map((location, idx) => (
                <motion.div
                  key={location.location_id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -10 }}
                  whileTap={{ scale: 0.99 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 22, delay: idx * 0.08 }}
                  className="bg-white/5 p-12 rounded-[50px] border border-white/5 flex flex-col justify-between group h-full"
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-5xl font-display font-bold group-hover:text-brand-orange transition-colors">{location.location_name}</h3>
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${location.location_status ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${location.location_status ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                        {location.location_status ? 'Open' : 'Closed'}
                      </div>
                    </div>
                    <div className="space-y-2 mb-12 text-white/40 text-lg">
                      <p className="text-brand-orange font-bold uppercase text-xs tracking-widest mb-6">Branch Hub</p>
                      {location.description && <p>{location.description}</p>}
                      <p>{location.location_address_1}</p>
                      {location.location_city && <p>{location.location_city}</p>}
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <motion.a
                      href={`tel:${location.location_telephone}`}
                      onClick={() => haptic(8)}
                      whileTap={{ scale: 0.96 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                      className="bg-white/5 hover:bg-white/10 px-8 py-4 rounded-full font-bold flex items-center gap-2 text-sm"
                    >
                      <FiPhone /> Call Now
                    </motion.a>
                    <motion.a
                      href="https://wa.me/233243379412"
                      onClick={() => haptic(8)}
                      whileTap={{ scale: 0.96 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                      className="bg-brand-orange/10 hover:bg-brand-orange/20 text-brand-orange px-8 py-4 rounded-full font-bold flex items-center gap-2 text-sm"
                    >
                      <BsWhatsapp /> WhatsApp
                    </motion.a>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </PageWrapper>
  );
}
