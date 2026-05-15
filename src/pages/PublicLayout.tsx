import React, { useState, useEffect, createContext, useContext } from 'react';
import { Outlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { BsWhatsapp } from 'react-icons/bs';
import { HiArrowUp } from 'react-icons/hi2';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BottomNav from '../components/BottomNav';
import AnnouncementBar from '../components/AnnouncementBar';
import Toast, { type ToastMessage } from '../components/Toast';
import PWAUpdateBanner from '../components/PWAUpdateBanner';

// Shared page context — avoids prop-drilling navigation and toast down every page.
interface PageContextValue {
  navigate: (page: string) => void;
  addToast: (msg: string) => void;
}

export const PageContext = createContext<PageContextValue>({
  navigate: () => {},
  addToast: () => {},
});

export function usePageContext() {
  return useContext(PageContext);
}

export default function PublicLayout() {
  const [loading, setLoading]           = useState(true);
  const [toasts, setToasts]             = useState<ToastMessage[]>([]);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    const onScroll = () => setShowScrollTop(window.scrollY > 500);
    window.addEventListener('scroll', onScroll);
    return () => { clearTimeout(timer); window.removeEventListener('scroll', onScroll); };
  }, []);

  const addToast = (message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type: 'success' }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  // navigate() scrolls to top and is passed via context to pages
  const navigate = (page: string) => {
    window.history.pushState({}, '', `/${page.toLowerCase()}`);
    window.scrollTo({ top: 0 });
  };

  return (
    <PageContext.Provider value={{ navigate, addToast }}>
      <div className="min-h-[100dvh] bg-[#FFFBF7] text-[#1C1917] selection:bg-[#DCFCE7] pb-[var(--bottom-nav-height)] md:pb-0">
        <PWAUpdateBanner />
        <AnnouncementBar />

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loader"
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-0 z-[1000] bg-[#FFFBF7] flex flex-col items-center justify-center p-10"
            >
              {/* Decorative blobs */}
              <div className="absolute top-16 left-16 w-72 h-72 rounded-full bg-[#DCFCE7] opacity-60 blur-3xl pointer-events-none" />
              <div className="absolute bottom-16 right-16 w-56 h-56 rounded-full bg-[#FEF3C7] opacity-50 blur-3xl pointer-events-none" />

              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                className="relative text-center"
              >
                <span className="text-4xl md:text-7xl font-display font-bold text-[#1C1917]">
                  Cookers<span className="text-[#1B5E20]">Delight</span>
                </span>
                <p className="text-[#78716C] text-xs font-bold uppercase tracking-[0.25em] mt-3">
                  Ghana's Favourite Restaurant
                </p>
              </motion.div>

              <div className="w-full max-w-xs h-1 bg-[#E8E0D8] rounded-full overflow-hidden mt-10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 1.6 }}
                  className="h-full bg-[#1B5E20] rounded-full"
                />
              </div>
            </motion.div>
          ) : (
            <div key="main" className="relative">
              <Navbar />
              <Outlet />
              <Footer />
              <BottomNav />

              {/* Floating actions — positioned above bottom nav on mobile */}
              <div className="fixed bottom-[calc(var(--bottom-nav-height)+1.5rem)] lg:bottom-10 right-8 z-[60] flex flex-col gap-4">
                <AnimatePresence>
                  {showScrollTop && (
                    <motion.button
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      whileHover={{ y: -3, scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                      className="w-14 h-14 bg-white border border-[#E8E0D8] shadow-lg rounded-full flex items-center justify-center text-[#1B5E20] hover:bg-[#1B5E20] hover:text-white transition-colors"
                    >
                      <HiArrowUp size={22} />
                    </motion.button>
                  )}
                </AnimatePresence>
                <a
                  href="https://wa.me/233243379412"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center text-white shadow-2xl hover:scale-110 transition-transform"
                >
                  <BsWhatsapp size={28} />
                </a>
              </div>

              <Toast toasts={toasts} removeToast={id => setToasts(prev => prev.filter(t => t.id !== id))} />
            </div>
          )}
        </AnimatePresence>
      </div>
    </PageContext.Provider>
  );
}
