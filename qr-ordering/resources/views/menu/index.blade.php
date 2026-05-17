<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>{{ $locationName ?? 'Cookers Delight' }} — Order</title>
    <meta name="theme-color" content="#0D1B0D">
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>

{{--
    ROOT ELEMENT
    ============
    • id="menu-root"  → Alpine's init() reads data-* attrs here
    • data-categories / data-items → all menu data as JSON (embedded at render time)
    • x-data="menuApp()"  → boots the Alpine component
    • x-cloak → suppressed by [x-cloak]{display:none} until Alpine boots
--}}
<body
    id="menu-root"
    x-data="menuApp(@json($categories), @json($items))"
    x-cloak
    class="min-h-screen overflow-x-hidden antialiased select-none"
    style="background: var(--cd-bg); color: var(--cd-text); font-family: var(--font-sans);">


    {{-- ═══════════════════════════════════════════════════════════
         SECTION 1 — FIXED HEADER (72px)
         Restaurant name (serif) · Location muted · Table # amber
    ═══════════════════════════════════════════════════════════ --}}
    <header
        class="fixed top-0 inset-x-0 z-30 flex items-center justify-between px-5 h-[72px]"
        style="background: var(--cd-bg); border-bottom: 1px solid var(--cd-border);">

        <div class="flex flex-col leading-tight">
            <span
                class="text-xl font-semibold tracking-wide"
                style="font-family: var(--font-serif); color: var(--cd-text);">
                Cookers Delight
            </span>
            <span class="text-xs" style="color: var(--cd-text-muted);">
                {{ $locationName ?? 'Dine-in' }}
            </span>
        </div>

        <div class="flex flex-col items-end">
            <span class="text-[10px] uppercase tracking-widest" style="color: var(--cd-text-muted);">Table</span>
            <span class="font-bold text-2xl leading-none" style="color: var(--cd-amber);">
                {{ $tableNumber ?? '—' }}
            </span>
        </div>
    </header>


    {{-- ═══════════════════════════════════════════════════════════
         SECTION 2 — STICKY CATEGORY STRIP + SEARCH
         Sits directly below the 72px header. Sticks on scroll.
    ═══════════════════════════════════════════════════════════ --}}
    <div
        class="sticky top-[72px] z-20 pt-3 pb-3 px-4 space-y-3"
        style="background: var(--cd-bg);">

        {{-- Category pills --}}
        <div class="flex gap-2 overflow-x-auto hide-scrollbar pb-0.5">
            @foreach($categories as $cat)
            <button
                id="cat-{{ $cat['id'] }}"
                @click="selectCategory('{{ $cat['id'] }}')"
                :style="activeCategory === '{{ $cat['id'] }}'
                    ? 'background: var(--cd-amber); color: #0D1B0D;'
                    : 'background: var(--cd-surface); color: var(--cd-text-muted);'"
                class="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200">
                {{ $cat['name'] }}
            </button>
            @endforeach
        </div>

        {{-- Search bar --}}
        <div class="relative">
            <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                 style="color: var(--cd-text-muted);"
                 fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
                x-model.debounce.300ms="search"
                type="search"
                autocomplete="off"
                placeholder="Search dishes…"
                class="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none transition-colors"
                style="background: var(--cd-surface); color: var(--cd-text);
                       border: 1px solid var(--cd-border);">
        </div>
    </div>


    {{-- ═══════════════════════════════════════════════════════════
         SECTION 3 — SCROLLABLE ITEM LIST
         pb-32 gives space for the floating cart bar.
    ═══════════════════════════════════════════════════════════ --}}
    <main class="pt-2 pb-32 px-4 space-y-2">

        {{-- Empty state --}}
        <div
            x-show="filteredItems.length === 0"
            class="flex flex-col items-center justify-center py-24 space-y-3">
            <span class="text-5xl">🔍</span>
            <p class="text-sm" style="color: var(--cd-text-muted);">No dishes found</p>
        </div>

        {{-- Item cards --}}
        <template x-for="item in filteredItems" :key="item.id">
            <div
                @click="openDetail(item)"
                class="item-card flex items-center gap-4 p-4 rounded-2xl cursor-pointer"
                style="background: var(--cd-surface);">

                {{-- Thumbnail --}}
                <div
                    class="flex-shrink-0 w-[72px] h-[72px] rounded-xl overflow-hidden"
                    style="background: var(--cd-surface-2);">
                    <img
                        x-show="item.image"
                        :src="item.image"
                        :alt="item.name"
                        class="w-full h-full object-cover"
                        loading="lazy">
                    <div
                        x-show="!item.image"
                        class="w-full h-full flex items-center justify-center text-3xl">
                        🍽️
                    </div>
                </div>

                {{-- Info --}}
                <div class="flex-1 min-w-0">
                    <p
                        class="font-semibold text-sm leading-snug truncate"
                        x-text="item.name"
                        style="color: var(--cd-text);">
                    </p>
                    <p
                        class="text-xs mt-0.5 leading-relaxed line-clamp-2"
                        x-text="item.description"
                        style="color: var(--cd-text-muted);">
                    </p>
                    <div class="flex items-center justify-between mt-2">
                        <span
                            class="font-bold text-sm"
                            x-text="'GHS ' + item.price.toFixed(2)"
                            style="color: var(--cd-amber);">
                        </span>
                        <span
                            x-show="isInCart(item.id)"
                            class="text-[11px] px-2 py-0.5 rounded-full font-medium"
                            x-text="cartQtyFor(item.id) + ' in order'"
                            style="background: var(--cd-primary); color: var(--cd-text);">
                        </span>
                    </div>
                </div>

                {{-- Chevron --}}
                <svg class="w-4 h-4 flex-shrink-0" style="color: var(--cd-text-muted);"
                     fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path d="m9 18 6-6-6-6"/>
                </svg>
            </div>
        </template>
    </main>


    {{-- ═══════════════════════════════════════════════════════════
         SECTION 4 — FLOATING CART BAR
         Fixed at bottom. Hidden when cart is empty.
    ═══════════════════════════════════════════════════════════ --}}
    <div
        x-show="cartCount > 0"
        x-transition:enter="transition ease-out duration-300"
        x-transition:enter-start="opacity-0 translate-y-4"
        x-transition:enter-end="opacity-100 translate-y-0"
        x-transition:leave="transition ease-in duration-200"
        x-transition:leave-start="opacity-100 translate-y-0"
        x-transition:leave-end="opacity-0 translate-y-4"
        @click="showCart = true"
        class="safe-cart-bar fixed inset-x-4 z-40 flex items-center justify-between px-5 py-4 rounded-2xl cursor-pointer shadow-2xl"
        style="background: var(--cd-amber);">

        <div class="flex items-center gap-3">
            <span
                class="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
                style="background: rgba(0,0,0,0.2); color: #0D1B0D;"
                x-text="cartCount">
            </span>
            <span class="font-semibold text-sm" style="color: #0D1B0D;">View Order</span>
        </div>

        <span class="font-bold" style="color: #0D1B0D;" x-text="cartTotalFormatted"></span>
    </div>


    {{-- ═══════════════════════════════════════════════════════════
         SECTION 5 — ITEM DETAIL BOTTOM SHEET
         Slides up from bottom. Backdrop click closes.
    ═══════════════════════════════════════════════════════════ --}}
    <div
        x-show="showDetail && selectedItem"
        @click.self="closeDetail()"
        class="fixed inset-0 z-50 flex items-end"
        style="background: var(--cd-overlay);"
        x-transition:enter="animate-fade-in"
        x-transition:leave="transition-opacity duration-200"
        x-transition:leave-end="opacity-0">

        <div
            class="w-full rounded-t-3xl overflow-y-auto max-h-[92vh] animate-slide-up"
            style="background: var(--cd-surface);">

            {{-- Drag handle --}}
            <div class="flex justify-center pt-3 pb-2">
                <div class="w-10 h-1 rounded-full" style="background: var(--cd-border);"></div>
            </div>

            <template x-if="selectedItem">
                <div class="px-5 safe-bottom-sheet space-y-5">

                    {{-- Large food image --}}
                    <div
                        class="w-full aspect-square rounded-2xl overflow-hidden"
                        style="background: var(--cd-surface-2);">
                        <img
                            x-show="selectedItem.image"
                            :src="selectedItem.image"
                            :alt="selectedItem.name"
                            class="w-full h-full object-cover">
                        <div
                            x-show="!selectedItem.image"
                            class="w-full h-full flex items-center justify-center text-8xl">
                            🍽️
                        </div>
                    </div>

                    {{-- Dish name --}}
                    <h2
                        class="text-3xl font-bold leading-tight"
                        x-text="selectedItem.name"
                        style="font-family: var(--font-serif); color: var(--cd-text);">
                    </h2>

                    {{-- Price + calories --}}
                    <div class="flex items-baseline justify-between">
                        <span
                            class="font-bold text-2xl"
                            x-text="'GHS ' + selectedItem.price.toFixed(2)"
                            style="color: var(--cd-amber);">
                        </span>
                        <span
                            x-show="selectedItem.calories"
                            x-text="selectedItem.calories + ' kcal'"
                            class="text-sm"
                            style="color: var(--cd-text-muted);">
                        </span>
                    </div>

                    {{-- Description --}}
                    <p
                        x-show="selectedItem.description"
                        x-text="selectedItem.description"
                        class="text-sm leading-relaxed"
                        style="color: var(--cd-text-muted);">
                    </p>

                    {{-- Ingredient chips --}}
                    <div
                        class="flex flex-wrap gap-2"
                        x-show="selectedItem.ingredients && selectedItem.ingredients.length > 0">
                        <template x-for="ing in selectedItem.ingredients" :key="ing">
                            <span
                                class="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider"
                                x-text="ing"
                                style="background: var(--cd-surface-2); color: var(--cd-amber);">
                            </span>
                        </template>
                    </div>

                    {{-- Prep time indicator --}}
                    <div class="flex items-center gap-2" style="color: var(--cd-text-muted);">
                        <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor"
                             stroke-width="2" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                        </svg>
                        <span
                            class="text-xs"
                            x-text="'Ready in ~' + selectedItem.prep_time_minutes + ' min'">
                        </span>
                    </div>

                    {{-- ADD TO ORDER --}}
                    <button
                        @click="addToCart(selectedItem)"
                        class="w-full py-4 rounded-2xl font-bold text-base tracking-wide transition-transform active:scale-95"
                        style="background: var(--cd-amber); color: #0D1B0D;">
                        ADD TO ORDER
                    </button>

                </div>
            </template>
        </div>
    </div>


    {{-- ═══════════════════════════════════════════════════════════
         SECTION 6 — CART BOTTOM SHEET
    ═══════════════════════════════════════════════════════════ --}}
    <div
        x-show="showCart"
        @click.self="showCart = false"
        class="fixed inset-0 z-50 flex items-end"
        style="background: var(--cd-overlay);"
        x-transition:enter="animate-fade-in"
        x-transition:leave="transition-opacity duration-200"
        x-transition:leave-end="opacity-0">

        <div
            class="w-full rounded-t-3xl overflow-y-auto max-h-[85vh] animate-slide-up"
            style="background: var(--cd-surface);">

            <div class="flex justify-center pt-3 pb-2">
                <div class="w-10 h-1 rounded-full" style="background: var(--cd-border);"></div>
            </div>

            <div class="px-5 safe-bottom-sheet space-y-5">

                {{-- Header --}}
                <div class="flex items-center justify-between">
                    <h2
                        class="text-2xl font-semibold"
                        style="font-family: var(--font-serif); color: var(--cd-text);">
                        Your Order
                    </h2>
                    <button
                        @click="showCart = false"
                        class="text-xs px-3 py-1.5 rounded-full transition-colors"
                        style="color: var(--cd-text-muted); background: var(--cd-surface-2);">
                        Close
                    </button>
                </div>

                {{-- Cart items --}}
                <div class="space-y-3">
                    <template x-for="item in cart" :key="item.id">
                        <div
                            class="flex items-center gap-3 p-3 rounded-xl"
                            style="background: var(--cd-surface-2);">

                            {{-- Thumbnail --}}
                            <div
                                class="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden"
                                style="background: var(--cd-surface);">
                                <img
                                    x-show="item.thumb"
                                    :src="item.thumb"
                                    :alt="item.name"
                                    class="w-full h-full object-cover">
                                <div
                                    x-show="!item.thumb"
                                    class="w-full h-full flex items-center justify-center text-xl">
                                    🍽️
                                </div>
                            </div>

                            {{-- Name + subtotal --}}
                            <div class="flex-1 min-w-0">
                                <p
                                    class="font-medium text-sm truncate"
                                    x-text="item.name"
                                    style="color: var(--cd-text);">
                                </p>
                                <p
                                    class="text-xs mt-0.5 font-semibold"
                                    x-text="'GHS ' + (item.price * item.quantity).toFixed(2)"
                                    style="color: var(--cd-amber);">
                                </p>
                            </div>

                            {{-- Qty stepper --}}
                            <div class="flex items-center gap-2 flex-shrink-0">
                                <button
                                    @click="decrement(item.id)"
                                    class="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold transition-colors"
                                    style="background: var(--cd-surface); color: var(--cd-text);">
                                    −
                                </button>
                                <span
                                    class="w-5 text-center font-bold text-sm"
                                    x-text="item.quantity"
                                    style="color: var(--cd-text);">
                                </span>
                                <button
                                    @click="increment(item.id)"
                                    class="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold transition-colors"
                                    style="background: var(--cd-amber); color: #0D1B0D;">
                                    +
                                </button>
                            </div>
                        </div>
                    </template>
                </div>

                {{-- Total --}}
                <div
                    class="flex items-center justify-between pt-3"
                    style="border-top: 1px solid var(--cd-border);">
                    <span class="font-semibold" style="color: var(--cd-text);">Total</span>
                    <span
                        class="font-bold text-xl"
                        x-text="cartTotalFormatted"
                        style="color: var(--cd-amber);">
                    </span>
                </div>

                {{-- Checkout CTA --}}
                <button
                    @click="showCheckout = true; showCart = false"
                    class="w-full py-4 rounded-2xl font-bold text-base tracking-wide transition-transform active:scale-95"
                    style="background: var(--cd-amber); color: #0D1B0D;">
                    Proceed to Checkout
                </button>

            </div>
        </div>
    </div>


    {{-- ═══════════════════════════════════════════════════════════
         SECTION 7 — CHECKOUT BOTTOM SHEET
    ═══════════════════════════════════════════════════════════ --}}
    <div
        x-show="showCheckout"
        @click.self="showCheckout = false"
        class="fixed inset-0 z-50 flex items-end"
        style="background: var(--cd-overlay);"
        x-transition:enter="animate-fade-in"
        x-transition:leave="transition-opacity duration-200"
        x-transition:leave-end="opacity-0">

        <div
            class="w-full rounded-t-3xl overflow-y-auto max-h-[90vh] animate-slide-up"
            style="background: var(--cd-surface);">

            <div class="flex justify-center pt-3 pb-2">
                <div class="w-10 h-1 rounded-full" style="background: var(--cd-border);"></div>
            </div>

            <div class="px-5 safe-bottom-sheet space-y-5">

                {{-- Header --}}
                <div class="flex items-center justify-between">
                    <h2
                        class="text-2xl font-semibold"
                        style="font-family: var(--font-serif); color: var(--cd-text);">
                        Checkout
                    </h2>
                    <button
                        @click="showCheckout = false; showCart = true"
                        class="text-xs px-3 py-1.5 rounded-full transition-colors flex items-center gap-1"
                        style="color: var(--cd-text-muted); background: var(--cd-surface-2);">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor"
                             stroke-width="2" viewBox="0 0 24 24">
                            <path d="m15 18-6-6 6-6"/>
                        </svg>
                        Back
                    </button>
                </div>

                {{-- Order summary card --}}
                <div class="rounded-2xl p-4 space-y-2" style="background: var(--cd-surface-2);">
                    <p class="text-[10px] uppercase tracking-widest mb-1" style="color: var(--cd-text-muted);">
                        Order summary
                    </p>
                    <template x-for="item in cart" :key="item.id">
                        <div class="flex items-center justify-between text-sm">
                            <span
                                x-text="item.quantity + '× ' + item.name"
                                class="truncate mr-3"
                                style="color: var(--cd-text);">
                            </span>
                            <span
                                class="flex-shrink-0 font-semibold"
                                x-text="'GHS ' + (item.price * item.quantity).toFixed(2)"
                                style="color: var(--cd-amber);">
                            </span>
                        </div>
                    </template>
                    <div
                        class="flex items-center justify-between font-bold pt-2 mt-1"
                        style="border-top: 1px solid var(--cd-border);">
                        <span style="color: var(--cd-text);">Total</span>
                        <span x-text="cartTotalFormatted" style="color: var(--cd-amber);"></span>
                    </div>
                </div>

                {{-- Customer details --}}
                <div class="space-y-3">

                    <label class="block">
                        <span
                            class="block text-[10px] uppercase tracking-widest mb-1.5"
                            style="color: var(--cd-text-muted);">
                            Your Name
                        </span>
                        <input
                            x-model="customerName"
                            type="text"
                            placeholder="e.g. Ama Serwah"
                            autocomplete="name"
                            class="w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors"
                            style="background: var(--cd-surface-2); color: var(--cd-text);
                                   border: 1px solid var(--cd-border);">
                    </label>

                    <label class="block">
                        <span
                            class="block text-[10px] uppercase tracking-widest mb-1.5"
                            style="color: var(--cd-text-muted);">
                            Email — receipt will be sent here
                        </span>
                        <input
                            x-model="customerEmail"
                            type="email"
                            placeholder="you@example.com"
                            autocomplete="email"
                            class="w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors"
                            style="background: var(--cd-surface-2); color: var(--cd-text);
                                   border: 1px solid var(--cd-border);">
                    </label>

                </div>

                {{-- Error message --}}
                <p
                    x-show="payError"
                    x-text="payError"
                    class="text-sm rounded-xl px-4 py-3"
                    style="background: rgba(220,38,38,0.15); color: #FCA5A5;">
                </p>

                {{-- Pay button --}}
                <button
                    @click="submitCheckout()"
                    :disabled="submitting || !customerName.trim() || !customerEmail.trim()"
                    :class="submitting || !customerName.trim() || !customerEmail.trim()
                        ? 'opacity-50 cursor-not-allowed'
                        : 'active:scale-95'"
                    class="w-full py-4 rounded-2xl font-bold text-base tracking-wide transition-all"
                    style="background: var(--cd-amber); color: #0D1B0D;">

                    <span x-show="!submitting" class="flex items-center justify-center gap-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor"
                             stroke-width="2" viewBox="0 0 24 24">
                            <rect x="3" y="11" width="18" height="11" rx="2"/>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                        Pay with Paystack
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

                <p class="text-xs text-center" style="color: var(--cd-text-muted);">
                    Payments secured by Paystack · GHS
                </p>

            </div>
        </div>
    </div>


</body>
</html>
