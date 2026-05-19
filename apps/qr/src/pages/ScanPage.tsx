import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCart }    from '../contexts/CartContext';
import { useSession } from '../contexts/SessionContext';
import type { QRSession } from '../types';

type ScanState = 'loading' | 'error' | 'expired';

export default function ScanPage() {
  const { stableToken } = useParams<{ stableToken: string }>();
  const navigate        = useNavigate();
  const { setSession, session, isExpired, clearSession } = useSession();
  const { clearCart }   = useCart();

  const [scanState, setScanState] = useState<ScanState>('loading');
  const [errorMsg, setErrorMsg]   = useState('');

  useEffect(() => {
    if (!stableToken) {
      setScanState('error');
      setErrorMsg('Invalid QR code. Please scan the code on your table card.');
      return;
    }

    // If we already have a valid session for this same table, skip the API call
    if (session?.stable_token === stableToken && !isExpired()) {
      navigate(`/table/${stableToken}/menu`, { replace: true });
      return;
    }

    // New scan — clear any stale session + cart from a previous table visit
    clearSession();
    clearCart();

    fetch(`/api/table-sessions/by-table/${stableToken}`, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    })
      .then(async res => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message ?? `Table session failed (${res.status})`);
        }
        return res.json();
      })
      .then((data: {
        session_token: string;
        table_number:  string | number;
        location_id:   number;
        location_name: string;
        expires_at:    string;
      }) => {
        const qrSession: QRSession = {
          stable_token:  stableToken,
          session_token: data.session_token,
          table_number:  String(data.table_number),
          location_id:   data.location_id,
          location_name: data.location_name ?? 'Kaneshie',
          expires_at:    data.expires_at,
        };
        setSession(qrSession);
        navigate(`/table/${stableToken}/menu`, { replace: true });
      })
      .catch(err => {
        console.error('ScanPage:', err);
        setScanState('error');
        setErrorMsg(
          err.message?.includes('404') || err.message?.includes('Table')
            ? "This table isn't set up yet. Please ask a member of staff."
            : "Couldn't connect. Please check your signal and try again."
        );
      });
  }, [stableToken]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Loading state ──────────────────────────────────────────────────────
  if (scanState === 'loading') {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4"
        style={{ backgroundColor: 'var(--cd-bg)' }}
      >
        <p
          className="text-2xl font-semibold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--cd-amber)' }}
        >
          Cookers Delight
        </p>
        <div
          className="w-5 h-5 rounded-full animate-pulse"
          style={{ backgroundColor: 'var(--cd-amber)' }}
        />
        <p className="text-sm" style={{ color: 'var(--cd-muted)' }}>
          Setting up your table…
        </p>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-6"
      style={{ backgroundColor: 'var(--cd-bg)' }}
    >
      <p
        className="text-2xl font-semibold"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--cd-amber)' }}
      >
        Cookers Delight
      </p>
      <div
        className="rounded-2xl p-6 max-w-xs w-full"
        style={{ backgroundColor: 'var(--cd-surface)' }}
      >
        <p className="text-sm mb-1 font-semibold" style={{ color: 'var(--cd-text)' }}>
          Something went wrong
        </p>
        <p className="text-sm" style={{ color: 'var(--cd-muted)' }}>
          {errorMsg}
        </p>
      </div>
      <button
        onClick={() => { setScanState('loading'); setErrorMsg(''); }}
        className="px-6 py-3 rounded-full text-sm font-bold"
        style={{ backgroundColor: 'var(--cd-primary)', color: 'var(--cd-text)' }}
      >
        Try again
      </button>
    </div>
  );
}
