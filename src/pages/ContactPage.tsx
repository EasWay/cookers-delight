import React, { useState } from 'react';
import { motion } from 'motion/react';
import { BsWhatsapp, BsInstagram, BsFacebook } from 'react-icons/bs';
import { FiPhone } from 'react-icons/fi';
import { usePageContext } from './PublicLayout';
import PageWrapper from '../components/PageWrapper';
import SEOHead from '../components/SEOHead';
import { haptic } from '../utils/haptics';

// Inline image formatter (mirrors the one in App.tsx)
const formatImg = (src: string, w: number) => src;

const ContactPage = () => {
  const { addToast } = usePageContext();
  const [config] = useState({ phone: '+233243379412', whatsapp: '233243379412' });
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'blocked'>('idle');
  const [whatsappUrl, setWhatsappUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitStatus('idle');
    const formData = new FormData(e.target as HTMLFormElement);
    const message = `Hello! New Contact Request:\nName: ${formData.get('name')}\nEmail: ${formData.get('email')}\nMessage: ${formData.get('message')}`;
    const url = `https://wa.me/${config.whatsapp}?text=${encodeURIComponent(message)}`;
    const popup = window.open(url, '_blank');
    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      setWhatsappUrl(url);
      setSubmitStatus('blocked');
    } else {
      addToast('Opening WhatsApp... ✓');
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
      <section className="relative h-[40vh] flex items-center justify-center overflow-hidden">
        <img src={formatImg("/assets/fried rice and kelewala and chicken.jpg", 1920)} className="absolute inset-0 w-full h-full object-cover opacity-50" alt="" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-black to-transparent"></div>
        <h1 className="relative z-10 text-7xl md:text-9xl font-bold">Con<span className="italic font-normal text-brand-orange">tact</span></h1>
      </section>
      <section className="py-24 bg-brand-black">
        <div className="container mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-20">
          <div className="space-y-12">
            <h2 className="text-8xl font-display font-bold leading-none">Let's <br/><span className="text-brand-orange italic font-normal">Connect.</span></h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[
                { label: 'WhatsApp', val: 'Chat Online', icon: <BsWhatsapp />, href: `https://wa.me/${config.whatsapp}` },
                { label: 'Phone', val: `+${config.phone}`, icon: <FiPhone />, href: `tel:+${config.phone}` },
                { label: 'Instagram', val: '@cookersdelightgh', icon: <BsInstagram />, href: 'https://instagram.com/cookersdelightgh' },
                { label: 'Facebook', val: 'Cookers Delight', icon: <BsFacebook />, href: 'https://facebook.com/cookersdelightgh' }
              ].map(c => (
                <motion.a
                  key={c.label}
                  href={c.href}
                  whileHover={{ y: -4, scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                  className="bg-white/5 p-8 rounded-[40px] border border-white/5 hover:border-brand-orange/40 transition-colors block"
                >
                  <div className="text-brand-orange mb-6">{c.icon}</div>
                  <p className="text-white/40 uppercase text-xs font-bold tracking-widest mb-1">{c.label}</p>
                  <p className="text-xl font-bold">{c.val}</p>
                </motion.a>
              ))}
            </div>
          </div>
          <div className="bg-white/5 p-16 rounded-[60px] border border-white/5">
             <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-3">
                   <label className="text-xs uppercase font-bold text-white/40 tracking-widest">Full Name</label>
                   <input required name="name" type="text" className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 focus:border-brand-orange outline-none transition-colors duration-200" placeholder="Your Name" />
                </div>
                <div className="space-y-3">
                   <label className="text-xs uppercase font-bold text-white/40 tracking-widest">Email Address</label>
                   <input required name="email" type="email" className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 focus:border-brand-orange outline-none transition-colors duration-200" placeholder="you@example.com" />
                </div>
                <div className="space-y-3">
                   <label className="text-xs uppercase font-bold text-white/40 tracking-widest">Message</label>
                   <textarea required name="message" rows={5} className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 focus:border-brand-orange outline-none resize-none transition-colors duration-200" placeholder="How can we help?"></textarea>
                </div>
                <motion.button
                  type="submit"
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                  onClick={() => haptic(12)}
                  className="w-full bg-brand-orange text-white py-6 rounded-2xl font-bold text-xl hover:scale-105 transition-all"
                >
                  Send Message
                </motion.button>
                {submitStatus === 'blocked' && (
                  <p className="text-yellow-400 text-sm text-center">
                    Popup was blocked.{' '}
                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="underline text-brand-orange">
                      Open WhatsApp manually
                    </a>
                  </p>
                )}
                {submitStatus === 'success' && (
                  <p className="text-green-400 text-sm text-center">Message sent! We'll respond shortly.</p>
                )}
             </form>
          </div>
        </div>
      </section>
    </PageWrapper>
  );
};

export default ContactPage;
