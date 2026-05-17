import Alpine from 'alpinejs';

window.Alpine = Alpine;

// ── Category icon map ────────────────────────────────────────────────
const CAT_ICONS = {
    'appetizer':'🥟','appetizers':'🥟',
    'main course':'🍛','main courses':'🍛','main':'🍛','mains':'🍛',
    'seafood':'🦐','seafoods':'🦐',
    'salad':'🥗','salads':'🥗',
    'traditional':'🍲',
    'specials':'⭐','special':'⭐',
    "chef's choice":'👨‍🍳',"chef's picks":'👨‍🍳',
    'drinks':'🥤','beverages':'🥤',
    'dessert':'🍮','desserts':'🍮',
    'soup':'🍜','soups':'🍜',
    'snacks':'🥨',
    'grill':'🍖','grills':'🍖',
    'all items':'📋','rice':'🍚',
};
function catIcon(n){ return CAT_ICONS[(n||'').toLowerCase()]??'🍽️'; }
window.catIcon = catIcon;

// ── menuApp ──────────────────────────────────────────────────────────
function menuApp() {
    return {
        // Data
        categories: [],
        items: [],

        // UI
        activeCategory: null,
        search: '',
        selectedItem: null,
        showDetail: false,
        showCart: false,
        showCheckout: false,
        showTranslate: false,

        // Customer
        customerName: '',
        customerEmail: '',
        customerWhatsapp: '',
        receiptChannel: 'email',   // 'email' | 'whatsapp'
        submitting: false,
        payError: '',

        // Cart
        cart: [],

        // Image carousel
        currentImageIndex: 0,

        // Drag-to-dismiss shared state
        _drag: { active:false, startY:0, el:null, close:null },

        // ── Init ──────────────────────────────────────────────────────
        init() {
            this.categories = window.__MENU_CATEGORIES__ ?? [];
            this.items      = window.__MENU_ITEMS__      ?? [];
            // Default to 'all' so customers see the full menu immediately
            this.activeCategory = 'all';
            this._initDrag();
        },

        // ── Greeting ──────────────────────────────────────────────────
        get greeting() {
            const h = new Date().getHours();
            if (h>=5  && h<12) return 'Good morning ☀️';
            if (h>=12 && h<17) return 'Good afternoon 🌿';
            if (h>=17 && h<22) return 'Good evening 🌙';
            return 'Still up? 🌟';
        },
        get greetingSub() {
            const h = new Date().getHours();
            if (h>=5  && h<12) return 'Start your day with something delicious';
            if (h>=12 && h<17) return 'What are you craving today?';
            if (h>=17 && h<22) return 'Tonight, treat yourself well';
            return "We're still cooking for you";
        },

        // ── Computed image list for detail carousel ───────────────────
        get selectedItemImages() {
            if (!this.selectedItem) return [];
            const imgs = this.selectedItem.images;
            if (Array.isArray(imgs) && imgs.length) return imgs;
            return this.selectedItem.image ? [this.selectedItem.image] : [];
        },

        // ── Filtered items ────────────────────────────────────────────
        get filteredItems() {
            const q = this.search.trim().toLowerCase();
            if (q.length > 1) {
                return this.items.filter(i =>
                    i.name.toLowerCase().includes(q) ||
                    (i.description||'').toLowerCase().includes(q)
                );
            }
            // 'all' is the virtual "show everything" category
            if (this.activeCategory && this.activeCategory !== 'all') {
                return this.items.filter(i =>
                    String(i.category_id) === String(this.activeCategory)
                );
            }
            return this.items;
        },

        // ── Checkout readiness ────────────────────────────────────────
        get checkoutReady() {
            if (!this.customerName.trim() || !this.cart.length) return false;
            if (this.receiptChannel === 'email') return !!this.customerEmail.trim();
            // WhatsApp: strip spaces/dashes, need at least 9 digits
            return this.customerWhatsapp.replace(/\D/g,'').length >= 9;
        },

        // ── Cart aggregates ───────────────────────────────────────────
        get cartTotal()          { return this.cart.reduce((s,i)=>s+i.price*i.quantity,0); },
        get cartCount()          { return this.cart.reduce((s,i)=>s+i.quantity,0); },
        get cartTotalFormatted() { return 'GHS '+this.cartTotal.toFixed(2); },

        // ── Cart actions ──────────────────────────────────────────────
        addToCart(item) {
            const ex = this.cart.find(c=>c.id===item.id);
            if (ex) { ex.quantity++; }
            else { this.cart.push({id:item.id,name:item.name,price:item.price,quantity:1,thumb:item.image||''}); }
            this.closeDetail();
        },
        // Quick-add from card without opening detail sheet
        addItemDirect(item) {
            const ex = this.cart.find(c=>c.id===item.id);
            if (ex) { ex.quantity++; }
            else { this.cart.push({id:item.id,name:item.name,price:item.price,quantity:1,thumb:item.image||''}); }
        },
        increment(id) { const i=this.cart.find(c=>c.id===id); if(i) i.quantity++; },
        decrement(id) {
            const idx=this.cart.findIndex(c=>c.id===id);
            if(idx===-1) return;
            if(this.cart[idx].quantity>1) this.cart[idx].quantity--;
            else this.cart.splice(idx,1);
        },
        cartQtyFor(id) { return (this.cart.find(c=>c.id===id)||{}).quantity??0; },
        isInCart(id)   { return this.cart.some(c=>c.id===id); },

        // ── Detail sheet ──────────────────────────────────────────────
        openDetail(item) {
            this.selectedItem     = item;
            this.currentImageIndex = 0;
            this.showDetail       = true;
        },
        closeDetail() {
            this.showDetail = false;
            setTimeout(()=>{ this.selectedItem=null; }, 350);
        },

        // ── Image carousel ────────────────────────────────────────────
        prevImage() {
            if (!this.selectedItemImages.length) return;
            this.currentImageIndex = (this.currentImageIndex - 1 + this.selectedItemImages.length) % this.selectedItemImages.length;
        },
        nextImage() {
            if (!this.selectedItemImages.length) return;
            this.currentImageIndex = (this.currentImageIndex + 1) % this.selectedItemImages.length;
        },

        // ── Category nav ──────────────────────────────────────────────
        selectCategory(id) {
            this.activeCategory = String(id);
            this.search = '';
            this.$nextTick(() => {
                const el = document.getElementById('cat-'+id);
                if (el) el.scrollIntoView({ behavior:'smooth', block:'nearest', inline:'center' });
            });
        },

        // ── Checkout ──────────────────────────────────────────────────
        async submitCheckout() {
            if (!this.checkoutReady) return;
            this.submitting = true;
            this.payError   = '';
            const csrf = document.querySelector('meta[name="csrf-token"]');

            // Build receipt contact based on chosen channel.
            // For WhatsApp, normalise to E.164-ish: strip non-digits, prepend 233 if starts with 0.
            let email    = '';
            let whatsapp = '';
            if (this.receiptChannel === 'email') {
                email = this.customerEmail.trim();
            } else {
                let raw = this.customerWhatsapp.replace(/\D/g,'');
                if (raw.startsWith('0')) raw = '233' + raw.slice(1);
                whatsapp = raw;
                // Paystack requires an email — use a placeholder so the API call succeeds.
                // The real receipt goes via WhatsApp link on the status page.
                email = 'wa.' + whatsapp + '@noreply.cookersdelight.com';
            }

            try {
                const res  = await fetch('/checkout/pay', {
                    method:'POST',
                    headers:{
                        'Content-Type':'application/json',
                        'Accept':'application/json',
                        'X-CSRF-TOKEN': csrf ? csrf.content : '',
                    },
                    body: JSON.stringify({
                        cart: this.cart.map(c=>({id:c.id,price:c.price,quantity:c.quantity})),
                        customer_name:     this.customerName.trim(),
                        customer_email:    email,
                        receipt_channel:   this.receiptChannel,
                        customer_whatsapp: whatsapp,
                    }),
                });
                const data = await res.json();
                if (!res.ok || !data.redirect_url) {
                    console.error('Checkout error:', res.status, data);
                    // Show the first specific field error if available, else generic message
                    const firstField = data.fields ? Object.values(data.fields)[0]?.[0] : null;
                    this.payError   = firstField ?? data.error ?? 'Something went wrong. Please try again.';
                    this.submitting = false;
                    return;
                }
                window.location.href = data.redirect_url;
            } catch {
                this.payError   = 'Network error — check your connection and try again.';
                this.submitting = false;
            }
        },

        // ── Drag-to-dismiss ───────────────────────────────────────────
        _initDrag() {
            const d = this._drag;

            // Non-passive so we can preventDefault (stops Android pull-to-refresh)
            document.addEventListener('touchmove', (e) => {
                if (!d.active || !d.el) return;
                const dy = e.touches[0].clientY - d.startY;
                if (dy > 0) {
                    e.preventDefault();
                    d.el.style.transform = `translateY(${Math.min(dy * 0.45, 130)}px)`;
                    d.el.style.opacity   = String(Math.max(0.55, 1 - dy/280));
                }
            }, { passive: false });

            document.addEventListener('touchend', (e) => {
                if (!d.active) return;
                const dy = e.changedTouches[0].clientY - d.startY;
                d.active = false;
                if (d.el) {
                    d.el.style.transition = 'transform 0.3s cubic-bezier(0.32,0.72,0,1),opacity 0.3s';
                    d.el.style.transform  = '';
                    d.el.style.opacity    = '';
                    const ref = d.el;
                    setTimeout(()=>{ ref.style.transition=''; }, 320);
                }
                if (dy > 90 && d.close) d.close();
                d.el    = null;
                d.close = null;
            }, { passive: true });
        },

        startDrag(event, refName, closeCallback) {
            const el = this.$refs[refName];
            if (!el || el.scrollTop > 8) return;
            const d  = this._drag;
            d.active  = true;
            d.startY  = event.touches[0].clientY;
            d.el      = el;
            d.close   = closeCallback;
            el.style.transition = 'none';
        },
    };
}

window.menuApp = menuApp;
Alpine.start();
