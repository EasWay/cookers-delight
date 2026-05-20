import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useSession } from '../contexts/SessionContext';

interface StatusData {
  status:          string;
  status_label:    string;
  status_subtitle: string;
  status_color:    string;
  first_item_name: string | null;
  terminal:        boolean;
}

const STEPS = ['Received', 'Preparing', 'Ready', 'Served'] as const;

function statusIcon(status: string): string {
  switch (status) {
    case 'preparing': return '🍳';
    case 'ready':     return '✅';
    case 'served':
    case 'completed': return '🎉';
    case 'cancelled': return '❌';
    default:          return '⏳';
  }
}

function stepIndex(status: string): number {
  switch (status) {
    case 'received':  return 0;
    case 'preparing': return 1;
    case 'ready':     return 2;
    case 'served':
    case 'completed': return 3;
    default:          return -1;
  }
}

export default function OrderTrackingPage() {
  const { stableToken }        = useParams<{ stableToken: string }>();
  const [searchParams]         = useSearchParams();
  const navigate               = useNavigate();
  const { session }            = useSession();

  const reference = useRef<string | null>(
    searchParams.get('ref') ?? sessionStorage.getItem('cd_qr_order_reference')
  );

  const [statusData,  setStatusData]  = useState<StatusData | null>(null);
  const [loading,     setLoading]     = useState(true);
  const intervalRef                   = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  async function poll() {
    if (!reference.current) return;
    try {
      const res  = await fetch(`/api/orders/${reference.current}/status`, {
        headers: { 'Accept': 'application/json' },
      });
      if (!res.ok) return;
      const data: StatusData = await res.json();
      setStatusData(data);
      setLoading(false);
      if (data.terminal) stopPolling();
    } catch {
      // non-fatal — keep polling
    }
  }

  useEffect(() => {
    if (!reference.current) {
      setLoading(false);
      return;
    }
    poll();
    intervalRef.current = setInterval(poll, 3000);
    return stopPolling;
  }, []); // eslint-disable-line

  const muted: React.CSSProperties    = { color: 'var(--cd-muted)' };
  const surfaceStyle: React.CSSProperties = {
    backgroundColor: 'var(--cd-surface-2)',
    borderRadius:    '1rem',
    padding:         '1rem',
    marginBottom:    '1.5rem',
  };

  // No reference — not arrived from checkout
  if (!loading && !reference.current) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
           style={{ backgroundColor: 'var(--cd-bg)' }}>
        <p className="text-4xl mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--cd-text)' }}>
          Cookers Delight
        </p>
        <p className="text-sm mb-6" style={muted}>
          Scan your QR code to place an order.
        </p>
        <button
          onClick={() => navigate(`/table/${stableToken}`)}
          style={{
            backgroundColor: 'var(--cd-surface)',
            color:           'var(--cd-text)',
            border:          '1px solid var(--cd-border)',
            borderRadius:    '0.75rem',
            padding:         '0.625rem 1.25rem',
            fontSize:        '0.875rem',
            cursor:          'pointer',
          }}
        >
          Back to scan
        </button>
      </div>
    );
  }

  const currentStep = statusData ? stepIndex(statusData.status) : -1;
  const isTerminal  = statusData?.terminal ?? false;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--cd-bg)' }}>
      <div className="max-w-md mx-auto px-5 py-10">

        {/* Wordmark */}
        <p
          className="text-center mb-6"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--cd-muted)', fontSize: '1rem', letterSpacing: '0.04em' }}
        >
          Cookers Delight
        </p>

        {/* Context strip */}
        <div style={surfaceStyle}>
          <div className="flex justify-between items-start">
            <div>
              <p style={{ ...muted, fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Table
              </p>
              <p className="text-lg font-semibold" style={{ color: 'var(--cd-text)', fontFamily: 'var(--font-display)' }}>
                {session?.table_number ?? '—'}
              </p>
              <p style={{ ...muted, fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {session?.location_name ?? ''}
              </p>
            </div>
            {reference.current && (
              <div className="text-right">
                <p style={{ ...muted, fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Order #
                </p>
                <p style={{ color: 'var(--cd-text)', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                  {reference.current.slice(-8).toUpperCase()}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Status area */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-5xl mb-4">⏳</p>
            <p style={{ ...muted, fontSize: '0.875rem' }}>Checking payment…</p>
          </div>
        ) : statusData ? (
          <>
            {/* Icon */}
            <div className="text-center mb-4">
              <span style={{ fontSize: '3.5rem', lineHeight: 1 }}>
                {statusIcon(statusData.status)}
              </span>
            </div>

            {/* Label */}
            <h1
              className="text-center text-2xl font-semibold mb-2"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--cd-text)' }}
            >
              {statusData.status_label}
            </h1>

            {/* Subtitle */}
            {statusData.status_subtitle && (
              <p className="text-center text-sm mb-6" style={muted}>
                {statusData.status_subtitle}
              </p>
            )}

            {/* Color dot */}
            <div className="flex justify-center mb-8">
              <span style={{
                display:         'inline-block',
                width:           '10px',
                height:          '10px',
                borderRadius:    '50%',
                backgroundColor: statusData.status_color,
              }} />
            </div>

            {/* Progress steps */}
            {!isTerminal && (
              <div className="flex items-center justify-between mb-8">
                {STEPS.map((step, idx) => {
                  const done    = currentStep >= idx;
                  const current = currentStep === idx;
                  return (
                    <React.Fragment key={step}>
                      <div className="flex flex-col items-center gap-1">
                        <div style={{
                          width:           '28px',
                          height:          '28px',
                          borderRadius:    '50%',
                          backgroundColor: done ? 'var(--cd-amber)' : 'var(--cd-surface-2)',
                          border:          current ? '2px solid var(--cd-amber)' : '2px solid transparent',
                          display:         'flex',
                          alignItems:      'center',
                          justifyContent:  'center',
                          fontSize:        '0.6rem',
                          color:           done ? '#0D1B0D' : 'var(--cd-muted)',
                          fontWeight:      done ? 700 : 400,
                        }}>
                          {done ? '✓' : String(idx + 1)}
                        </div>
                        <span style={{
                          fontSize:  '0.5rem',
                          color:     done ? 'var(--cd-amber)' : 'var(--cd-muted)',
                          textAlign: 'center',
                          maxWidth:  '48px',
                        }}>
                          {step}
                        </span>
                      </div>
                      {idx < STEPS.length - 1 && (
                        <div style={{
                          flex:            1,
                          height:          '2px',
                          backgroundColor: currentStep > idx ? 'var(--cd-amber)' : 'var(--cd-surface-2)',
                          marginBottom:    '1rem',
                        }} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}

            {/* "Ready" green card */}
            {statusData.status === 'ready' && (
              <div style={{
                border:          '1px solid #16A34A',
                borderRadius:    '1rem',
                padding:         '1rem',
                backgroundColor: 'rgba(22,163,74,0.08)',
                textAlign:       'center',
                marginBottom:    '1.5rem',
              }}>
                <p style={{ color: '#4ADE80', fontSize: '0.875rem', fontWeight: 600 }}>
                  Your order is ready at the kitchen!
                </p>
              </div>
            )}

            {/* Back to menu */}
            {!isTerminal && (
              <div className="text-center">
                <button
                  onClick={() => navigate(`/table/${stableToken}/menu`)}
                  style={{
                    backgroundColor: 'transparent',
                    color:           'var(--cd-muted)',
                    border:          '1px solid var(--cd-border)',
                    borderRadius:    '0.75rem',
                    padding:         '0.5rem 1.25rem',
                    fontSize:        '0.8rem',
                    cursor:          'pointer',
                  }}
                >
                  Back to menu
                </button>
              </div>
            )}
          </>
        ) : null}

      </div>
    </div>
  );
}
