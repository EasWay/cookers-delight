import React, { useState } from 'react';
import { motion } from 'motion/react';
import { HiArrowLongRight, HiEnvelope, HiPhone, HiMapPin } from 'react-icons/hi2';
import { BsWhatsapp, BsInstagram, BsFacebook } from 'react-icons/bs';
import { usePageContext } from './PublicLayout';
import PageWrapper from '../components/PageWrapper';
import SEOHead from '../components/SEOHead';
import { haptic } from '../utils/haptics';

const CONFIG = { phone: '+233243379412', whatsapp: '233243379412' };

const QUICK_LINKS = [
  { label: 'Call us', icon: HiPhone, href: `tel:${CONFIG.phone}`, accent: 'bg-[#DCFCE7] text-[#1B5E20]' },
  { label: 'WhatsApp', icon: BsWhatsapp, href: `https://wa.me/${CONFIG.whatsapp}`, accent: 'bg-[#DCFCE7] text-[#16A34A]' },
  { label: 'Email', icon: HiEnvelope, href: 'mailto:hello@cookersdelight.com', accent: 'bg-[#FEF3C7] text-[#D97706]' },
] as const;

const SOCIAL = [
  { label: 'Instagram', icon: BsInstagram, href: 'https://instagram.com/cookersdelightgh' },
  { label: 'Facebook', icon: BsFacebook, href: 'https://facebook.com/cookersdelightgh' },
] as const;

export default function ContactPage() {
  const { addToast } = usePageContext();
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'blocked'>('idle');
  const [whatsappUrl, setWhatsappUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitStatus('idle');
    const formData = new FormData(e.target as HTMLFormElement);
    const message = `Hello! New Contact Request:\nName: ${formData.get('name')}\nEmail: ${formData.get('email')}\nMessage: ${formData.get('message')}`;
    const url = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(message)}`;
    const popup = window.open(url, '_blank');
    if (!popup || popup.closed) {
      setWhatsappUrl(url);
      setSubmitStatus('blocked');
    } else {
      addToast('Opening WhatsApp');
      setSubmitStatus('success');
    }
  };

  return (
    <PageWrapper>
      <SEOHead
        title="Contact Us | Cookers Delight"
        description="Get in touch with Cookers Delight. Call, WhatsApp, or message us to enquire about orders, reservations, catering, or any questions about our Accra restaurants."
        canonical="https://cookers-delight.vercel.app/contact"
      />

      {/* Compact hero */}
      <section className="pt-24 pb-6 md:pt-28 md:pb-12 bg-[#F5EFE8]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12">
          <span className="warm-section-label block mb-2 md:mb-3">Contact</span>
          <h1 className="font-display text-3xl sm:text-5xl md:text-7xl font-bold text-[#1C1917]">
            Let&apos;s <span className="text-[#1B5E20] italic font-normal">talk</span>
          </h1>
        </div>
      </section>

      <section className="pb-16 md:pb-24 bg-[#FFFBF7] pt-6">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 lg:px-12 space-y-4">

          {/* Quick action tiles */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            {QUICK_LINKS.map(link => (
              <motion.a
                key={link.label}
                href={link.href}
                target={link.href.startsWith('http') ? '_blank' : undefined}
                rel="noopener noreferrer"
                whileTap={{ scale: 0.96 }}
                onClick={() => haptic(8)}
                className="app-card flex flex-col items-center justify-center gap-2 py-5 active:scale-[0.98] transition"
              >
                <span className={`w-11 h-11 rounded-full flex items-center justify-center ${link.accent}`}>
                  <link.icon size={18} />
                </span>
                <span className="text-[11px] font-bold text-[#1C1917]">{link.label}</span>
              </motion.a>
            ))}
          </div>

          {/* Dark info card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="app-tile-dark p-6 relative overflow-hidden"
          >
            <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-[#D97706]/25 blur-3xl pointer-events-none" />
            <span className="app-label-light">Our spot</span>
            <h2 className="font-display text-2xl font-bold text-white mt-1 leading-tight">
              Across 4 branches in Accra
            </h2>
            <div className="mt-4 space-y-2 text-sm text-white/70">
              <p className="flex items-center gap-2"><HiPhone size={14} className="text-[#FEF3C7]" /> {CONFIG.phone}</p>
              <p className="flex items-center gap-2"><HiEnvelope size={14} className="text-[#FEF3C7]" /> hello@cookersdelight.com</p>
              <p className="flex items-center gap-2"><HiMapPin size={14} className="text-[#FEF3C7]" /> Adenta, Madina, Ashiyie, Haatso</p>
            </div>
            <div className="mt-4 flex items-center gap-2">
              {SOCIAL.map(s => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition"
                >
                  <s.icon size={14} />
                </a>
              ))}
            </div>
          </motion.div>

          {/* Message form */}
          <form onSubmit={handleSubmit} className="app-card p-5 space-y-4">
            <div>
              <p className="font-display text-xl font-bold text-[#1C1917]">Send us a message</p>
              <p className="text-xs text-[#78716C] mt-0.5">We&apos;ll reply on WhatsApp.</p>
            </div>
            <Field name="name" label="Full name" placeholder="Your name" />
            <Field name="email" type="email" label="Email" placeholder="you@example.com" />
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-[#78716C]">Message</label>
              <textarea
                required
                name="message"
                rows={4}
                placeholder="How can we help?"
                className="mt-2 w-full bg-[#F5EFE8] rounded-2xl px-4 py-3 text-sm text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#1B5E20]/40 resize-none"
              />
            </div>
            <motion.button
              type="submit"
              whileTap={{ scale: 0.98 }}
              onClick={() => haptic(12)}
              className="app-cta-primary w-full"
            >
              <span className="text-sm">Send message</span>
              <span className="app-cta-chip"><HiArrowLongRight size={16} /></span>
            </motion.button>
            {submitStatus === 'blocked' && (
              <p className="text-[#D97706] text-xs text-center">
                Popup blocked.{' '}
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="underline font-bold">
                  Open WhatsApp manually
                </a>
              </p>
            )}
            {submitStatus === 'success' && (
              <p className="text-[#1B5E20] text-xs text-center">Message sent. We&apos;ll respond shortly.</p>
            )}
          </form>
        </div>
      </section>
    </PageWrapper>
  );
}

function Field({
  name, label, type = 'text', placeholder,
}: { name: string; label: string; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs font-bold uppercase tracking-widest text-[#78716C]">{label}</label>
      <input
        required
        name={name}
        type={type}
        placeholder={placeholder}
        className="mt-2 w-full bg-[#F5EFE8] rounded-2xl px-4 py-3 text-base text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#1B5E20]/40"
      />
    </div>
  );
}
