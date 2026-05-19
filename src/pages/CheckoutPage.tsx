import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { HiArrowLeft, HiLockClosed } from 'react-icons/hi2';
import { useCart } from '../contexts/CartContext';
import { haptic } from '../utils/haptics';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { cart, total, clearCart } = useCart();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [receiptChannel, setReceiptChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  const [whatsapp, setWhatsapp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (cart.length === 0) {
      navigate('/menu', { replace: true });
    }
  }, [cart.length, navigate]);

  const isReady =
    firstName.trim() &&
    lastName.trim() &&
    phone.trim() &&
    (receiptChannel === 'email' ? email.trim() : whatsapp.trim());

  async function handleSubmit() {
    if (!isReady || submitting) return;
    haptic(10);
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          cart: cart.map(item => ({ id: item.menu_id, quantity: item.quantity })),
          customer_name: `${firstName.trim()} ${lastName.trim()}`,
          customer_email:
            email.trim() || `wa.${Date.now()}@noreply.cookersdelight.com`,
          customer_phone: phone.trim(),
          receipt_channel: receiptChannel,
          customer_whatsapp: receiptChannel === 'whatsapp' ? whatsapp.trim() : '',
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.redirect_url) {
        const firstFieldError = data.fields
          ? (Object.values(data.fields as Record<string, string[]>)[0])?.[0]
          : null;
        setError(
          firstFieldError ??
            data.error ??
            "Your card wasn't charged — please try again."
        );
        setSubmitting(false);
        return;
      }

      sessionStorage.setItem('cd_order_reference', data.reference);
      clearCart();
      window.location.href = data.redirect_url;
    } catch {
      setError('No connection — check your signal and try again.');
      setSubmitting(false);
    }
  }

  const inputClass =
    'w-full rounded-xl border border-[var(--cd-border)] bg-white px-4 py-3 text-sm text-[var(--cd-text)] outline-none focus:border-[var(--cd-green)] focus:ring-1 focus:ring-[var(--cd-green)] transition-colors';

  const labelClass =
    'block text-[10px] uppercase tracking-widest font-semibold text-[var(--cd-muted)] mb-2 mt-4 first:mt-0';

  const cardClass = 'rounded-2xl p-4 mb-4';

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--cd-bg)' }}>
      <div className="max-w-md mx-auto px-5 py-8">
        {/* Back link */}
        <button
          onClick={() => navigate('/menu')}
          className="flex items-center gap-1.5 text-sm mb-6"
          style={{ color: 'var(--cd-muted)' }}
        >
          <HiArrowLeft size={16} />
          Back to menu
        </button>

        <h1
          className="text-3xl font-bold mb-1"
          style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--cd-text)' }}
        >
          Almost there
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--cd-muted)' }}>
          Review your order and confirm below
        </p>

        {/* Order summary */}
        <div
          className={cardClass}
          style={{ backgroundColor: 'var(--cd-bg-alt)' }}
        >
          <p className="text-[10px] uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--cd-muted)' }}>
            Order Summary
          </p>
          <div className="space-y-2">
            {cart.map(item => (
              <div key={item.menu_id} className="flex justify-between items-baseline text-sm">
                <span style={{ color: 'var(--cd-text)' }}>
                  {item.menu_name}
                  <span className="ml-1 text-xs" style={{ color: 'var(--cd-muted)' }}>× {item.quantity}</span>
                </span>
                <span className="font-medium" style={{ color: 'var(--cd-amber)' }}>
                  GH₵{(item.menu_price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          <div className="h-px my-3" style={{ backgroundColor: 'var(--cd-border)' }} />
          <div className="flex justify-between items-baseline">
            <span className="font-bold text-sm" style={{ color: 'var(--cd-muted)' }}>Total</span>
            <span className="font-bold text-base" style={{ color: 'var(--cd-green)' }}>
              GH₵{total.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Customer form */}
        <div
          className={cardClass}
          style={{ backgroundColor: 'var(--cd-bg-alt)' }}
        >
          <p className={labelClass} style={{ marginTop: 0 }}>Your Name</p>
          <div className="grid grid-cols-2 gap-3">
            <input
              className={inputClass}
              placeholder="First name"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              autoComplete="given-name"
            />
            <input
              className={inputClass}
              placeholder="Last name"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              autoComplete="family-name"
            />
          </div>

          <p className={labelClass}>Phone Number</p>
          <input
            className={inputClass}
            placeholder="024 000 0000"
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            autoComplete="tel"
          />

          <p className={labelClass}>Email</p>
          <input
            className={inputClass}
            placeholder="you@example.com"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
          />

          <p className={labelClass}>Send My Receipt Via</p>
          <div className="flex gap-3">
            {(['whatsapp', 'email'] as const).map(ch => (
              <button
                key={ch}
                onClick={() => setReceiptChannel(ch)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all capitalize"
                style={
                  receiptChannel === ch
                    ? { backgroundColor: 'var(--cd-green)', color: '#fff' }
                    : {
                        backgroundColor: 'transparent',
                        border: '1px solid var(--cd-border)',
                        color: 'var(--cd-muted)',
                      }
                }
              >
                {ch === 'whatsapp' ? 'WhatsApp' : 'Email'}
              </button>
            ))}
          </div>

          <AnimatePresence initial={false}>
            {receiptChannel === 'whatsapp' && (
              <motion.div
                key="whatsapp-field"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden' }}
              >
                <p className={labelClass}>WhatsApp Number</p>
                <input
                  className={inputClass}
                  placeholder="024 000 0000"
                  type="tel"
                  value={whatsapp}
                  onChange={e => setWhatsapp(e.target.value)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm mb-4">
            {error}
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handleSubmit}
          disabled={!isReady || submitting}
          className="w-full py-4 rounded-2xl font-bold text-base tracking-wide transition-all active:scale-95"
          style={{
            backgroundColor: 'var(--cd-green)',
            color: '#fff',
            opacity: !isReady || submitting ? 0.5 : 1,
            cursor: !isReady || submitting ? 'not-allowed' : 'pointer',
          }}
        >
          {submitting ? 'Processing…' : `Confirm — GH₵${total.toFixed(2)}`}
        </button>

        <p className="text-xs text-center mt-3 flex items-center justify-center gap-1.5" style={{ color: 'var(--cd-muted)' }}>
          <HiLockClosed size={12} />
          Secure payment via Paystack
        </p>
      </div>
    </div>
  );
}
