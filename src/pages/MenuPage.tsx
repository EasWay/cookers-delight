import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  HiOutlineShoppingBag, HiPlus, HiMinus, HiTrash, HiXMark, HiClock,
  HiMagnifyingGlass, HiArrowRight, HiArrowLongRight,
} from 'react-icons/hi2';
import { BsWhatsapp } from 'react-icons/bs';
import PageWrapper from '../components/PageWrapper';
import SEOHead from '../components/SEOHead';
import { useApi } from '../hooks/useApi';
import { menuApi, prepTimeApi } from '../lib/api';
import { getImgUrl } from '../utils/image';
import { usePageContext } from './PublicLayout';
import { useCart } from '../contexts/CartContext';
import { haptic } from '../utils/haptics';
import type { TIMenuItem } from '../types';

const CATEGORIES = ['All', 'Ghanaian', 'Nigerian', 'Snacks', 'Sides', 'Fast Food', 'Continental'];
const WHATSAPP_NUMBER = '233243379412';

export default function MenuPage() {
  const navigate = useNavigate();
  const { addToast } = usePageContext();
  const { data: items, loading, error, refetch } = useApi<TIMenuItem[]>(() => menuApi.getItems());
  const { data: prepTimes } = useApi<Record<string, number>>(() => prepTimeApi.getAll());

  const {
    cart, totalQty, total, estimatedWait,
    addToCart, updateQty, removeFromCart, hasItem,
  } = useCart();

  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);

  const enrichedItems = useMemo<TIMenuItem[]>(() => {
    if (!items) return [];
    if (!prepTimes) return items;
    return items.map(item => ({
      ...item,
      prep_time_minutes: prepTimes[String(item.menu_id)] ?? item.prep_time_minutes ?? 15,
    }));
  }, [items, prepTimes]);

  // Cache the enriched list on window so MenuItemDetailPage can hydrate from it.
  useEffect(() => {
    if (enrichedItems.length === 0) return;
    (window as unknown as { __cdMenuCache?: TIMenuItem[] }).__cdMenuCache = enrichedItems;
  }, [enrichedItems]);

  const filteredItems = useMemo(() => {
    return enrichedItems.filter(item => {
      const cat = item.categories?.[0]?.name ?? '';
      const matchCat = activeCategory === 'All' || cat === activeCategory;
      const q = search.toLowerCase();
      const matchSearch =
        item.menu_name.toLowerCase().includes(q) ||
        (item.menu_description ?? '').toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [enrichedItems, activeCategory, search]);

  const handleAdd = (item: TIMenuItem) => {
    addToCart(item);
    haptic(10);
    addToast(`Added ${item.menu_name}`);
  };

  const sendWhatsApp = () => {
    const msg = `Hello Cookers Delight! I'd like to order:\n${cart.map(i => `- ${i.quantity}x ${i.menu_name} (GH₵${i.menu_price.toFixed(2)})`).join('\n')}\n\nTotal: GH₵${total.toFixed(2)}\nEstimated wait: ~${estimatedWait} min\nPlease confirm.`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`);
  };

  return (
    <PageWrapper>
      <SEOHead
        title="Our Menu | Cookers Delight"
        description="Explore our full menu of authentic Ghanaian and Nigerian dishes — jollof rice, waakye, fufu, egusi soup, grilled meats and more. Order online for fast delivery in Accra."
        canonical="https://cookers-delight.vercel.app/menu"
      />

      {/* ── Page hero (preserved for desktop, compact on mobile) ──────────── */}
      <section className="pt-24 pb-6 md:pt-28 md:pb-12 bg-[#F5EFE8]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12">
          <span className="warm-section-label block mb-2 md:mb-3">Our Menu</span>
          <h1 className="font-display text-3xl sm:text-5xl md:text-7xl font-bold text-[#1C1917]">
            Taste-Bud <span className="text-[#1B5E20] italic font-normal">Heaven</span>
          </h1>
          <p className="hidden md:block text-[#78716C] text-lg mt-4 max-w-xl">
            Explore our full menu of authentic West African dishes. Every bite tells a story.
          </p>
        </div>
      </section>

      {/* ── Sticky search + cart row ──────────────────────────────────────── */}
      <div className="sticky top-[60px] z-40 bg-white/95 backdrop-blur-md border-b border-[#E8E0D8]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-3 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <HiMagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#78716C]" />
            <input
              type="text"
              placeholder="Search dishes…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#F5EFE8] rounded-full text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#1B5E20]/40 focus:bg-white transition-all"
            />
          </div>

          {/* Desktop category pills */}
          <div className="hidden sm:flex items-center gap-2 overflow-x-auto no-scrollbar flex-1">
            {CATEGORIES.map(cat => (
              <motion.button
                key={cat}
                onClick={() => { setActiveCategory(cat); haptic(6); }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                className={`relative flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  activeCategory === cat ? 'text-white' : 'bg-[#F5EFE8] text-[#78716C] hover:bg-[#DCFCE7] hover:text-[#14532D]'
                }`}
              >
                {cat === activeCategory && (
                  <motion.span
                    layoutId="cat-pill"
                    className="absolute inset-0 bg-[#1B5E20] rounded-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative z-10">{cat}</span>
              </motion.button>
            ))}
          </div>

          <button
            onClick={() => setIsCartOpen(true)}
            className="relative flex-shrink-0 bg-[#0F3F1F] text-white rounded-full pl-4 pr-2 py-2 flex items-center gap-2 font-bold text-sm hover:bg-[#14532D] transition-colors"
            aria-label="Open cart"
          >
            <HiOutlineShoppingBag size={16} />
            <span className="hidden sm:block">Cart</span>
            <span className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center text-[11px] font-black">
              {totalQty}
            </span>
          </button>
        </div>
      </div>

      {/* ── Mobile category pills (full-width horizontal scroll) ──────────── */}
      <div className="sm:hidden bg-[#FFFBF7] border-b border-[#E8E0D8]">
        <div className="px-5 py-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {CATEGORIES.map(cat => (
            <motion.button
              key={cat}
              onClick={() => { setActiveCategory(cat); haptic(6); }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              className={`relative flex-shrink-0 min-h-[36px] px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                activeCategory === cat ? 'text-white' : 'bg-white text-[#78716C]'
              }`}
            >
              {cat === activeCategory && (
                <motion.span
                  layoutId="cat-pill-mobile"
                  className="absolute inset-0 bg-[#1B5E20] rounded-full"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative z-10">{cat}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* ── Item list ─────────────────────────────────────────────────────── */}
      <section className="pt-5 pb-32 sm:pb-12 md:py-12 bg-[#FFFBF7]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12">
          {loading && (
            <div className="space-y-3 sm:grid sm:space-y-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="app-card flex items-center gap-3 p-3 sm:block sm:p-0 animate-pulse">
                  <div className="w-20 h-20 sm:w-full sm:h-44 bg-[#F0EBE4] rounded-2xl sm:rounded-t-[1.5rem] sm:rounded-b-none" />
                  <div className="flex-1 space-y-2 sm:p-4">
                    <div className="h-3 bg-[#F0EBE4] rounded-full w-3/4" />
                    <div className="h-3 bg-[#F0EBE4] rounded-full w-1/2" />
                    <div className="h-6 w-20 bg-[#F0EBE4] rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && !loading && (
            <div className="text-center py-20">
              <p className="text-[#78716C] mb-4">Failed to load menu. Please try again.</p>
              <button onClick={refetch} className="warm-btn-primary text-sm px-6 py-3">Retry</button>
            </div>
          )}

          {!loading && !error && (
            <>
              {/* MOBILE: list-style image-left cards */}
              <motion.div layout className="space-y-3 sm:hidden">
                <AnimatePresence>
                  {filteredItems.map((item, idx) => {
                    const inCart = hasItem(item.menu_id);
                    const categoryName = item.categories?.[0]?.name ?? 'Ghanaian';
                    return (
                      <motion.div
                        layout
                        key={item.menu_id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: (idx % 8) * 0.03, type: 'spring', stiffness: 320, damping: 26 }}
                        className="app-card flex items-stretch overflow-hidden"
                      >
                        <Link
                          to={`/menu/${item.menu_id}`}
                          className="relative w-28 flex-shrink-0 bg-[#F5EFE8]"
                          aria-label={`View ${item.menu_name}`}
                        >
                          <img
                            src={item.thumb ?? getImgUrl('/assets/jollof.jpg')}
                            alt={item.menu_name}
                            className="absolute inset-0 w-full h-full object-cover"
                            loading="lazy"
                          />
                        </Link>
                        <div className="flex-1 min-w-0 p-3 flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#1B5E20]">
                              {categoryName}
                            </span>
                            <Link to={`/menu/${item.menu_id}`} className="block">
                              <h3 className="font-display font-bold text-[#1C1917] text-base leading-tight mt-0.5 line-clamp-1">
                                {item.menu_name}
                              </h3>
                            </Link>
                            <div className="flex items-center gap-1 text-[10px] text-[#78716C] mt-1">
                              <HiClock size={11} /> ~{item.prep_time_minutes ?? 15}min
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="font-display text-lg font-black text-[#1C1917]">
                              GH₵{Number(item.menu_price).toFixed(2)}
                            </span>
                            {inCart ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => updateQty(item.menu_id, -1)}
                                  className="w-7 h-7 rounded-full bg-[#F5EFE8] flex items-center justify-center text-[#1C1917]"
                                  aria-label="Decrease quantity"
                                >
                                  <HiMinus size={12} />
                                </button>
                                <span className="text-sm font-bold w-5 text-center">{inCart.quantity}</span>
                                <button
                                  onClick={() => addToCart(item)}
                                  className="w-7 h-7 rounded-full bg-[#1B5E20] text-white flex items-center justify-center"
                                  aria-label="Increase quantity"
                                >
                                  <HiPlus size={12} />
                                </button>
                              </div>
                            ) : (
                              <motion.button
                                onClick={() => handleAdd(item)}
                                whileTap={{ scale: 0.94 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                                className="bg-[#0F3F1F] text-white w-9 h-9 rounded-full flex items-center justify-center"
                                aria-label={`Add ${item.menu_name} to cart`}
                              >
                                <HiPlus size={16} />
                              </motion.button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {filteredItems.length === 0 && (
                  <div className="text-center py-16 text-[#78716C]">
                    <p className="font-bold text-lg text-[#1C1917]">No dishes found</p>
                    <p className="text-sm mt-1">Try a different category or search term.</p>
                  </div>
                )}
              </motion.div>

              {/* DESKTOP: original card grid preserved */}
              <motion.div layout className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <AnimatePresence>
                  {filteredItems.map((item, idx) => {
                    const inCart = hasItem(item.menu_id);
                    const categoryName = item.categories?.[0]?.name ?? 'Ghanaian';
                    return (
                      <motion.div
                        layout
                        key={item.menu_id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        whileHover={{ y: -4 }}
                        transition={{ delay: (idx % 8) * 0.04, type: 'spring', stiffness: 350, damping: 28 }}
                        className="warm-card group overflow-hidden flex flex-col"
                      >
                        <Link to={`/menu/${item.menu_id}`} className="relative h-44 overflow-hidden rounded-t-[1.25rem] block">
                          <img
                            src={item.thumb ?? getImgUrl('/assets/jollof.jpg')}
                            alt={item.menu_name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                          <span className="absolute top-3 left-3 warm-pill">{categoryName}</span>
                          {item.prep_time_minutes && (
                            <span className="absolute bottom-3 right-3 bg-white/90 text-[#1C1917] text-[9px] font-black px-2 py-1 rounded-full flex items-center gap-1">
                              <HiClock size={10} /> {item.prep_time_minutes}min
                            </span>
                          )}
                        </Link>
                        <div className="p-4 flex flex-col gap-2 flex-1">
                          <Link to={`/menu/${item.menu_id}`}>
                            <h3 className="font-display font-bold text-[#1C1917] text-base leading-tight">
                              {item.menu_name}
                            </h3>
                          </Link>
                          {item.menu_description && (
                            <p className="text-[11px] text-[#78716C] line-clamp-2 flex-1 leading-relaxed">
                              {item.menu_description}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-2 pt-3 border-t border-[#F5EFE8]">
                            <span className="warm-price">GH₵{Number(item.menu_price).toFixed(2)}</span>
                            {inCart ? (
                              <div className="flex items-center gap-1.5">
                                <button onClick={() => updateQty(item.menu_id, -1)} className="w-7 h-7 rounded-full border border-[#E8E0D8] flex items-center justify-center">
                                  <HiMinus size={12} />
                                </button>
                                <span className="text-sm font-bold w-5 text-center">{inCart.quantity}</span>
                                <button onClick={() => addToCart(item)} className="w-7 h-7 rounded-full bg-[#1B5E20] text-white flex items-center justify-center">
                                  <HiPlus size={12} />
                                </button>
                              </div>
                            ) : (
                              <motion.button
                                onClick={() => handleAdd(item)}
                                whileTap={{ scale: 0.97 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                                className="flex items-center gap-1.5 bg-[#1B5E20] text-white text-[11px] font-bold px-4 py-2 rounded-full"
                              >
                                <HiPlus size={12} /> Add
                              </motion.button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {filteredItems.length === 0 && (
                  <div className="col-span-full text-center py-20 text-[#78716C]">
                    <p className="font-bold text-lg text-[#1C1917]">No dishes found</p>
                    <p className="text-sm mt-1">Try a different category or search term.</p>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </div>
      </section>

      {/* ── Mobile sticky cart bar (above bottom nav) ─────────────────────── */}
      <AnimatePresence>
        {cart.length > 0 && !isCartOpen && (
          <motion.div
            className="sm:hidden app-cta-sticky"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            <motion.button
              onClick={() => setIsCartOpen(true)}
              whileTap={{ scale: 0.98 }}
              className="app-cta-primary"
              aria-label={`View cart: ${totalQty} items, total GH₵${total.toFixed(2)}`}
            >
              <span className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-[11px] font-black">
                  {totalQty}
                </span>
                <span className="text-sm">View order</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="font-display text-lg font-black">GH₵{total.toFixed(2)}</span>
                <span className="app-cta-chip">
                  <HiArrowLongRight size={16} />
                </span>
              </span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Cart sheet (mobile full-sheet, desktop right drawer) ──────────── */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/40 z-[70] backdrop-blur-sm"
            />
            {/* Mobile: bottom sheet */}
            <motion.div
              key="cart-sheet-mobile"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 320 }}
              className="sm:hidden fixed left-0 right-0 bottom-0 top-12 z-[80] bg-[#FFFBF7] rounded-t-[2rem] shadow-2xl flex flex-col"
              style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            >
              <div className="px-5 pt-4 pb-3 border-b border-[#E8E0D8]">
                <div className="w-12 h-1.5 bg-[#E8E0D8] rounded-full mx-auto mb-4" />
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-2xl font-bold text-[#1C1917]">Your order</h2>
                    <p className="text-xs text-[#78716C] mt-0.5">
                      {totalQty} {totalQty === 1 ? 'item' : 'items'} · ~{estimatedWait}min wait
                    </p>
                  </div>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="w-10 h-10 rounded-full bg-white text-[#1C1917] flex items-center justify-center shadow-sm"
                    aria-label="Close cart"
                  >
                    <HiXMark size={20} />
                  </button>
                </div>
              </div>
              <CartItemsList />
              {cart.length > 0 && (
                <div className="px-5 pt-4 pb-4 border-t border-[#E8E0D8] bg-white space-y-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs uppercase tracking-widest font-bold text-[#78716C]">Total</span>
                    <span className="font-display text-3xl font-black text-[#1C1917]">GH₵{total.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={() => { haptic(10); navigate('/checkout'); }}
                    className="w-full py-4 rounded-2xl font-bold text-base tracking-wide bg-[var(--cd-green)] text-white transition-all active:scale-95"
                  >
                    Start my order
                  </button>
                  <button
                    onClick={sendWhatsApp}
                    className="w-full py-3 rounded-2xl font-semibold text-sm tracking-wide border border-[var(--cd-border)] text-[var(--cd-muted)] bg-transparent transition-all active:scale-95"
                  >
                    Order via WhatsApp
                  </button>
                </div>
              )}
            </motion.div>

            {/* Desktop: right drawer (original) */}
            <motion.div
              key="cart-drawer-desktop"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="hidden sm:flex fixed right-0 top-0 h-full w-full max-w-md bg-white z-[80] shadow-2xl flex-col"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-[#E8E0D8]">
                <h2 className="font-display text-2xl font-bold text-[#1C1917]">
                  Your Order
                  {totalQty > 0 && (
                    <span className="ml-2 text-sm font-body font-normal text-[#78716C]">({totalQty} items)</span>
                  )}
                </h2>
                <button onClick={() => setIsCartOpen(false)} className="p-2 rounded-full hover:bg-[#F5EFE8] text-[#78716C]">
                  <HiXMark size={22} />
                </button>
              </div>
              <CartItemsList />
              {cart.length > 0 && (
                <div className="px-6 py-6 border-t border-[#E8E0D8] space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-[#78716C] font-bold uppercase tracking-wider">Total</p>
                      <p className="text-2xl font-display font-black text-[#1C1917]">GH₵{total.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[#78716C] font-bold uppercase tracking-wider">Est. Wait</p>
                      <p className="text-lg font-bold text-[#1B5E20] flex items-center gap-1">
                        <HiClock size={16} /> ~{estimatedWait}min
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => { haptic(10); navigate('/checkout'); }}
                    className="w-full py-4 rounded-2xl font-bold text-base tracking-wide bg-[var(--cd-green)] text-white transition-all active:scale-95"
                  >
                    Start my order
                  </button>
                  <button
                    onClick={sendWhatsApp}
                    className="w-full py-3 rounded-2xl font-semibold text-sm tracking-wide border border-[var(--cd-border)] text-[var(--cd-muted)] bg-transparent transition-all active:scale-95"
                  >
                    Order via WhatsApp
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </PageWrapper>
  );

  function CartItemsList() {
    return (
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[#78716C] py-20">
            <HiOutlineShoppingBag size={48} className="mb-4 text-[#D6D3D1]" />
            <p className="font-bold text-[#1C1917]">Your cart is empty</p>
            <p className="text-sm mt-1">Add items from the menu to get started.</p>
            <button onClick={() => setIsCartOpen(false)} className="mt-6 warm-btn-outline text-sm px-6 py-2.5">
              Browse menu <HiArrowRight size={14} />
            </button>
          </div>
        ) : (
          cart.map(cartItem => (
            <div key={cartItem.menu_id} className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-[#E8E0D8]">
              <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-[#F5EFE8]">
                <img src={cartItem.thumb ?? getImgUrl('/assets/jollof.jpg')} className="w-full h-full object-cover" alt={cartItem.menu_name} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-[#1C1917] leading-tight truncate">{cartItem.menu_name}</p>
                <div className="flex items-center gap-1.5 text-[10px] text-[#78716C] mt-0.5">
                  <HiClock size={11} /> ~{cartItem.prep_time_minutes}min
                </div>
                <p className="text-[#1B5E20] font-black text-sm mt-1">
                  GH₵{(cartItem.menu_price * cartItem.quantity).toFixed(2)}
                </p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <button onClick={() => updateQty(cartItem.menu_id, -1)} className="w-7 h-7 rounded-full border border-[#E8E0D8] flex items-center justify-center">
                    <HiMinus size={12} />
                  </button>
                  <span className="text-sm font-bold w-5 text-center">{cartItem.quantity}</span>
                  <button onClick={() => updateQty(cartItem.menu_id, 1)} className="w-7 h-7 rounded-full bg-[#1B5E20] text-white flex items-center justify-center">
                    <HiPlus size={12} />
                  </button>
                </div>
                <button onClick={() => removeFromCart(cartItem.menu_id)} className="text-[#A8A29E] hover:text-[#EF4444] transition" aria-label="Remove item">
                  <HiTrash size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    );
  }
}
