import Alpine from 'alpinejs';

window.Alpine = Alpine;

/**
 * menuApp — Alpine data factory for the full menu/cart/checkout experience.
 *
 * categories and items are embedded as JSON in data-* attrs on #menu-root by
 * MenuController, so a single page load is the only HTTP request before the
 * customer can browse. Alpine reads them in init().
 *
 * Cart lives only in memory for the duration of the table session (correct for
 * dine-in: we do NOT want cross-session cart persistence).
 */
function menuApp(categories = [], items = []) {
    return {
        // ── Seeded from PHP via @json() Blade directive ─────────────
        categories,
        items,

        // ── UI state ────────────────────────────────────────────────
        activeCategory: null,
        search: '',
        selectedItem: null,
        showDetail: false,
        showCart: false,
        showCheckout: false,

        // ── Customer details ────────────────────────────────────────
        customerName: '',
        customerEmail: '',
        submitting: false,
        payError: '',

        // ── Cart  [{ id, name, price, quantity, thumb }] ────────────
        cart: [],

        // ── Lifecycle ───────────────────────────────────────────────
        init() {
            if (this.categories.length) {
                this.activeCategory = String(this.categories[0].id);
            }
        },

        // ── Computed: filtered item list ────────────────────────────
        get filteredItems() {
            const q = this.search.trim().toLowerCase();
            if (q.length > 1) {
                return this.items.filter(i =>
                    i.name.toLowerCase().includes(q) ||
                    (i.description || '').toLowerCase().includes(q)
                );
            }
            if (this.activeCategory) {
                return this.items.filter(i =>
                    String(i.category_id) === String(this.activeCategory)
                );
            }
            return this.items;
        },

        // ── Computed: cart aggregates ───────────────────────────────
        get cartTotal() {
            return this.cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
        },
        get cartCount() {
            return this.cart.reduce((sum, i) => sum + i.quantity, 0);
        },
        get cartTotalFormatted() {
            return 'GHS ' + this.cartTotal.toFixed(2);
        },

        // ── Cart actions ────────────────────────────────────────────
        addToCart(item) {
            const existing = this.cart.find(c => c.id === item.id);
            if (existing) {
                existing.quantity++;
            } else {
                this.cart.push({
                    id:       item.id,
                    name:     item.name,
                    price:    item.price,
                    quantity: 1,
                    thumb:    item.image || '',
                });
            }
            this.closeDetail();
        },
        increment(id) {
            const item = this.cart.find(c => c.id === id);
            if (item) item.quantity++;
        },
        decrement(id) {
            const idx = this.cart.findIndex(c => c.id === id);
            if (idx === -1) return;
            if (this.cart[idx].quantity > 1) {
                this.cart[idx].quantity--;
            } else {
                this.cart.splice(idx, 1);
            }
        },
        cartQtyFor(id) {
            const item = this.cart.find(c => c.id === id);
            return item ? item.quantity : 0;
        },
        isInCart(id) {
            return this.cart.some(c => c.id === id);
        },

        // ── Detail sheet ────────────────────────────────────────────
        openDetail(item) {
            this.selectedItem = item;
            this.showDetail   = true;
        },
        closeDetail() {
            this.showDetail = false;
            setTimeout(() => { this.selectedItem = null; }, 350);
        },

        // ── Category navigation ─────────────────────────────────────
        selectCategory(id) {
            this.activeCategory = String(id);
            this.search = '';
            this.$nextTick(() => {
                const el = document.getElementById('cat-' + id);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            });
        },

        // ── Checkout: POST cart JSON → get Paystack URL → redirect ──
        async submitCheckout() {
            if (!this.customerName.trim() || !this.customerEmail.trim()) return;
            if (this.cart.length === 0) return;

            this.submitting = true;
            this.payError   = '';

            const payload = {
                cart:           this.cart.map(c => ({ id: c.id, price: c.price, quantity: c.quantity })),
                customer_name:  this.customerName.trim(),
                customer_email: this.customerEmail.trim(),
            };

            const csrfToken = document.querySelector('meta[name="csrf-token"]');

            try {
                const res = await fetch('/checkout/pay', {
                    method:  'POST',
                    headers: {
                        'Content-Type':  'application/json',
                        'Accept':        'application/json',
                        'X-CSRF-TOKEN':  csrfToken ? csrfToken.content : '',
                    },
                    body: JSON.stringify(payload),
                });

                const data = await res.json();

                if (!res.ok || !data.redirect_url) {
                    this.payError   = data.error ?? 'Something went wrong. Please try again.';
                    this.submitting = false;
                    return;
                }

                window.location.href = data.redirect_url;

            } catch {
                this.payError   = 'Network error — check your connection and try again.';
                this.submitting = false;
            }
        },
    };
}

window.menuApp = menuApp;

Alpine.start();
