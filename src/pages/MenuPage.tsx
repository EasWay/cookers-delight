import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  HiOutlineShoppingBag, HiPlus, HiMinus, HiTrash, HiXMark, HiClock,
  HiMagnifyingGlass, HiStar, HiArrowRight,
} from 'react-icons/hi2';
import { BsWhatsapp } from 'react-icons/bs';
import PageWrapper from '../components/PageWrapper';
import SEOHead from '../components/SEOHead';
import { useApi } from '../hooks/useApi';
import { menuApi, prepTimeApi } from '../lib/api';
import { getImgUrl } from '../utils/image';
import { usePageContext } from './PublicLayout';
import { haptic } from '../utils/haptics';
import type { TIMenuItem } from '../types';

interface CartItem {
  menu_id: number;
  menu_name: string;
  menu_price: number;
  prep_time_minutes: number;
  thumb?: string;
  quantity: number;
}

const CATEGORIES = ['All', 'Ghanaian', 'Nigerian', 'Snacks', 'Sides', 'Fast Food', 'Continental'];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <HiStar key={i} size={12} className={i < Math.round(rating) ? 'text-[#F59E0B]' : 'text-[#D6D3D1]'} />
      ))}
      <span className="ml-1 text-[10px] font-bold text-[#78716C]">{rating.toFixed(1)}</span>
    </div>
  );
}

export default function MenuPage() {
  const { addToast } = usePageContext();
  const { data: items, loading, error, refetch } = useApi<TIMenuItem[]>(() => menuApi.getItems());
  const { data: prepTimes } = useApi<Record<string, number>>(() => prepTimeApi.getAll());

  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch]                 = useState('');
  const [isCartOpen, setIsCartOpen]         = useState(false);
  const [cart, setCart]                     = useState<CartItem[]>([]);

  const enrichedItems = useMemo<TIMenuItem[]>(() => {
    if (!items) return [];
    if (!prepTimes) return items;
    return items.map(item => ({
      ...item,
      prep_time_minutes: prepTimes[String(item.menu_id)] ?? item.prep_time_minutes ?? 15,
    }));
  }, [items, prepTimes]);

  const filteredItems = useMemo(() => {
    return enrichedItems.filter(item => {
      const cat = item.categories?.[0]?.name ?? '';
      const matchCat = activeCategory === 'All' || cat === activeCategory;
      const matchSearch =
        item.menu_name.toLowerCase().includes(search.toLowerCase()) ||
        (item.menu_description ?? '').toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [enrichedItems, activeCategory, search]);

  const addToCart = (item: TIMenuItem) => {
    const prepTime = item.prep_time_minutes ?? 15;
    setCart(prev => {
      const existing = prev.find(i => i.menu_id === item.menu_id);
      if (existing) return prev.map(i => i.menu_id === item.menu_id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, {
        menu_id: item.menu_id,
        menu_name: item.menu_name,
        menu_price: item.menu_price,
        prep_time_minutes: prepTime,
        thumb: item.thumb,
        quantity: 1,
      }];
    });
    haptic(10);
    addToast(`Added ${item.menu_name} ✓`);
  };

  const updateQty = (id: number, delta: number) =>
    setCart(prev => prev.map(i => i.menu_id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i));

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(i => i.menu_id !== id));
    addToast('Item removed');
  };

  const total = cart.reduce((acc, i) => acc + i.menu_price * i.quantity, 0);
  const estimatedWait = cart.length > 0
    ? Math.max(...cart.map(i => i.prep_time_minutes)) + 5
    : 0;

  const sendWhatsApp = () => {
    const msg = `Hello Cookers Delight! I'd like to order:\n${cart.map(i => `- ${i.quantity}x ${i.menu_name} (₵${i.menu_price.toFixed(2)})`).join('\n')}\n\nTotal: ₵${total.toFixed(2)}\nEstimated wait: ~${estimatedWait} min\nPlease confirm.`;
    window.open(`https://wa.me/233243379412?text=${encodeURIComponent(msg)}`);
  };

  const totalQty = cart.reduce((acc, i) => acc + i.quantity, 0);

  return (
    <PageWrapper>
      <SEOHead
        title="Our Menu | Cookers Delight"
        description="Explore our full menu of authentic Ghanaian and Nigerian dishes — jollof rice, waakye, fufu, egusi soup, grilled meats and more. Order online for fast delivery in Accra."
        canonical="https://cookers-delight.vercel.app/menu"
      />
      {/* ── Page hero ─────────────────────────────────────────────────────── */}
      <section className="pt-28 pb-12 bg-[#F5EFE8]">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <span className="text-[#1B5E20] text-[11px] font-bold uppercase tracking-[0.25em] block mb-3">
            Our Menu
          </span>
          <h1 className="font-display text-5xl md:text-7xl font-bold text-[#1C1917]">
            Our Taste-Bud <span className="text-[#1B5E20] italic font-normal">Heaven</span>
          </h1>
          <p className="text-[#78716C] text-lg mt-4 max-w-xl">
            Explore our full menu of authentic West African dishes. Every bite tells a story.
          </p>
        </div>
      </section>

      {/* ── Sticky bar: search + cart ─────────────────────────────────────── */}
      <div className="sticky top-[60px] z-40 bg-white/95 backdrop-blur-md border-b border-[#E8E0D8] shadow-sm">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-3 flex items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <HiMagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#78716C]" />
            <input
              type="text"
              placeholder="Search dishes…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#F5EFE8] rounded-full text-sm text-[#1C1917] placeholder:text-[#A8A29E] border border-[#E8E0D8] focus:outline-none focus:border-[#1B5E20] transition-colors"
            />
          </div>

          {/* Category pills — desktop only; mobile has its own row below the hero */}
          <div className="hidden sm:flex items-center gap-2 overflow-x-auto no-scrollbar flex-1">
            {CATEGORIES.map(cat => (
              <motion.button
                key={cat}
                onClick={() => { setActiveCategory(cat); haptic(6); }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                className={`relative flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  activeCategory === cat
                    ? 'text-white shadow-sm'
                    : 'bg-[#F5EFE8] text-[#78716C] hover:bg-[#DCFCE7] hover:text-[#14532D]'
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

          {/* Cart button */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative flex-shrink-0 bg-[#1B5E20] text-white rounded-full px-5 py-2.5 flex items-center gap-2 font-bold text-sm hover:bg-[#2D6A4F] transition-all"
          >
            <HiOutlineShoppingBag size={18} />
            <span className="hidden sm:block">Cart</span>
            {totalQty > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-[#F59E0B] text-[#1C1917] rounded-full text-[10px] font-black flex items-center justify-center">
                {totalQty}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Mobile category pills (full-width scrollable row) ────────────── */}
      <div className="sm:hidden bg-white border-b border-[#E8E0D8]">
        <div className="px-4 py-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {CATEGORIES.map(cat => (
            <motion.button
              key={cat}
              onClick={() => { setActiveCategory(cat); haptic(6); }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              className={`relative flex-shrink-0 min-h-[36px] px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                activeCategory === cat
                  ? 'text-white shadow-sm'
                  : 'bg-[#F5EFE8] text-[#78716C]'
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

      {/* ── Menu grid ─────────────────────────────────────────────────────── */}
      <section className="py-12 bg-[#FFFBF7]">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          {loading && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="warm-card overflow-hidden animate-pulse">
                  {/* Image placeholder */}
                  <div className="h-44 bg-[#F0EBE4] rounded-t-[1.25rem]" />
                  <div className="p-4 space-y-3">
                    {/* Star row */}
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <div key={j} className="w-3 h-3 rounded-full bg-[#F0EBE4]" />
                      ))}
                    </div>
                    {/* Title */}
                    <div className="h-4 bg-[#F0EBE4] rounded-full w-3/4" />
                    {/* Description lines */}
                    <div className="space-y-1.5">
                      <div className="h-3 bg-[#F0EBE4] rounded-full w-full" />
                      <div className="h-3 bg-[#F0EBE4] rounded-full w-4/5" />
                    </div>
                    {/* Price + button row */}
                    <div className="flex items-center justify-between pt-2 border-t border-[#F5EFE8]">
                      <div className="h-7 w-20 bg-[#F0EBE4] rounded-full" />
                      <div className="h-8 w-16 bg-[#F0EBE4] rounded-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && !loading && (
            <div className="text-center py-20">
              <p className="text-[#78716C] mb-4">Failed to load menu. Please try again.</p>
              <button onClick={refetch} className="warm-btn-primary text-sm px-6 py-3">
                Retry
              </button>
            </div>
          )}

          {!loading && !error && (
            <motion.div layout className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <AnimatePresence>
                {filteredItems.map((item, idx) => {
                  const inCart = cart.find(c => c.menu_id === item.menu_id);
                  const categoryName = item.categories?.[0]?.name ?? 'Ghanaian';
                  const rating = 4.3 + (item.menu_id % 5) * 0.1;

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
                      {/* Image */}
                      <div className="relative h-44 overflow-hidden rounded-t-[1.25rem]">
                        <img
                          src={item.thumb ?? getImgUrl('/assets/jollof.jpg')}
                          alt={item.menu_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                        {/* Category pill */}
                        <span className="absolute top-3 left-3 warm-pill">{categoryName}</span>
                        {/* Prep time badge */}
                        {item.prep_time_minutes && (
                          <span className="absolute bottom-3 right-3 bg-white/90 text-[#1C1917] text-[9px] font-black px-2 py-1 rounded-full flex items-center gap-1">
                            <HiClock size={10} /> {item.prep_time_minutes}min
                          </span>
                        )}
                      </div>

                      {/* Body */}
                      <div className="p-4 flex flex-col gap-2 flex-1">
                        <StarRating rating={rating} />
                        <h3 className="font-display font-bold text-[#1C1917] text-base leading-tight">
                          {item.menu_name}
                        </h3>
                        {item.menu_description && (
                          <p className="text-[11px] text-[#78716C] line-clamp-2 flex-1 leading-relaxed">
                            {item.menu_description}
                          </p>
                        )}

                        {/* Price + add-to-cart */}
                        <div className="flex items-center justify-between mt-2 pt-3 border-t border-[#F5EFE8]">
                          <span className="warm-price">GH₵{Number(item.menu_price).toFixed(2)}</span>
                          {inCart ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => updateQty(item.menu_id, -1)}
                                className="w-7 h-7 rounded-full border border-[#E8E0D8] flex items-center justify-center text-[#1C1917] hover:bg-[#F5EFE8] transition"
                              >
                                <HiMinus size={12} />
                              </button>
                              <span className="text-sm font-bold text-[#1C1917] min-w-[1.25rem] text-center">
                                {inCart.quantity}
                              </span>
                              <button
                                onClick={() => addToCart(item)}
                                className="w-7 h-7 rounded-full bg-[#1B5E20] text-white flex items-center justify-center hover:bg-[#2D6A4F] transition"
                              >
                                <HiPlus size={12} />
                              </button>
                            </div>
                          ) : (
                            <motion.button
                              onClick={() => addToCart(item)}
                              whileTap={{ scale: 0.97 }}
                              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                              className="flex items-center gap-1.5 bg-[#1B5E20] text-white text-[11px] font-bold px-4 py-2 rounded-full hover:bg-[#2D6A4F] transition-all"
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
                  <p className="text-4xl mb-4">🍽</p>
                  <p className="font-bold text-lg text-[#1C1917]">No dishes found</p>
                  <p className="text-sm mt-1">Try a different category or search term.</p>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </section>

      {/* ── Mobile cart bar (above bottom nav, only when cart has items) ─── */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div
            className="sm:hidden fixed left-0 right-0 z-[60] px-4 py-2"
            style={{ bottom: 'calc(var(--bottom-nav-height) + 0.5rem)' }}
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            <button
              onClick={() => setIsCartOpen(true)}
              className="w-full bg-[#1B5E20] text-white rounded-2xl px-5 py-4 flex items-center justify-between shadow-xl active:scale-[0.98] transition-transform"
              aria-label={`View cart: ${totalQty} items, total GH₵${total.toFixed(2)}`}
            >
              <span className="flex items-center gap-2 font-bold text-sm">
                <HiOutlineShoppingBag size={20} />
                {totalQty} item{totalQty !== 1 ? 's' : ''}
              </span>
              <span className="font-display text-xl font-black">GH₵{total.toFixed(2)}</span>
              <span className="text-sm font-bold flex items-center gap-1 opacity-90">
                Review <HiArrowRight size={14} />
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Cart drawer ──────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/30 z-[70] backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-[80] shadow-2xl flex flex-col"
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-[#E8E0D8]">
                <h2 className="font-display text-2xl font-bold text-[#1C1917]">
                  Your Order
                  {totalQty > 0 && (
                    <span className="ml-2 text-sm font-body font-normal text-[#78716C]">({totalQty} items)</span>
                  )}
                </h2>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-2 rounded-full hover:bg-[#F5EFE8] text-[#78716C] transition-colors"
                >
                  <HiXMark size={22} />
                </button>
              </div>

              {/* Items */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-[#78716C] py-20">
                    <HiOutlineShoppingBag size={48} className="mb-4 text-[#D6D3D1]" />
                    <p className="font-bold text-[#1C1917]">Your cart is empty</p>
                    <p className="text-sm mt-1">Add items from the menu to get started.</p>
                    <button
                      onClick={() => setIsCartOpen(false)}
                      className="mt-6 warm-btn-outline text-sm px-6 py-2.5"
                    >
                      Browse Menu <HiArrowRight size={14} />
                    </button>
                  </div>
                ) : (
                  cart.map(cartItem => (
                    <div
                      key={cartItem.menu_id}
                      className="flex items-center gap-4 p-3 rounded-2xl border border-[#E8E0D8] bg-[#FFFBF7]"
                    >
                      <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-[#F5EFE8]">
                        <img
                          src={cartItem.thumb ?? getImgUrl('/assets/jollof.jpg')}
                          className="w-full h-full object-cover"
                          alt={cartItem.menu_name}
                        />
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
                          <button
                            onClick={() => updateQty(cartItem.menu_id, -1)}
                            className="w-7 h-7 rounded-full border border-[#E8E0D8] flex items-center justify-center hover:bg-[#F5EFE8] transition"
                          >
                            <HiMinus size={12} />
                          </button>
                          <span className="text-sm font-bold w-5 text-center">{cartItem.quantity}</span>
                          <button
                            onClick={() => updateQty(cartItem.menu_id, 1)}
                            className="w-7 h-7 rounded-full bg-[#1B5E20] text-white flex items-center justify-center hover:bg-[#2D6A4F] transition"
                          >
                            <HiPlus size={12} />
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(cartItem.menu_id)}
                          className="text-[#EF4444] hover:text-[#DC2626] transition"
                        >
                          <HiTrash size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
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
                    onClick={sendWhatsApp}
                    className="w-full bg-[#25D366] hover:bg-[#1DAA55] text-white font-bold py-4 rounded-full flex items-center justify-center gap-2 transition-all"
                  >
                    <BsWhatsapp size={20} /> Order via WhatsApp
                  </button>
                  <p className="text-center text-[10px] text-[#A8A29E]">
                    You'll be redirected to WhatsApp to confirm your order with our team.
                  </p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
}
