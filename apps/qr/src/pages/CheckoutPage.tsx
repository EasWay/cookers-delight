import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCart }    from '../contexts/CartContext';
import { useSession } from '../contexts/SessionContext';

function normalisePhone(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('0')) digits = '233' + digits.slice(1);
  return digits;
}

export default function CheckoutPage() {
  const { stableToken }                = useParams<{ stableToken: string }>();
  const navigate                       = useNavigate();
  const { session, isExpired }         = useSession();
  const { cart, total, clearCart }     = useCart();

  const [customerName,      setCustomerName]      = useState('');
  const [receiptChannel,    setReceiptChannel]    = useState<'whatsapp' | 'email'>('whatsapp');
  const [customerEmail,     setCustomerEmail]     = useState('');
  const [customerWhatsapp,  setCustomerWhatsapp]  = useState('');
  const [submitting,        setSubmitting]        = useState(false);
  const [error,             setError]             = useState('');

  // Guards
  useEffect(() => {
    if (!session || isExpired()) {
      navigate(`/table/${stableToken}`, { replace: true });
    } else if (cart.length === 0) {
      navigate(`/table/${stableToken}/menu`, { replace: true });
    }
  }, [session, cart.length, stableToken]); // eslint-disable-line

  const isReady =
    customerName.trim().length > 0 &&
    (receiptChannel === 'whatsapp'
      ? normalisePhone(customerWhatsapp).replace(/\D/g, '').length >= 9
      : customerEmail.trim().length > 0);

  async function handleSubmit() {
    if (!isReady || submitting || !session) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/qr-checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body:    JSON.stringify({
          session_token:     session.session_token,
          cart:              cart.map(i => ({ id: i.menu_id, quantity: i.quantity })),
          customer_name:     customerName.trim(),
          receipt_channel:   receiptChannel,
          customer_email:    receiptChannel === 'email'     ? customerEmail.trim()            : '',
          customer_whatsapp: receiptChannel === 'whatsapp'  ? normalisePhone(customerWhatsapp) : '',
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.redirect_url) {
        const fieldError = data.fields
          ? (Object.values(data.fields as Record<string, string[]>)[0]?.[0] ?? null)
          : null;
        setError(fieldError ?? data.error ?? "Your card wasn't charged — please try again.");
        setSubmitting(false);
        return;
      }

      sessionStorage.setItem('cd_qr_order_reference', data.reference);
      clearCart();
      window.location.href = data.redirect_url;
    } catch {
      setError('No connection — check your signal and try again.');
      setSubmitting(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--cd-surface-2)',
    color:           'var(--cd-text)',
    border:          '1px solid var(--cd-border)',
    borderRadius:    '0.75rem',
    padding:         '0.75rem 1rem',
    width:           '100%',
    fontSize:        '0.9rem',
    outline:         'none',
  };

  const labelStyle: React.CSSProperties = {
    fontSize:      '0.625rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color:         'var(--cd-muted)',
    display:       'block',
    marginBottom:  '0.4rem',
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--cd-bg)' }}>
      <div className="max-w-md mx-auto px-5 py-6">

        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 mb-6"
          style={{
            color:           'var(--cd-muted)',
            backgroundColor: 'var(--cd-surface)',
            borderRadius:    '9999px',
            padding:         '0.375rem 0.75rem',
            fontSize:        '0.75rem',
            border:          'none',
            cursor:          'pointer',
          }}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        {/* Heading */}
        <h1
          className="text-2xl font-semibold mb-5"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--cd-text)' }}
        >
          Almost there
        </h1>

        {/* Order summary */}
        <div
          className="rounded-2xl p-4 mb-5"
          style={{ backgroundColor: 'var(--cd-surface-2)' }}
        >
          <span style={labelStyle}>Order Summary</span>
          {cart.map(item => (
            <div key={item.menu_id} className="flex justify-between items-center py-1">
              <span className="text-sm" style={{ color: 'var(--cd-text)' }}>
                {item.quantity}× {item.menu_name}
              </span>
              <span className="text-sm font-medium" style={{ color: 'var(--cd-amber)' }}>
                GH₵ {(item.menu_price * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid var(--cd-border)', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold" style={{ color: 'var(--cd-text)' }}>Total</span>
              <span className="text-sm font-bold" style={{ color: 'var(--cd-amber)' }}>
                GH₵ {total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Full name */}
        <div className="mb-4">
          <label style={labelStyle}>Full Name</label>
          <input
            type="text"
            placeholder="e.g. Kwame Mensah"
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Receipt channel toggle */}
        <div className="mb-4">
          <label style={labelStyle}>Send my receipt via</label>
          <div className="grid grid-cols-2 gap-2">
            {(['whatsapp', 'email'] as const).map(ch => {
              const active = receiptChannel === ch;
              return (
                <button
                  key={ch}
                  onClick={() => setReceiptChannel(ch)}
                  style={{
                    backgroundColor: active
                      ? ch === 'whatsapp' ? '#25D366' : 'var(--cd-amber)'
                      : 'var(--cd-surface-2)',
                    color:           active
                      ? ch === 'whatsapp' ? '#fff' : '#0D1B0D'
                      : 'var(--cd-muted)',
                    border:          'none',
                    borderRadius:    '0.75rem',
                    padding:         '0.625rem',
                    fontSize:        '0.875rem',
                    fontWeight:      active ? 600 : 400,
                    cursor:          'pointer',
                    transition:      'all 0.15s',
                  }}
                >
                  {ch === 'whatsapp' ? 'WhatsApp' : 'Email'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Conditional contact field */}
        <div className="mb-4 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            {receiptChannel === 'whatsapp' ? (
              <motion.div
                key="whatsapp"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
              >
                <label style={labelStyle}>WhatsApp Number</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span
                    style={{
                      position:        'absolute',
                      left:            '1rem',
                      color:           'var(--cd-muted)',
                      fontSize:        '0.875rem',
                      pointerEvents:   'none',
                      whiteSpace:      'nowrap',
                    }}
                  >
                    🇬🇭 +233
                  </span>
                  <input
                    type="tel"
                    placeholder="024 000 0000"
                    value={customerWhatsapp}
                    onChange={e => setCustomerWhatsapp(e.target.value)}
                    style={{ ...inputStyle, paddingLeft: '5.5rem' }}
                  />
                </div>
                <p style={{ fontSize: '0.7rem', color: 'var(--cd-muted)', marginTop: '0.35rem' }}>
                  You'll receive a tap-to-save receipt on WhatsApp.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="email"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
              >
                <label style={labelStyle}>Email Address</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={customerEmail}
                  onChange={e => setCustomerEmail(e.target.value)}
                  style={inputStyle}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Error pill */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="text-sm text-center mb-4"
              style={{
                backgroundColor: 'rgba(220,38,38,0.15)',
                color:           '#FCA5A5',
                borderRadius:    '9999px',
                padding:         '0.5rem 1rem',
              }}
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Pay button */}
        <button
          onClick={handleSubmit}
          disabled={!isReady || submitting}
          style={{
            width:           '100%',
            backgroundColor: isReady && !submitting ? 'var(--cd-amber)' : 'var(--cd-surface-2)',
            color:           isReady && !submitting ? '#0D1B0D'          : 'var(--cd-muted)',
            border:          'none',
            borderRadius:    '0.75rem',
            padding:         '0.875rem',
            fontSize:        '0.9rem',
            fontWeight:      600,
            cursor:          isReady && !submitting ? 'pointer' : 'not-allowed',
            transition:      'all 0.2s',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            gap:             '0.5rem',
          }}
        >
          {submitting ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Connecting to Paystack…
            </>
          ) : (
            <>🔒 Pay Securely with Paystack</>
          )}
        </button>

        {/* Trust footer */}
        <p className="text-center mt-3" style={{ fontSize: '0.65rem', color: 'var(--cd-muted)' }}>
          🔒 encrypted &amp; safe · Paystack · GHS
        </p>

      </div>
    </div>
  );
}
