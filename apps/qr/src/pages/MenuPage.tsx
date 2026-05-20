import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useTransform } from 'motion/react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCart }    from '../contexts/CartContext';
import { useSession } from '../contexts/SessionContext';
import { haptic }     from '../utils/haptics';
import { catIcon, extractCategoriesFromRaw, getGreeting, normaliseItem } from '../utils/menu';
import type { QRCategory, QRMenuItem } from '../types';
import type { TIMenuItem } from '../types';

// ── MenuPage ──────────────────────────────────────────────────────────────
export default function MenuPage() {
  const { stableToken }        = useParams<{ stableToken: string }>();
  const navigate               = useNavigate();
  const { session, isExpired } = useSession();
  const { cart, totalQty, total, addToCart, updateQty, removeFromCart } = useCart();

  // Menu data
  const [items, setItems]           = useState<QRMenuItem[]>([]);
  const [categories, setCategories] = useState<QRCategory[]>([]);
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState('');

  // UI
  const [search, setSearch]                       = useState('');
  const [activeCategory, setActiveCategory]       = useState<string>('all');
  const [showTranslate, setShowTranslate]         = useState(false);
  const [showCart, setShowCart]                   = useState(false);
  const [showDetail, setShowDetail]               = useState(false);
  const [selectedItem, setSelectedItem]           = useState<QRMenuItem | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const catStripRef    = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Guard — redirect back to scan if no valid session
  useEffect(() => {
    if (!session || isExpired()) {
      navigate(`/table/${stableToken}`, { replace: true });
    }
  }, [session, stableToken]); // eslint-disable-line

  // Fetch menu
  useEffect(() => {
    if (!session?.location_id) return;

    fetch(`/api/cd/menus?location_id=${session.location_id}&pageLimit=200&enabled=true`, {
      headers: { 'Accept': 'application/json' },
    })
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
      .then(data => {
        const raw = (data.data ?? []) as Record<string, unknown>[];
        setItems(raw.map(normaliseItem));
        setCategories(extractCategoriesFromRaw(raw));
      })
      .catch(() => setFetchError('Menu unavailable. Please try again.'))
      .finally(() => setLoading(false));
  }, [session?.location_id]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const { sub } = useMemo(getGreeting, []);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length > 1) {
      return items.filter(i =>
        i.menu_name.toLowerCase().includes(q) ||
        i.menu_description.toLowerCase().includes(q)
      );
    }
    if (activeCategory && activeCategory !== 'all') {
      return items.filter(i => String(i.category_id) === activeCategory);
    }
    return items;
  }, [items, search, activeCategory]);

  const selectedImages = useMemo(() => {
    if (!selectedItem) return [];
    return selectedItem.images?.length
      ? selectedItem.images
      : selectedItem.thumb ? [selectedItem.thumb] : [];
  }, [selectedItem]);

  // ── Cart helpers ─────────────────────────────────────────────────────────
  const cartQtyFor = useCallback((id: number) =>
    cart.find(i => i.menu_id === id)?.quantity ?? 0,
  [cart]);

  const isInCart = useCallback((id: number) =>
    cart.some(i => i.menu_id === id),
  [cart]);

  const handleDecrement = useCallback((id: number) => {
    haptic(10);
    if (cartQtyFor(id) <= 1) {
      removeFromCart(id);
    } else {
      updateQty(id, -1);
    }
  }, [cartQtyFor, removeFromCart, updateQty]);

  // ── Detail sheet ─────────────────────────────────────────────────────────
  const openDetail = useCallback((item: QRMenuItem) => {
    setSelectedItem(item);
    setCurrentImageIndex(0);
    setShowDetail(true);
    haptic(10);
  }, []);

  const closeDetail = useCallback(() => {
    setShowDetail(false);
    setTimeout(() => setSelectedItem(null), 350);
  }, []);

  const prevImage = () => setCurrentImageIndex(i =>
    (i - 1 + selectedImages.length) % selectedImages.length
  );
  const nextImage = () => setCurrentImageIndex(i =>
    (i + 1) % selectedImages.length
  );

  // ── Category selection ───────────────────────────────────────────────────
  const selectCategory = useCallback((id: string) => {
    setActiveCategory(id);
    setSearch('');
    haptic(10);
    requestAnimationFrame(() => {
      const el = document.getElementById(`cat-${id}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    });
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen overflow-x-hidden" style={{ backgroundColor: 'var(--cd-bg)', color: 'var(--cd-text)' }}>

      {/* ── 1. FIXED HEADER ─────────────────────────────────────────── */}
      <header
        className="fixed top-0 inset-x-0 z-30 flex flex-col justify-center px-5 h-[72px]"
        style={{ backgroundColor: 'var(--cd-bg)', borderBottom: '1px solid var(--cd-border)' }}
      >
        <div className="flex items-center justify-between">

          <div className="flex flex-col leading-tight">
            <span className="text-xl font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--cd-text)' }}>
              Cookers Delight
            </span>
            <span className="text-[11px]" style={{ color: 'var(--cd-muted)' }}>{sub}</span>
          </div>

          <div className="flex items-center gap-3">

            {/* Globe — translate toggle */}
            <button
              onClick={() => setShowTranslate(v => !v)}
              className="flex items-center justify-center w-9 h-9 rounded-full transition-colors"
              style={showTranslate
                ? { backgroundColor: 'var(--cd-amber)', color: '#0D1B0D' }
                : { backgroundColor: 'var(--cd-surface)', color: 'var(--cd-muted)' }}
              aria-label="Translate page"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z"/>
              </svg>
            </button>

            {/* Cart icon with badge */}
            <button
              onClick={() => { haptic(10); setShowCart(true); }}
              className="relative flex items-center justify-center w-9 h-9 rounded-full"
              style={{ backgroundColor: 'var(--cd-surface)' }}
              aria-label="View your order"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                   style={{ color: 'var(--cd-muted)' }}>
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
              <AnimatePresence>
                {totalQty > 0 && (
                  <motion.span
                    initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{ backgroundColor: 'var(--cd-amber)', color: '#0D1B0D' }}
                  >
                    {totalQty}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            {/* Table number */}
            <div className="flex flex-col items-center leading-none">
              <span className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--cd-muted)' }}>Table</span>
              <span className="font-bold text-2xl" style={{ color: 'var(--cd-amber)' }}>
                {session?.table_number ?? '—'}
              </span>
            </div>

          </div>
        </div>
      </header>

      {/* ── 2. TRANSLATE PANEL ──────────────────────────────────────── */}
      <AnimatePresence>
        {showTranslate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="fixed inset-x-0 px-4 py-2 overflow-hidden"
            style={{ top: '72px', zIndex: 29, backgroundColor: 'var(--cd-surface)', borderBottom: '1px solid var(--cd-border)' }}
          >
            <p className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: 'var(--cd-muted)' }}>
              Translate this page
            </p>
            <div id="google_translate_element" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 3. HEADER SPACER ────────────────────────────────────────── */}
      <div className="h-[72px]" />

      {/* ── 4. STICKY CATEGORY STRIP + SEARCH ───────────────────────── */}
      <div
        className="sticky z-20 pt-3 pb-3"
        style={{
          top: showTranslate ? '116px' : '72px',
          backgroundColor: 'var(--cd-bg)',
          borderBottom: '1px solid var(--cd-border)',
          transition: 'top 0.2s',
        }}
      >
        <div className="relative px-1">
          <div
            ref={catStripRef}
            className="flex gap-2 overflow-x-auto px-3"
            style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' } as React.CSSProperties}
          >
            {categories.map(cat => (
              <button
                key={cat.id}
                id={`cat-${cat.id}`}
                onClick={() => selectCategory(cat.id)}
                className="flex-shrink-0 flex items-center justify-center transition-all rounded-full px-3 py-1.5 text-sm font-semibold"
                style={
                  activeCategory === cat.id
                    ? { backgroundColor: 'var(--cd-amber)', color: '#0D1B0D', minWidth: '80px' }
                    : { backgroundColor: 'var(--cd-surface)', color: 'var(--cd-muted)', minWidth: '36px', minHeight: '36px' }
                }
              >
                {activeCategory === cat.id ? cat.name : catIcon(cat.name)}
              </button>
            ))}
          </div>
        </div>

        <div className="relative px-4 mt-3">
          <svg
            className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: 'var(--cd-muted)' }}
            fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            ref={searchInputRef}
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="What are you craving?"
            autoComplete="off"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{
              backgroundColor: 'var(--cd-surface)',
              color: 'var(--cd-text)',
              border: '1px solid var(--cd-border)',
            }}
          />
        </div>
      </div>

      {/* ── 5. MAIN CONTENT ─────────────────────────────────────────── */}
      <main className="px-4 pt-3 pb-28 space-y-2.5">
        {loading ? (
          <LoadingState />
        ) : fetchError ? (
          <ErrorState message={fetchError} />
        ) : filteredItems.length === 0 ? (
          <EmptyState hasSearch={search.length > 1} />
        ) : (
          filteredItems.map(item => (
            <ItemCard
              key={item.menu_id}
              item={item}
              qty={cartQtyFor(item.menu_id)}
              inCart={isInCart(item.menu_id)}
              onOpenDetail={() => openDetail(item)}
              onAdd={() => { haptic(10); addToCart(item as unknown as TIMenuItem); }}
              onIncrement={() => { haptic(10); updateQty(item.menu_id, 1); }}
              onDecrement={() => handleDecrement(item.menu_id)}
            />
          ))
        )}
      </main>

      {/* ── 6. FIXED CART BAR ───────────────────────────────────────── */}
      <div
        className="fixed bottom-0 inset-x-0 z-20 px-4 pb-[env(safe-area-inset-bottom)]"
        style={{ backgroundColor: 'var(--cd-bg)', borderTop: '1px solid var(--cd-border)' }}
      >
        <div className="py-3">
          {totalQty === 0 ? (
            <div className="text-center py-2 text-sm" style={{ color: 'var(--cd-muted)' }}>
              Tap anything to start your order
            </div>
          ) : (
            <button
              onClick={() => { haptic(10); setShowCart(true); }}
              className="w-full py-3.5 rounded-2xl font-semibold text-sm transition-transform active:scale-[0.98]"
              style={{ backgroundColor: 'var(--cd-amber)', color: '#0D1B0D' }}
            >
              {totalQty} {totalQty === 1 ? 'item' : 'items'} · GH₵ {total.toFixed(2)} — Review order
            </button>
          )}
        </div>
      </div>

      {/* ── 7. ITEM DETAIL BOTTOM SHEET ─────────────────────────────── */}
      <AnimatePresence>
        {showDetail && selectedItem && (
          <DetailSheet
            item={selectedItem}
            images={selectedImages}
            currentIndex={currentImageIndex}
            qty={cartQtyFor(selectedItem.menu_id)}
            inCart={isInCart(selectedItem.menu_id)}
            onClose={closeDetail}
            onPrev={prevImage}
            onNext={nextImage}
            onAdd={() => { haptic(10); addToCart(selectedItem as unknown as TIMenuItem); }}
            onIncrement={() => { haptic(10); updateQty(selectedItem.menu_id, 1); }}
            onDecrement={() => handleDecrement(selectedItem.menu_id)}
          />
        )}
      </AnimatePresence>

      {/* ── 8. CART BOTTOM SHEET ────────────────────────────────────── */}
      <AnimatePresence>
        {showCart && (
          <CartSheet
            cart={cart}
            total={total}
            onClose={() => setShowCart(false)}
            onIncrement={(id) => { haptic(10); updateQty(id, 1); }}
            onDecrement={(id) => handleDecrement(id)}
            onCheckout={() => {
              setShowCart(false);
              navigate(`/table/${stableToken}/checkout`);
            }}
          />
        )}
      </AnimatePresence>

    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center pt-20 gap-3">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        className="w-8 h-8 rounded-full border-2 border-t-transparent"
        style={{ borderColor: 'var(--cd-amber)', borderTopColor: 'transparent' }}
      />
      <p className="text-sm" style={{ color: 'var(--cd-muted)' }}>Loading menu…</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center pt-20 gap-2 text-center px-6">
      <span className="text-4xl">⚠️</span>
      <p className="text-sm" style={{ color: 'var(--cd-muted)' }}>{message}</p>
    </div>
  );
}

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center pt-20 gap-2 text-center px-6">
      <span className="text-4xl">🍽️</span>
      <p className="text-sm" style={{ color: 'var(--cd-muted)' }}>
        {hasSearch ? 'Nothing matched your search.' : 'No items in this category.'}
      </p>
    </div>
  );
}

// ── ItemCard ────────────────────────────────────────────────────────────────
interface ItemCardProps {
  item:         QRMenuItem;
  qty:          number;
  inCart:       boolean;
  onOpenDetail: () => void;
  onAdd:        () => void;
  onIncrement:  () => void;
  onDecrement:  () => void;
}

function ItemCard({ item, qty, inCart, onOpenDetail, onAdd, onIncrement, onDecrement }: ItemCardProps) {
  return (
    <div
      className="flex items-center gap-3 p-3.5 rounded-2xl active:scale-[0.98] transition-transform"
      style={{ backgroundColor: 'var(--cd-surface)' }}
    >
      {/* Thumbnail */}
      <div
        onClick={onOpenDetail}
        className="relative flex-shrink-0 w-[72px] h-[72px] rounded-xl overflow-hidden cursor-pointer"
        style={{ backgroundColor: 'var(--cd-surface-2)' }}
      >
        {item.thumb
          ? <img src={item.thumb} alt={item.menu_name} className="w-full h-full object-cover" loading="lazy" />
          : <div className="w-full h-full flex items-center justify-center text-3xl">🍽️</div>
        }
      </div>

      {/* Info */}
      <div onClick={onOpenDetail} className="flex-1 min-w-0 cursor-pointer">
        <p className="font-semibold text-sm leading-snug" style={{ color: 'var(--cd-text)' }}>
          {item.menu_name}
        </p>
        <p className="text-xs mt-0.5 leading-relaxed line-clamp-2" style={{ color: 'var(--cd-muted)' }}>
          {item.menu_description}
        </p>
        <div className="flex items-center gap-3 mt-2">
          <span className="font-bold text-sm" style={{ color: 'var(--cd-amber)' }}>
            GH₵ {item.menu_price.toFixed(2)}
          </span>
          <span
            className="flex items-center gap-1 text-xs"
            style={{ color: item.prep_time_minutes <= 10 ? 'var(--cd-amber)' : 'var(--cd-muted)' }}
          >
            {item.prep_time_minutes <= 10 ? '⚡' : '⏱'}
            {item.prep_time_minutes <= 10 ? 'Fast' : `Ready in ${item.prep_time_minutes} min`}
          </span>
        </div>
      </div>

      {/* ADD / STEPPER */}
      <div className="flex-shrink-0 flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
        {!inCart ? (
          <button
            onClick={onAdd}
            className="w-9 h-9 rounded-full flex items-center justify-center text-xl font-bold transition-transform active:scale-90"
            style={{ backgroundColor: 'var(--cd-amber)', color: '#0D1B0D' }}
            aria-label="Add to order"
          >+</button>
        ) : (
          <div className="flex flex-col items-center gap-0.5">
            <button
              onClick={onIncrement}
              className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold transition-transform active:scale-90"
              style={{ backgroundColor: 'var(--cd-amber)', color: '#0D1B0D' }}
            >+</button>
            <span className="text-sm font-bold leading-none" style={{ color: 'var(--cd-text)' }}>
              {qty}
            </span>
            <button
              onClick={onDecrement}
              className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold transition-transform active:scale-90"
              style={{ backgroundColor: 'var(--cd-surface-2)', color: 'var(--cd-text)' }}
            >−</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── DetailSheet ─────────────────────────────────────────────────────────────
interface DetailSheetProps {
  item:         QRMenuItem;
  images:       string[];
  currentIndex: number;
  qty:          number;
  inCart:       boolean;
  onClose:      () => void;
  onPrev:       () => void;
  onNext:       () => void;
  onAdd:        () => void;
  onIncrement:  () => void;
  onDecrement:  () => void;
}

function DetailSheet({
  item, images, currentIndex, qty, inCart,
  onClose, onPrev, onNext, onAdd, onIncrement, onDecrement,
}: DetailSheetProps) {
  const y       = useMotionValue(0);
  const opacity = useTransform(y, [0, 300], [1, 0]);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: '#000', opacity }}
        initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-3xl overflow-hidden"
        style={{ backgroundColor: 'var(--cd-bg)', maxHeight: '92vh', y }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        drag="y"
        dragConstraints={{ top: 0 }}
        dragElastic={0.2}
        onDragEnd={(_, info) => { if (info.offset.y > 150) onClose(); }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-8 h-1 rounded-full" style={{ backgroundColor: 'var(--cd-border)' }} />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'var(--cd-surface)', color: 'var(--cd-muted)' }}
          aria-label="Close"
        >×</button>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1">

          {/* Image carousel */}
          {images.length > 0 && (
            <div className="relative w-full aspect-video bg-black flex-shrink-0">
              <img
                src={images[currentIndex]}
                alt={item.menu_name}
                className="w-full h-full object-cover"
              />
              {images.length > 1 && (
                <>
                  <button
                    onClick={onPrev}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff' }}
                  >‹</button>
                  <button
                    onClick={onNext}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff' }}
                  >›</button>
                  <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1">
                    {images.map((_, i) => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: i === currentIndex ? '#fff' : 'rgba(255,255,255,0.4)' }}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="px-5 pt-4 pb-4">
            {/* Name + price */}
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-semibold leading-snug flex-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--cd-text)' }}>
                {item.menu_name}
              </h2>
              <span className="font-bold text-lg flex-shrink-0" style={{ color: 'var(--cd-amber)' }}>
                GH₵ {item.menu_price.toFixed(2)}
              </span>
            </div>

            {/* Meta */}
            <div className="flex items-center gap-3 mt-2">
              <span
                className="flex items-center gap-1 text-xs"
                style={{ color: item.prep_time_minutes <= 10 ? 'var(--cd-amber)' : 'var(--cd-muted)' }}
              >
                {item.prep_time_minutes <= 10 ? '⚡' : '⏱'}
                {item.prep_time_minutes <= 10 ? 'Fast' : `Ready in ${item.prep_time_minutes} min`}
              </span>
              {item.calories != null && (
                <span className="text-xs" style={{ color: 'var(--cd-muted)' }}>
                  {item.calories} kcal
                </span>
              )}
            </div>

            {/* Description */}
            {item.menu_description && (
              <p className="text-sm mt-3 leading-relaxed" style={{ color: 'var(--cd-muted)' }}>
                {item.menu_description}
              </p>
            )}

            {/* Ingredients */}
            {item.ingredients && item.ingredients.length > 0 && (
              <div className="mt-4">
                <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--cd-muted)' }}>Ingredients</p>
                <div className="flex flex-wrap gap-1.5">
                  {item.ingredients.map((ing, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-full text-xs"
                      style={{ backgroundColor: 'var(--cd-surface)', color: 'var(--cd-text)' }}
                    >
                      {ing}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 flex-shrink-0"
             style={{ borderTop: '1px solid var(--cd-border)' }}>
          {!inCart ? (
            <button
              onClick={onAdd}
              className="w-full py-3.5 rounded-2xl font-semibold text-sm transition-transform active:scale-[0.98]"
              style={{ backgroundColor: 'var(--cd-amber)', color: '#0D1B0D' }}
            >
              Add to order
            </button>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-semibold" style={{ color: 'var(--cd-text)' }}>In your order</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={onDecrement}
                  className="w-9 h-9 rounded-full flex items-center justify-center font-bold transition-transform active:scale-90"
                  style={{ backgroundColor: 'var(--cd-surface-2)', color: 'var(--cd-text)' }}
                >−</button>
                <span className="text-lg font-bold w-6 text-center" style={{ color: 'var(--cd-text)' }}>{qty}</span>
                <button
                  onClick={onIncrement}
                  className="w-9 h-9 rounded-full flex items-center justify-center font-bold transition-transform active:scale-90"
                  style={{ backgroundColor: 'var(--cd-amber)', color: '#0D1B0D' }}
                >+</button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}

// ── CartSheet ───────────────────────────────────────────────────────────────
import type { CartItem } from '../contexts/CartContext';

interface CartSheetProps {
  cart:        CartItem[];
  total:       number;
  onClose:     () => void;
  onIncrement: (id: number) => void;
  onDecrement: (id: number) => void;
  onCheckout:  () => void;
}

function CartSheet({ cart, total, onClose, onIncrement, onDecrement, onCheckout }: CartSheetProps) {
  const y       = useMotionValue(0);
  const opacity = useTransform(y, [0, 300], [1, 0]);

  return (
    <>
      <motion.div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: '#000', opacity }}
        initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.div
        className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-3xl"
        style={{ backgroundColor: 'var(--cd-bg)', maxHeight: '85vh', y }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        drag="y"
        dragConstraints={{ top: 0 }}
        dragElastic={0.2}
        onDragEnd={(_, info) => { if (info.offset.y > 150) onClose(); }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-8 h-1 rounded-full" style={{ backgroundColor: 'var(--cd-border)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0"
             style={{ borderBottom: '1px solid var(--cd-border)' }}>
          <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--cd-text)' }}>
            Your Order
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--cd-surface)', color: 'var(--cd-muted)' }}
            aria-label="Close cart"
          >×</button>
        </div>

        {/* Items */}
        <div className="overflow-y-auto flex-1 px-5 py-3 space-y-3">
          {cart.map(item => (
            <div key={item.menu_id} className="flex items-center gap-3">
              {/* Thumbnail */}
              <div
                className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
                style={{ backgroundColor: 'var(--cd-surface-2)' }}
              >
                {item.thumb
                  ? <img src={item.thumb} alt={item.menu_name} className="w-full h-full object-cover" />
                  : <span className="text-xl">🍽️</span>
                }
              </div>

              {/* Name + price */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--cd-text)' }}>
                  {item.menu_name}
                </p>
                <p className="text-xs" style={{ color: 'var(--cd-amber)' }}>
                  GH₵ {(item.menu_price * item.quantity).toFixed(2)}
                </p>
              </div>

              {/* Stepper */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => onDecrement(item.menu_id)}
                  className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm transition-transform active:scale-90"
                  style={{ backgroundColor: 'var(--cd-surface-2)', color: 'var(--cd-text)' }}
                >−</button>
                <span className="text-sm font-bold w-5 text-center" style={{ color: 'var(--cd-text)' }}>
                  {item.quantity}
                </span>
                <button
                  onClick={() => onIncrement(item.menu_id)}
                  className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm transition-transform active:scale-90"
                  style={{ backgroundColor: 'var(--cd-amber)', color: '#0D1B0D' }}
                >+</button>
              </div>
            </div>
          ))}
        </div>

        {/* Total + CTA */}
        <div className="px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 flex-shrink-0"
             style={{ borderTop: '1px solid var(--cd-border)' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm" style={{ color: 'var(--cd-muted)' }}>Total</span>
            <span className="font-bold text-lg" style={{ color: 'var(--cd-text)' }}>
              GH₵ {total.toFixed(2)}
            </span>
          </div>
          <button
            onClick={onCheckout}
            className="w-full py-3.5 rounded-2xl font-semibold text-sm transition-transform active:scale-[0.98]"
            style={{ backgroundColor: 'var(--cd-amber)', color: '#0D1B0D' }}
          >
            Place Order
          </button>
        </div>
      </motion.div>
    </>
  );
}
