/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

export function Hero() {
  return (
    <section className="relative h-screen min-h-[600px] pt-20 flex items-center overflow-hidden immersive-gradient">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 grid lg:grid-cols-2 gap-12 items-center w-full">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="z-10"
        >
          <div className="inline-block px-3 py-1.5 bg-brand-orange text-white text-[11px] font-black uppercase tracking-widest mb-6 rounded-sm">
            Ghana's Favourite Restaurant
          </div>
          <h1 className="font-serif text-[88px] md:text-[120px] font-normal text-white leading-[0.85] mb-8 tracking-tighter drop-shadow-2xl">
            Hot &<br />
            <span className="text-white">Tasty<span className="text-brand-orange">.</span></span>
          </h1>
          <p className="text-white/80 text-lg mb-10 max-w-md leading-relaxed font-medium">
            Experience authentic Ghanaian delicacies and Nigerian specials, crafted with love and professional service delivery.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              to="/menu"
              className="min-h-[56px] flex items-center justify-center bg-brand-burgundy text-white px-10 py-4 font-bold uppercase tracking-widest text-xs hover:bg-white hover:text-brand-burgundy transition-all"
            >
              Order Online
            </Link>
            <a
              href="#menu"
              className="min-h-[56px] flex items-center justify-center bg-transparent text-white border border-white/30 px-10 py-4 font-bold uppercase tracking-widest text-xs hover:bg-white/10 transition-all"
            >
              View Menu
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotate: 10 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="relative flex justify-center items-center lg:justify-end"
        >
          {/* Food Disk */}
          <div className="relative w-[320px] h-[320px] sm:w-[450px] sm:h-[450px] lg:w-[500px] lg:h-[500px]">
            <div className="absolute inset-0 rounded-full border-[12px] border-white/5 shadow-[0_0_100px_rgba(236,72,36,0.2)] animate-spin-slow overflow-hidden">
               <img 
                src="https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?auto=format&fit=crop&q=85&w=1200&fm=webp" 
                alt="Jollof Special"
                className="w-full h-full object-cover scale-110"
                loading="eager"
                decoding="async"
              />
            </div>
            
            {/* Food Label */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="absolute bottom-10 right-0 lg:-right-10 food-label-blur p-6 rounded-2xl w-56 z-20"
            >
              <h4 className="text-brand-orange text-xs font-black uppercase tracking-widest mb-1">Chef's Special</h4>
              <p className="text-white/80 text-sm leading-tight">Jollof Rice with Grilled Tilapia & Shito Sauce</p>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Footer Meta Simulation */}
      <div className="absolute bottom-12 left-6 sm:left-12 hidden md:flex gap-12 font-bold text-[10px] uppercase tracking-[0.2em] text-white/30">
        <div><span className="text-white mr-2">Kaneshie</span> Opposite Cocoa Clinic</div>
        <div><span className="text-white mr-2">East Legon</span> Near Police Station</div>
        <div><span className="text-white mr-2">Circle</span> American Mall</div>
      </div>

      <a
        href={`https://wa.me/233243379412`}
        className="fixed bottom-6 right-4 sm:bottom-10 sm:right-10 z-[100] bg-[#25D366] text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full flex flex-col items-center gap-0.5 shadow-[0_10px_30px_rgba(37,211,102,0.3)] hover:scale-105 transition-transform min-h-[44px] justify-center"
      >
        <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Order via WhatsApp</span>
        <span className="text-sm font-black">+233 24 337 9412</span>
      </a>
    </section>
  );
}
