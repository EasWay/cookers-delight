<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>{{ $locationName ?? 'Cookers Delight' }} — Order</title>
    <meta name="theme-color" content="#0D1B0D">
    @vite(['resources/css/app.css', 'resources/js/app.js'])

    {{-- Google Translate --}}
    <script>
    function googleTranslateElementInit() {
        new google.translate.TranslateElement({
            pageLanguage: 'en',
            includedLanguages: 'ar,zh-CN,fr,de,es,it,ja,ko,pt,ru,sw,ha,yo,ig,ak',
            layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
            autoDisplay: false,
        }, 'google_translate_element');
    }
    </script>
    <script src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit" defer></script>

    {{-- Menu data injected as JS globals (safe from quote/entity issues in HTML attrs) --}}
    <script>
        window.__MENU_CATEGORIES__ = @json($categories);
        window.__MENU_ITEMS__      = @json($items);
    </script>
</head>

<body
    x-data="menuApp()"
    x-cloak
    class="min-h-screen overflow-x-hidden antialiased"
    style="background:var(--cd-bg);color:var(--cd-text);font-family:var(--font-sans);">


    {{-- ═══════════════════════════════════════════════════════
         FIXED HEADER — 72px tall
         Left: Restaurant name + time-aware greeting
         Right: Translate • Cart icon • Table number
    ═══════════════════════════════════════════════════════ --}}
    <header
        class="fixed top-0 inset-x-0 z-30 flex flex-col justify-center px-5 h-[72px]"
        style="background:var(--cd-bg);border-bottom:1px solid var(--cd-border);">

        <div class="flex items-center justify-between">

            {{-- Restaurant identity --}}
            <div class="flex flex-col leading-tight">
                <span
                    class="text-xl font-semibold"
                    style="font-family:var(--font-serif);color:var(--cd-text);">
                    Cookers Delight
                </span>
                <span class="text-[11px]" style="color:var(--cd-text-muted);" x-text="greetingSub"></span>
            </div>

            {{-- Action cluster --}}
            <div class="flex items-center gap-3">

                {{-- Translate globe button --}}
                <button
                    @click="showTranslate = !showTranslate"
                    class="flex items-center justify-center w-9 h-9 rounded-full transition-colors"
                    :style="showTranslate
                        ? 'background:var(--cd-amber);color:#0D1B0D;'
                        : 'background:var(--cd-surface);color:var(--cd-text-muted);'"
                    aria-label="Translate page">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="2" y1="12" x2="22" y2="12"/>
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z"/>
                    </svg>
                </button>

                {{-- Cart icon button (always visible) --}}
                <button
                    @click="showCart = true"
                    class="relative flex items-center justify-center w-9 h-9 rounded-full transition-colors"
                    style="background:var(--cd-surface);"
                    aria-label="View your order">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                         style="color:var(--cd-text-muted);">
                        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                        <line x1="3" y1="6" x2="21" y2="6"/>
                        <path d="M16 10a4 4 0 0 1-8 0"/>
                    </svg>
                    {{-- Badge --}}
                    <span
                        x-show="cartCount > 0"
                        x-text="cartCount"
                        class="hdr-cart-badge"
                        x-transition:enter="transition scale-0 duration-200"
                        x-transition:enter-end="scale-100">
                    </span>
                </button>

                {{-- Table number --}}
                <div class="flex flex-col items-center leading-none">
                    <span class="text-[9px] uppercase tracking-widest" style="color:var(--cd-text-muted);">Table</span>
                    <span class="font-bold text-2xl" style="color:var(--cd-amber);">
                        {{ $tableNumber ?? '—' }}
                    </span>
                </div>

            </div>
        </div>
    </header>

    {{-- Google Translate widget — shown below header when translate is toggled --}}
    <div
        x-show="showTranslate"
        x-transition
        class="fixed top-[72px] inset-x-0 z-29 px-4 py-2"
        style="background:var(--cd-surface);border-bottom:1px solid var(--cd-border);">
        <p class="text-[10px] uppercase tracking-wider mb-1.5" style="color:var(--cd-text-muted);">Translate this page</p>
        <div id="google_translate_element"></div>
    </div>


    {{-- ═══════════════════════════════════════════════════════
         SPACER — keeps sticky strip below fixed header
    ═══════════════════════════════════════════════════════ --}}
    <div class="h-[72px]"></div>


    {{-- ═══════════════════════════════════════════════════════
         STICKY CATEGORY STRIP + SEARCH
         Sticks at top-[72px] so it sits directly under the header.
    ═══════════════════════════════════════════════════════ --}}
    <div
        class="sticky z-20 pt-3 pb-3 cd-strip"
        :style="showTranslate
            ? 'top:116px;background:var(--cd-bg);border-bottom:1px solid var(--cd-border);'
            : 'top:72px;background:var(--cd-bg);border-bottom:1px solid var(--cd-border);'">

        {{-- Category carousel with edge fades --}}
        <div class="cat-strip-wrapper px-1">
            <div
                id="cat-strip"
                class="flex gap-2 overflow-x-auto hide-scrollbar px-3"
                style="scroll-behavior:smooth;-webkit-overflow-scrolling:touch;">

                @foreach($categories as $cat)
                @php
                $S = 'stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"';
                $svgWrap = fn(string $paths) => '<svg viewBox="0 0 24 24" fill="none" '.$S.' class="w-5 h-5">'.$paths.'</svg>';

                $catIcon = match(strtolower($cat['name'])) {

                    // ── All ──────────────────────────────────────────────────────
                    'all', 'all items' => $svgWrap('
                        <rect x="3" y="3" width="7" height="7" rx="1.5"/>
                        <rect x="14" y="3" width="7" height="7" rx="1.5"/>
                        <rect x="3" y="14" width="7" height="7" rx="1.5"/>
                        <rect x="14" y="14" width="7" height="7" rx="1.5"/>
                    '),

                    // ── Appetizer — fork & knife ─────────────────────────────────
                    'appetizer', 'appetizers' => $svgWrap('
                        <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/>
                        <path d="M7 2v20"/>
                        <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3"/>
                        <path d="M21 15v7"/>
                    '),

                    // ── Main Course — plate ──────────────────────────────────────
                    'main course', 'main courses', 'main', 'mains' => $svgWrap('
                        <circle cx="12" cy="13" r="8"/>
                        <path d="M12 5v2"/>
                        <path d="M5.3 9.5a8 8 0 0 0-.3 3.5"/>
                        <circle cx="12" cy="13" r="3"/>
                    '),

                    // ── Seafood — fish ───────────────────────────────────────────
                    'seafood', 'seafoods' => $svgWrap('
                        <path d="M6.5 12c1-3.5 5-6 8.5-6s6.5 2.5 7 6c-.5 3.5-3.5 6-7 6s-7.5-2.5-8.5-6z"/>
                        <path d="M6.5 12C5.5 11.5 3.5 11 2 11.5"/>
                        <circle cx="16.5" cy="11" r="1.2" fill="currentColor" stroke="none"/>
                    '),

                    // ── Salad — leaf ─────────────────────────────────────────────
                    'salad', 'salads' => $svgWrap('
                        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/>
                        <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
                    '),

                    // ── Traditional — cooking pot ────────────────────────────────
                    'traditional' => $svgWrap('
                        <path d="M2 12h20"/>
                        <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6"/>
                        <path d="M4 12l1.5-6h13L20 12"/>
                        <path d="M8 12V7M12 12V7M16 12V7"/>
                        <path d="M9 4h.01M15 4h.01"/>
                    '),

                    // ── Specials — star ──────────────────────────────────────────
                    'specials', 'special' => $svgWrap('
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    '),

                    // ── Chef's Choice — chef hat ─────────────────────────────────
                    "chef's choice", "chef's picks" => $svgWrap('
                        <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6z"/>
                        <line x1="6" y1="17" x2="18" y2="17"/>
                    '),

                    // ── Drinks — wine glass ──────────────────────────────────────
                    'drinks', 'beverages' => $svgWrap('
                        <path d="M8 22h8"/>
                        <path d="M12 15v7"/>
                        <path d="M17 2H7l2.5 9.5A3 3 0 0 0 12 14a3 3 0 0 0 2.5-2.5L17 2z"/>
                        <path d="M7 10h10"/>
                    '),

                    // ── Dessert — cake ───────────────────────────────────────────
                    'dessert', 'desserts' => $svgWrap('
                        <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/>
                        <path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2 1 2 1"/>
                        <path d="M2 21h20"/>
                        <path d="M7 8v3M12 8v3M17 8v3"/>
                        <path d="M12 4a2 2 0 0 0-2 2h4a2 2 0 0 0-2-2z"/>
                    '),

                    // ── Soup — bowl with steam ───────────────────────────────────
                    'soup', 'soups' => $svgWrap('
                        <path d="M12 2c.5 1.5.5 3 0 4.5"/>
                        <path d="M8 2c.5 1.5.5 3 0 4.5"/>
                        <path d="M16 2c.5 1.5.5 3 0 4.5"/>
                        <path d="M2 14h20"/>
                        <path d="M4 14v3a8 8 0 0 0 16 0v-3"/>
                    '),

                    // ── Snacks — cookie ──────────────────────────────────────────
                    'snacks' => $svgWrap('
                        <circle cx="12" cy="12" r="10"/>
                        <circle cx="8.5" cy="9" r="1.3" fill="currentColor" stroke="none"/>
                        <circle cx="14.5" cy="8" r="1.3" fill="currentColor" stroke="none"/>
                        <circle cx="15" cy="14" r="1.3" fill="currentColor" stroke="none"/>
                        <circle cx="9" cy="14.5" r="1.3" fill="currentColor" stroke="none"/>
                    '),

                    // ── Grill — flame ────────────────────────────────────────────
                    'grill', 'grills' => $svgWrap('
                        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
                    '),

                    // ── Default — plate & cutlery ────────────────────────────────
                    default => $svgWrap('
                        <circle cx="12" cy="12" r="9"/>
                        <path d="M12 3v9"/>
                        <path d="M8.5 8.5L12 12l3.5-3.5"/>
                    '),
                };
                @endphp
                <button
                    id="cat-{{ $cat['id'] }}"
                    @click="selectCategory('{{ $cat['id'] }}')"
                    class="cat-pill"
                    :class="activeCategory === '{{ $cat['id'] }}' ? 'cat-pill-active' : 'cat-pill-inactive'"
                    aria-label="{{ $cat['name'] }}">
                    {{-- Inactive: SVG icon only --}}
                    <span x-show="activeCategory !== '{{ $cat['id'] }}'">{!! $catIcon !!}</span>
                    {{-- Active: text name only --}}
                    <span x-show="activeCategory === '{{ $cat['id'] }}'">{{ $cat['name'] }}</span>
                </button>
                @endforeach

            </div>
        </div>

        {{-- Search bar --}}
        <div class="relative px-4 mt-3">
            <svg class="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                 style="color:var(--cd-text-muted);"
                 fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
                x-model.debounce.300ms="search"
                type="search"
                autocomplete="off"
                placeholder="Search dishes…"
                class="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none"
                style="background:var(--cd-surface);color:var(--cd-text);border:1px solid var(--cd-border);">
        </div>
    </div>


    {{-- ═══════════════════════════════════════════════════════
         MAIN — ITEM CARDS
         pb-28 clears the always-visible cart bar.
    ═══════════════════════════════════════════════════════ --}}
    <main class="px-4 pt-3 pb-28 space-y-2.5">

        {{-- Empty state --}}
        <div
            x-show="filteredItems.length === 0"
            class="flex flex-col items-center justify-center py-20 space-y-3 text-center">
            <span class="text-5xl">🔍</span>
            <p class="text-sm font-medium" style="color:var(--cd-text);">Nothing found for that search</p>
            <p class="text-xs" style="color:var(--cd-text-muted);">Try another word or browse by category</p>
        </div>

        {{-- Item cards --}}
        <template x-for="item in filteredItems" :key="item.id">
            <div
                class="item-card flex items-center gap-3 p-3.5 rounded-2xl"
                style="background:var(--cd-surface);">

                {{-- Thumbnail — tapping opens detail --}}
                <div
                    @click="openDetail(item)"
                    class="relative flex-shrink-0 w-[72px] h-[72px] rounded-xl overflow-hidden cursor-pointer"
                    style="background:var(--cd-surface-2);">
                    <img
                        x-show="item.image"
                        :src="item.image"
                        :alt="item.name"
                        class="w-full h-full object-cover"
                        loading="lazy">
                    <div x-show="!item.image"
                         class="w-full h-full flex items-center justify-center text-3xl">🍽️</div>
                </div>

                {{-- Info — tapping opens detail --}}
                <div @click="openDetail(item)" class="flex-1 min-w-0 cursor-pointer">
                    <p class="font-semibold text-sm leading-snug"
                       x-text="item.name"
                       style="color:var(--cd-text);">
                    </p>
                    <p class="text-xs mt-0.5 leading-relaxed line-clamp-2"
                       x-text="item.description"
                       style="color:var(--cd-text-muted);">
                    </p>
                    <div class="flex items-center gap-3 mt-2">
                        <span class="font-bold text-sm"
                              x-text="'GHS ' + item.price.toFixed(2)"
                              style="color:var(--cd-amber);">
                        </span>
                        <span
                            class="prep-badge"
                            :style="item.prep_time_minutes <= 10 ? 'color:var(--cd-amber)' : 'color:var(--cd-text-muted)'">
                            <span x-text="item.prep_time_minutes <= 10 ? '⚡' : '⏱'"></span>
                            <span x-text="item.prep_time_minutes + ' min'"></span>
                        </span>
                    </div>
                </div>

                {{-- ADD / STEPPER — isolated from card click, never opens detail --}}
                <div class="flex-shrink-0 flex flex-col items-center justify-center" @click.stop>

                    {{-- Not in cart → amber "+" button --}}
                    <button
                        x-show="!isInCart(item.id)"
                        @click.stop="addItemDirect(item)"
                        class="w-9 h-9 rounded-full flex items-center justify-center text-xl font-bold transition-transform active:scale-90"
                        style="background:var(--cd-amber);color:#0D1B0D;"
                        aria-label="Add to order">
                        +
                    </button>

                    {{-- In cart → compact vertical stepper --}}
                    <div
                        x-show="isInCart(item.id)"
                        class="flex flex-col items-center gap-0.5">
                        <button
                            @click.stop="increment(item.id)"
                            class="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold transition-transform active:scale-90"
                            style="background:var(--cd-amber);color:#0D1B0D;"
                            aria-label="Add one more">
                            +
                        </button>
                        <span
                            class="text-sm font-bold leading-none"
                            x-text="cartQtyFor(item.id)"
                            style="color:var(--cd-text);">
                        </span>
                        <button
                            @click.stop="decrement(item.id)"
                            class="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold transition-transform active:scale-90"
                            style="background:var(--cd-surface-2);color:var(--cd-text);"
                            aria-label="Remove one">
                            −
                        </button>
                    </div>

                </div>

            </div>
        </template>
    </main>


    {{-- ═══════════════════════════════════════════════════════
         ALWAYS-VISIBLE CART BAR
         Fixed at bottom — present even when cart is empty.
         Empty: subtle prompt. Has items: amber CTA.
    ═══════════════════════════════════════════════════════ --}}
    <div class="fixed inset-x-4 z-40 cart-bar-wrap">

        {{-- Empty state --}}
        <div
            x-show="cartCount === 0"
            class="flex items-center justify-center gap-2 py-3.5 rounded-2xl cursor-pointer"
            style="background:var(--cd-surface);border:1px solid var(--cd-border);">
            <span class="text-base">🛒</span>
            <span class="text-sm" style="color:var(--cd-text-muted);">Tap a dish to start your order</span>
        </div>

        {{-- Has items --}}
        <div
            x-show="cartCount > 0"
            @click="showCart = true"
            x-transition:enter="transition ease-out duration-300"
            x-transition:enter-start="opacity-0 translate-y-2"
            x-transition:enter-end="opacity-100 translate-y-0"
            class="flex items-center justify-between px-5 py-4 rounded-2xl cursor-pointer shadow-2xl"
            style="background:var(--cd-amber);">
            <div class="flex items-center gap-3">
                <span class="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
                      style="background:rgba(0,0,0,0.18);color:#0D1B0D;"
                      x-text="cartCount">
                </span>
                <span class="font-semibold text-sm" style="color:#0D1B0D;">View Order</span>
            </div>
            <span class="font-bold" style="color:#0D1B0D;" x-text="cartTotalFormatted"></span>
        </div>
    </div>


    {{-- ═══════════════════════════════════════════════════════
         ITEM DETAIL BOTTOM SHEET
    ═══════════════════════════════════════════════════════ --}}
    <div
        x-show="showDetail && selectedItem"
        @click.self="closeDetail()"
        class="fixed inset-0 z-50 flex items-end"
        style="background:var(--cd-overlay);"
        x-transition:enter="animate-fade-in"
        x-transition:leave="transition-opacity duration-200"
        x-transition:leave-end="opacity-0">

        <div
            x-ref="detailPanel"
            @touchstart="startDrag($event, 'detailPanel', closeDetail)"
            class="sheet-panel w-full rounded-t-3xl overflow-y-auto max-h-[92vh] animate-slide-up"
            style="background:var(--cd-surface);">

            {{-- Drag handle --}}
            <div class="flex justify-center pt-3 pb-1">
                <div class="w-10 h-1 rounded-full" style="background:var(--cd-border);"></div>
            </div>

            <template x-if="selectedItem">
                <div class="px-5 safe-bottom-sheet space-y-4">

                    {{-- Image carousel --}}
                    <div class="relative w-full aspect-square rounded-2xl overflow-hidden"
                         style="background:var(--cd-surface-2);">

                        {{-- Image --}}
                        <img
                            x-show="selectedItemImages.length > 0"
                            :src="selectedItemImages[currentImageIndex]"
                            :alt="selectedItem.name"
                            class="w-full h-full object-cover">
                        <div
                            x-show="selectedItemImages.length === 0"
                            class="w-full h-full flex items-center justify-center text-8xl">🍽️</div>

                        {{-- Prev arrow --}}
                        <button
                            x-show="selectedItemImages.length > 1"
                            @click.stop="prevImage()"
                            class="img-arrow img-arrow--l" aria-label="Previous photo">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                 stroke="currentColor" stroke-width="2.5">
                                <path d="m15 18-6-6 6-6"/>
                            </svg>
                        </button>

                        {{-- Next arrow --}}
                        <button
                            x-show="selectedItemImages.length > 1"
                            @click.stop="nextImage()"
                            class="img-arrow img-arrow--r" aria-label="Next photo">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                 stroke="currentColor" stroke-width="2.5">
                                <path d="m9 18 6-6-6-6"/>
                            </svg>
                        </button>

                        {{-- Dot indicators --}}
                        <div
                            x-show="selectedItemImages.length > 1"
                            class="absolute bottom-3 inset-x-0 flex justify-center gap-1.5">
                            <template x-for="(img, i) in selectedItemImages" :key="i">
                                <div
                                    :class="i === currentImageIndex ? 'img-dot img-dot--active' : 'img-dot'">
                                </div>
                            </template>
                        </div>
                    </div>

                    {{-- Dish name --}}
                    <h2
                        class="text-3xl font-bold leading-tight"
                        x-text="selectedItem.name"
                        style="font-family:var(--font-serif);color:var(--cd-text);">
                    </h2>

                    {{-- Price + prep time --}}
                    <div class="flex items-center justify-between">
                        <span
                            class="font-bold text-2xl"
                            x-text="'GHS ' + selectedItem.price.toFixed(2)"
                            style="color:var(--cd-amber);">
                        </span>
                        <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                             style="background:var(--cd-surface-2);">
                            <span x-text="selectedItem.prep_time_minutes <= 10 ? '⚡' : '⏱'"></span>
                            <span
                                class="text-xs font-medium"
                                x-text="'Ready in ~' + selectedItem.prep_time_minutes + ' min'"
                                :style="selectedItem.prep_time_minutes <= 10 ? 'color:var(--cd-amber)' : 'color:var(--cd-text-muted)'">
                            </span>
                        </div>
                    </div>

                    {{-- Description --}}
                    <p
                        x-show="selectedItem.description"
                        x-text="selectedItem.description"
                        class="text-sm leading-relaxed"
                        style="color:var(--cd-text-muted);">
                    </p>

                    {{-- Ingredient chips --}}
                    <div
                        class="flex flex-wrap gap-2"
                        x-show="selectedItem.ingredients && selectedItem.ingredients.length > 0">
                        <p class="w-full text-[10px] uppercase tracking-widest"
                           style="color:var(--cd-text-muted);">Contains</p>
                        <template x-for="ing in selectedItem.ingredients" :key="ing">
                            <span
                                class="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider"
                                x-text="ing"
                                style="background:var(--cd-surface-2);color:var(--cd-amber);">
                            </span>
                        </template>
                    </div>

                    {{-- Calories --}}
                    <p
                        x-show="selectedItem.calories"
                        x-text="selectedItem.calories + ' kcal'"
                        class="text-xs"
                        style="color:var(--cd-text-muted);">
                    </p>

                    {{-- ADD TO ORDER --}}
                    <button
                        @click="addToCart(selectedItem)"
                        class="w-full py-4 rounded-2xl font-bold text-base tracking-wide transition-transform active:scale-95"
                        style="background:var(--cd-amber);color:#0D1B0D;">
                        ADD TO MY ORDER
                    </button>

                </div>
            </template>
        </div>
    </div>


    {{-- ═══════════════════════════════════════════════════════
         CART BOTTOM SHEET
    ═══════════════════════════════════════════════════════ --}}
    <div
        x-show="showCart"
        @click.self="showCart = false"
        class="fixed inset-0 z-50 flex items-end"
        style="background:var(--cd-overlay);"
        x-transition:enter="animate-fade-in"
        x-transition:leave="transition-opacity duration-200"
        x-transition:leave-end="opacity-0">

        <div
            x-ref="cartPanel"
            @touchstart="startDrag($event, 'cartPanel', () => showCart = false)"
            class="sheet-panel w-full rounded-t-3xl overflow-y-auto max-h-[85vh] animate-slide-up"
            style="background:var(--cd-surface);">

            <div class="flex justify-center pt-3 pb-1">
                <div class="w-10 h-1 rounded-full" style="background:var(--cd-border);"></div>
            </div>

            <div class="px-5 safe-bottom-sheet space-y-5">

                {{-- Header --}}
                <div class="flex items-start justify-between">
                    <div>
                        <h2 class="text-2xl font-semibold"
                            style="font-family:var(--font-serif);color:var(--cd-text);">
                            Your Order
                        </h2>
                        <p class="text-xs mt-0.5" style="color:var(--cd-text-muted);">
                            Review before you place it
                        </p>
                    </div>
                    <button
                        @click="showCart = false"
                        class="text-xs px-3 py-1.5 rounded-full mt-1"
                        style="color:var(--cd-text-muted);background:var(--cd-surface-2);">
                        Close
                    </button>
                </div>

                {{-- Empty cart --}}
                <div
                    x-show="cart.length === 0"
                    class="flex flex-col items-center py-12 space-y-3 text-center">
                    <span class="text-4xl">🍽️</span>
                    <p class="text-sm font-medium" style="color:var(--cd-text);">Your order is empty</p>
                    <p class="text-xs" style="color:var(--cd-text-muted);">Go pick something delicious</p>
                    <button @click="showCart = false"
                            class="mt-2 px-5 py-2 rounded-full text-sm font-semibold"
                            style="background:var(--cd-amber);color:#0D1B0D;">
                        Browse Menu
                    </button>
                </div>

                {{-- Cart items --}}
                <div class="space-y-3" x-show="cart.length > 0">
                    <template x-for="item in cart" :key="item.id">
                        <div
                            class="flex items-center gap-3 p-3 rounded-xl"
                            style="background:var(--cd-surface-2);">
                            <div class="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden"
                                 style="background:var(--cd-surface);">
                                <img x-show="item.thumb" :src="item.thumb" :alt="item.name"
                                     class="w-full h-full object-cover">
                                <div x-show="!item.thumb"
                                     class="w-full h-full flex items-center justify-center text-xl">🍽️</div>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="font-medium text-sm truncate"
                                   x-text="item.name" style="color:var(--cd-text);"></p>
                                <p class="text-xs mt-0.5 font-semibold"
                                   x-text="'GHS ' + (item.price * item.quantity).toFixed(2)"
                                   style="color:var(--cd-amber);"></p>
                            </div>
                            <div class="flex items-center gap-2 flex-shrink-0">
                                <button @click="decrement(item.id)"
                                        class="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold"
                                        style="background:var(--cd-surface);color:var(--cd-text);">−</button>
                                <span class="w-5 text-center font-bold text-sm"
                                      x-text="item.quantity" style="color:var(--cd-text);"></span>
                                <button @click="increment(item.id)"
                                        class="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold"
                                        style="background:var(--cd-amber);color:#0D1B0D;">+</button>
                            </div>
                        </div>
                    </template>
                </div>

                {{-- Total + CTA --}}
                <div x-show="cart.length > 0" class="space-y-4">
                    <div class="flex items-center justify-between pt-3"
                         style="border-top:1px solid var(--cd-border);">
                        <span class="font-semibold" style="color:var(--cd-text);">Total</span>
                        <span class="font-bold text-xl" x-text="cartTotalFormatted"
                              style="color:var(--cd-amber);"></span>
                    </div>
                    <button
                        @click="showCheckout = true; showCart = false"
                        class="w-full py-4 rounded-2xl font-bold text-base tracking-wide transition-transform active:scale-95"
                        style="background:var(--cd-amber);color:#0D1B0D;">
                        Place My Order →
                    </button>
                </div>

            </div>
        </div>
    </div>


    {{-- ═══════════════════════════════════════════════════════
         CHECKOUT BOTTOM SHEET
    ═══════════════════════════════════════════════════════ --}}
    <div
        x-show="showCheckout"
        @click.self="showCheckout = false"
        class="fixed inset-0 z-50 flex items-end"
        style="background:var(--cd-overlay);"
        x-transition:enter="animate-fade-in"
        x-transition:leave="transition-opacity duration-200"
        x-transition:leave-end="opacity-0">

        <div
            x-ref="checkoutPanel"
            @touchstart="startDrag($event, 'checkoutPanel', () => showCheckout = false)"
            class="sheet-panel w-full rounded-t-3xl overflow-y-auto max-h-[90vh] animate-slide-up"
            style="background:var(--cd-surface);">

            <div class="flex justify-center pt-3 pb-1">
                <div class="w-10 h-1 rounded-full" style="background:var(--cd-border);"></div>
            </div>

            <div class="px-5 safe-bottom-sheet space-y-5">

                {{-- Header --}}
                <div class="flex items-center justify-between">
                    <h2 class="text-2xl font-semibold"
                        style="font-family:var(--font-serif);color:var(--cd-text);">
                        Almost there
                    </h2>
                    <button
                        @click="showCheckout = false; showCart = true"
                        class="text-xs px-3 py-1.5 rounded-full flex items-center gap-1"
                        style="color:var(--cd-text-muted);background:var(--cd-surface-2);">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor"
                             stroke-width="2" viewBox="0 0 24 24">
                            <path d="m15 18-6-6 6-6"/>
                        </svg>
                        Back
                    </button>
                </div>

                {{-- Order summary --}}
                <div class="rounded-2xl p-4 space-y-2" style="background:var(--cd-surface-2);">
                    <p class="text-[10px] uppercase tracking-widest mb-2"
                       style="color:var(--cd-text-muted);">Order summary</p>
                    <template x-for="item in cart" :key="item.id">
                        <div class="flex items-center justify-between text-sm">
                            <span x-text="item.quantity + '× ' + item.name"
                                  class="truncate mr-3" style="color:var(--cd-text);"></span>
                            <span class="flex-shrink-0 font-semibold"
                                  x-text="'GHS ' + (item.price * item.quantity).toFixed(2)"
                                  style="color:var(--cd-amber);"></span>
                        </div>
                    </template>
                    <div class="flex items-center justify-between font-bold pt-2 mt-1"
                         style="border-top:1px solid var(--cd-border);">
                        <span style="color:var(--cd-text);">Total</span>
                        <span x-text="cartTotalFormatted" style="color:var(--cd-amber);"></span>
                    </div>
                </div>

                {{-- Customer details --}}
                <div class="space-y-3">

                    {{-- Full name --}}
                    <label class="block">
                        <span class="block text-[10px] uppercase tracking-widest mb-1.5"
                              style="color:var(--cd-text-muted);">Full name</span>
                        <input x-model="customerName" type="text"
                               placeholder="e.g. Kwame Mensah"
                               autocomplete="name"
                               class="w-full px-4 py-3 rounded-xl text-sm outline-none"
                               style="background:var(--cd-surface-2);color:var(--cd-text);border:1px solid var(--cd-border);">
                    </label>

                    {{-- Receipt channel toggle --}}
                    <div>
                        <span class="block text-[10px] uppercase tracking-widest mb-2"
                              style="color:var(--cd-text-muted);">Send my receipt via</span>
                        <div class="grid grid-cols-2 gap-2">
                            <button type="button"
                                @click="receiptChannel = 'email'"
                                :style="receiptChannel === 'email'
                                    ? 'background:var(--cd-amber);color:#0D1B0D;border-color:var(--cd-amber);'
                                    : 'background:var(--cd-surface-2);color:var(--cd-text-muted);border-color:var(--cd-border);'"
                                class="flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-all">
                                {{-- Email icon --}}
                                <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor"
                                     stroke-width="2" viewBox="0 0 24 24">
                                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                                    <path d="m2 7 10 7 10-7"/>
                                </svg>
                                Email
                            </button>
                            <button type="button"
                                @click="receiptChannel = 'whatsapp'"
                                :style="receiptChannel === 'whatsapp'
                                    ? 'background:#25D366;color:#fff;border-color:#25D366;'
                                    : 'background:var(--cd-surface-2);color:var(--cd-text-muted);border-color:var(--cd-border);'"
                                class="flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-all">
                                {{-- WhatsApp icon --}}
                                <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                                </svg>
                                WhatsApp
                            </button>
                        </div>
                    </div>

                    {{-- Email input (shown when email channel selected) --}}
                    <label class="block" x-show="receiptChannel === 'email'" x-transition>
                        <span class="block text-[10px] uppercase tracking-widest mb-1.5"
                              style="color:var(--cd-text-muted);">Email address</span>
                        <input x-model="customerEmail" type="email"
                               placeholder="you@example.com"
                               autocomplete="email"
                               class="w-full px-4 py-3 rounded-xl text-sm outline-none"
                               style="background:var(--cd-surface-2);color:var(--cd-text);border:1px solid var(--cd-border);">
                    </label>

                    {{-- WhatsApp input (shown when whatsapp channel selected) --}}
                    <label class="block" x-show="receiptChannel === 'whatsapp'" x-transition>
                        <span class="block text-[10px] uppercase tracking-widest mb-1.5"
                              style="color:var(--cd-text-muted);">WhatsApp number</span>
                        <div class="flex items-center gap-0 rounded-xl overflow-hidden"
                             style="border:1px solid var(--cd-border);">
                            <span class="px-3 py-3 text-sm flex-shrink-0"
                                  style="background:var(--cd-surface-2);color:var(--cd-text-muted);border-right:1px solid var(--cd-border);">
                                🇬🇭 +233
                            </span>
                            <input x-model="customerWhatsapp" type="tel"
                                   placeholder="024 000 0000"
                                   autocomplete="tel"
                                   class="flex-1 px-4 py-3 text-sm outline-none"
                                   style="background:var(--cd-surface-2);color:var(--cd-text);">
                        </div>
                        <p class="text-[11px] mt-1.5" style="color:var(--cd-text-muted);">
                            You'll get a tap-to-save receipt link on WhatsApp after payment.
                        </p>
                    </label>

                </div>

                {{-- Error --}}
                <p x-show="payError" x-text="payError"
                   class="text-sm rounded-xl px-4 py-3"
                   style="background:rgba(220,38,38,0.15);color:#FCA5A5;"></p>

                {{-- Pay button --}}
                <button
                    @click="submitCheckout()"
                    :disabled="submitting || !checkoutReady"
                    :class="(submitting || !checkoutReady)
                        ? 'opacity-50 cursor-not-allowed'
                        : 'active:scale-95'"
                    class="w-full py-4 rounded-2xl font-bold text-base tracking-wide transition-all"
                    style="background:var(--cd-amber);color:#0D1B0D;">
                    <span x-show="!submitting" class="flex items-center justify-center gap-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor"
                             stroke-width="2" viewBox="0 0 24 24">
                            <rect x="3" y="11" width="18" height="11" rx="2"/>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                        Pay Securely with Paystack
                    </span>
                    <span x-show="submitting" class="flex items-center justify-center gap-2">
                        <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor"
                                    stroke-width="3" stroke-dasharray="40" stroke-dashoffset="10"
                                    style="opacity:0.3"/>
                            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor"
                                  stroke-width="3" stroke-linecap="round"/>
                        </svg>
                        Processing…
                    </span>
                </button>

                <p class="text-xs text-center pb-2" style="color:var(--cd-text-muted);">
                    🔒 Your payment is encrypted &amp; safe · Powered by Paystack · GHS
                </p>

            </div>
        </div>
    </div>


</body>
</html>
