import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function KitchenLoginPage() {
  const navigate      = useNavigate();
  const [pin, setPin] = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // On mount: if a PIN is already stored, verify it silently.
  useEffect(() => {
    const stored = localStorage.getItem('cd_kitchen_pin');
    if (!stored) {
      inputRef.current?.focus();
      return;
    }
    setLoading(true);
    fetch('/api/kitchen/orders', {
      headers: { 'X-Kitchen-Pin': stored, 'Accept': 'application/json' },
    })
      .then(res => {
        if (res.ok) {
          navigate('/kitchen/display', { replace: true });
        } else {
          localStorage.removeItem('cd_kitchen_pin');
          setLoading(false);
          inputRef.current?.focus();
        }
      })
      .catch(() => {
        localStorage.removeItem('cd_kitchen_pin');
        setLoading(false);
        inputRef.current?.focus();
      });
  }, []);

  async function handleSubmit() {
    if (!pin || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/kitchen/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) {
        localStorage.setItem('cd_kitchen_pin', pin);
        navigate('/kitchen/display', { replace: true });
      } else {
        setError('Incorrect PIN. Try again.');
        setPin('');
        inputRef.current?.focus();
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: 'var(--cd-bg)' }}
    >
      <div
        className="w-full max-w-xs rounded-2xl p-8 flex flex-col items-center gap-6"
        style={{ backgroundColor: 'var(--cd-surface)', border: '1px solid var(--cd-border)' }}
      >
        {/* Title */}
        <div className="text-center">
          <p
            className="text-3xl font-bold mb-1"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--cd-amber)' }}
          >
            🍽️ Kitchen Display
          </p>
          <p className="text-sm" style={{ color: 'var(--cd-muted)' }}>
            Cookers Delight
          </p>
        </div>

        {/* PIN input */}
        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="••••"
          disabled={loading}
          className="w-full rounded-xl px-4 py-3 text-center text-4xl tracking-[0.5em] outline-none"
          style={{
            backgroundColor: 'var(--cd-bg)',
            color: 'var(--cd-text)',
            border: '1px solid var(--cd-border)',
            fontFamily: 'var(--font-body)',
          }}
        />

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={!pin || loading}
          className="w-full rounded-xl py-3 font-semibold text-sm uppercase tracking-widest transition-opacity"
          style={{
            backgroundColor: pin && !loading ? 'var(--cd-amber)' : 'rgba(217,119,6,0.3)',
            color: pin && !loading ? '#0D1B0D' : 'var(--cd-muted)',
            cursor: pin && !loading ? 'pointer' : 'not-allowed',
          }}
        >
          {loading ? 'Checking…' : 'Enter Kitchen'}
        </button>

        {/* Error */}
        {error && (
          <p className="text-sm px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(220,38,38,0.15)', color: '#F87171' }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
