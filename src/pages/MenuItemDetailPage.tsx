import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  HiArrowLeft, HiArrowLongRight, HiClock, HiHeart, HiChevronDown, HiPlus, HiMinus,
  HiShare,
} from 'react-icons/hi2';
import { useApi } from '../hooks/useApi';
import { menuApi, prepTimeApi } from '../lib/api';
import { useCart } from '../contexts/CartContext';
import { usePageContext } from './PublicLayout';
import { getImgUrl } from '../utils/image';
import { haptic } from '../utils/haptics';
import SEOHead from '../components/SEOHead';
import type { TIMenuItem } from '../types';

function readCachedItem(menuId: number): TIMenuItem | undefined {
  const cache = (window as unknown as { __cdMenuCache?: TIMenuItem[] }).__cdMenuCache;
  return cache?.find(i => i.menu_id === menuId);
}

export default function MenuItemDetailPage() {
  const { menuId } = useParams<{ menuId: string }>();
  const id = Number(menuId);
  const navigate = useNavigate();
  const { addToast } = usePageContext();
  const { addToCart, hasItem, updateQty } = useCart();

  // Try cache first (avoids a roundtrip when user clicks from menu list)
  const [item, setItem] = useState<TIMenuItem | undefined>(() => readCachedItem(id));
  const { data: items } = useApi<TIMenuItem[]>(() => menuApi.getItems());
  const { data: prepTimes } = useApi<Record<string, number>>(() => prepTimeApi.getAll());

  useEffect(() => {
    if (item || !items) return;
    const found = items.find(i => i.menu_id === id);
    if (found) {
      const prep = prepTimes?.[String(id)] ?? found.prep_time_minutes ?? 15;
      setItem({ ...found, prep_time_minutes: prep });
    }
  }, [item, items, prepTimes, id]);

  const [qty, setQty] = useState(1);
  const [ingredientsOpen, setIngredientsOpen] = useState(true);
  const [favorited, setFavorited] = useState(false);

  const inCart = useMemo(() => (item ? hasItem(item.menu_id) : undefined), [item, hasItem]);

  if (!item) {
    return (
      <div className="min-h-[100dvh] bg-[#FFFBF7] flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-[#78716C] mb-4">Loading dish…</p>
          <div className="w-12 h-12 mx-auto rounded-full border-4 border-[#E8E0D8] border-t-[#1B5E20] animate-spin" />
        </div>
      </div>
    );
  }

  const price = Number(item.menu_price);
  const lineTotal = price * qty;

  const handleAdd = () => {
    addToCart(item, qty);
    haptic(12);
    addToast(`Added ${qty} × ${item.menu_name}`);
    navigate(-1);
  };

  return (
    <>
      <SEOHead
        title={`${item.menu_name} | Cookers Delight`}
        description={item.menu_description?.slice(0, 160) ?? 'Authentic West African food, made fresh in Accra.'}
        canonical={`https://cookers-delight.vercel.app/menu/${item.menu_id}`}
      />

      <div className="min-h-[100dvh] bg-[#FFFBF7] pb-32">
        {/* ── Hero image with floating back/share/heart ─────────────────── */}
        <div className="relative bg-[#F5EFE8]">
          <div className="aspect-[5/4] sm:aspect-[16/9] w-full overflow-hidden">
            <img
              src={item.thumb ?? getImgUrl('/assets/jollof.jpg')}
              alt={item.menu_name}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Top action row */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
            <Link
              to="/menu"
              onClick={() => haptic(6)}
              className="w-11 h-11 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center text-[#1C1917] shadow-md active:scale-95 transition"
              aria-label="Back to menu"
            >
              <HiArrowLeft size={20} />
            </Link>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: item.menu_name, url: window.location.href }).catch(() => {});
                  }
                }}
                className="w-11 h-11 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center text-[#1C1917] shadow-md active:scale-95 transition"
                aria-label="Share"
              >
                <HiShare size={18} />
              </button>
              <button
                onClick={() => { setFavorited(v => !v); haptic(8); }}
                className="w-11 h-11 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center shadow-md active:scale-95 transition"
                aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
              >
                <HiHeart size={18} className={favorited ? 'text-[#EF4444]' : 'text-[#78716C]'} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Detail card (overlaps hero) ──────────────────────────────── */}
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          className="relative -mt-6 mx-4 sm:mx-8 app-card p-5 sm:p-8"
        >
          <span className="warm-section-label">
            {item.categories?.[0]?.name ?? 'Featured Dish'}
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#1C1917] mt-1 leading-tight">
            {item.menu_name}
          </h1>

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="warm-price">GH₵{price.toFixed(2)}</span>
            <span className="app-status-dot app-status-dot--available">
              <HiClock size={11} className="-ml-1" /> ~{item.prep_time_minutes}min
            </span>
          </div>

          <p className="text-sm text-[#78716C] leading-relaxed mt-4">
            {item.menu_description ||
              'A house favourite, made fresh daily with our signature blend of West African spices. Comes with sides of choice.'}
          </p>
        </motion.div>

        {/* ── Ingredients / options accordion ──────────────────────────── */}
        <div className="mx-4 sm:mx-8 mt-4 app-card-flat overflow-hidden">
          <button
            onClick={() => setIngredientsOpen(v => !v)}
            className="w-full flex items-center justify-between p-5 text-left"
            aria-expanded={ingredientsOpen}
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#78716C]">Detail</p>
              <p className="font-display text-xl font-bold text-[#1C1917] mt-0.5">Ingredients & Options</p>
            </div>
            <motion.span
              animate={{ rotate: ingredientsOpen ? 180 : 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="w-9 h-9 rounded-full bg-[#F5EFE8] flex items-center justify-center text-[#1C1917]"
            >
              <HiChevronDown size={16} />
            </motion.span>
          </button>
          <AnimatePresence initial={false}>
            {ingredientsOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-5 space-y-3">
                  {item.menu_options && item.menu_options.length > 0 ? (
                    item.menu_options.map(opt => (
                      <div key={opt.menu_option_id} className="flex flex-wrap gap-1.5">
                        <span className="text-xs font-bold text-[#1C1917] w-full">{opt.option_name}</span>
                        {opt.option_values.map(v => (
                          <span key={v.menu_option_value_id} className="warm-pill">{v.name}</span>
                        ))}
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {['Long-grain rice', 'Tomato base', 'Bell peppers', 'Scotch bonnet', 'Onions', 'House spice blend'].map(t => (
                        <span key={t} className="warm-pill">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Quantity stepper ─────────────────────────────────────────── */}
        <div className="mx-4 sm:mx-8 mt-4 app-card-flat p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#78716C]">Quantity</p>
            <p className="font-display text-xl font-bold text-[#1C1917] mt-0.5">How many?</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQty(q => Math.max(1, q - 1))}
              className="w-10 h-10 rounded-full bg-[#F5EFE8] flex items-center justify-center text-[#1C1917]"
              aria-label="Decrease quantity"
            >
              <HiMinus size={14} />
            </button>
            <span className="font-display text-2xl font-black text-[#1C1917] w-8 text-center">{qty}</span>
            <button
              onClick={() => setQty(q => q + 1)}
              className="w-10 h-10 rounded-full bg-[#1B5E20] text-white flex items-center justify-center"
              aria-label="Increase quantity"
            >
              <HiPlus size={14} />
            </button>
          </div>
        </div>

        {/* ── In-cart info card ────────────────────────────────────────── */}
        {inCart && (
          <div className="mx-4 sm:mx-8 mt-4 app-tile-dark p-5">
            <span className="app-label-light">Already in cart</span>
            <div className="flex items-center justify-between mt-1">
              <p className="text-white text-base font-bold">
                {inCart.quantity} × {item.menu_name}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQty(item.menu_id, -1)}
                  className="w-9 h-9 rounded-full bg-white/15 text-white flex items-center justify-center"
                  aria-label="Decrease quantity in cart"
                >
                  <HiMinus size={14} />
                </button>
                <span className="font-display text-xl font-black text-white w-6 text-center">{inCart.quantity}</span>
                <button
                  onClick={() => updateQty(item.menu_id, 1)}
                  className="w-9 h-9 rounded-full bg-white text-[#0F3F1F] flex items-center justify-center"
                  aria-label="Increase quantity in cart"
                >
                  <HiPlus size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Sticky add-to-cart bar ───────────────────────────────────── */}
        <div className="app-cta-sticky">
          <motion.button
            onClick={handleAdd}
            whileTap={{ scale: 0.98 }}
            className="app-cta-primary"
            aria-label={`Add ${qty} ${item.menu_name} to cart for GH₵${lineTotal.toFixed(2)}`}
          >
            <span className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center text-[12px] font-black">
                {qty}
              </span>
              <span className="text-sm">Add to cart</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="font-display text-lg font-black">GH₵{lineTotal.toFixed(2)}</span>
              <span className="app-cta-chip"><HiArrowLongRight size={16} /></span>
            </span>
          </motion.button>
        </div>
      </div>
    </>
  );
}
