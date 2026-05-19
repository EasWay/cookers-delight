import React, { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

interface TrackingStatus {
  status: string;
  status_label: string;
  status_subtitle: string;
  status_color: string;
  first_item_name: string | null;
  customer_name?: string;
  order_number?: string;
  terminal: boolean;
}

const STEPS = [
  { key: 'received',  label: 'Received',  emoji: '📋' },
  { key: 'preparing', label: 'Preparing', emoji: '👨‍🍳' },
  { key: 'ready',     label: 'Ready',     emoji: '✅' },
  { key: 'done',      label: 'Done',      emoji: '🍽️' },
] as const;

const STATUS_ORDER = ['pending', 'received', 'preparing', 'ready', 'done', 'completed', 'served'];

export default function OrderTrackingPage() {
  const { reference } = useParams<{ reference: string }>();
  const [searchParams] = useSearchParams();
  const paymentFailed = searchParams.get('payment_status') === 'failed';

  const [tracking, setTracking] = useState<TrackingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connError, setConnError] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!reference) return;

    async function poll() {
      try {
        const res = await fetch(`/api/orders/${reference}/status`, {
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) return;
        setConnError(false);
        setErrorCount(0);
        const data: TrackingStatus = await res.json();
        setTracking(data);
        setLoading(false);
        if (data.terminal && intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } catch {
        setErrorCount(prev => {
          const next = prev + 1;
          if (next >= 3) setConnError(true);
          return next;
        });
      }
    }

    poll();
    intervalRef.current = setInterval(poll, 4000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [reference]);

  const currentIdx = STATUS_ORDER.indexOf(tracking?.status ?? 'pending');

  const isReady = tracking?.status === 'ready';

  return (
    <div
      className="min-h-screen px-4 py-8"
      style={{ backgroundColor: '#0D1B0D', fontFamily: 'Syne, system-ui, sans-serif' }}
    >
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1
            className="text-2xl font-bold mb-1"
            style={{ color: '#D97706', fontFamily: 'Cormorant Garamond, serif' }}
          >
            Cookers Delight
          </h1>
          <p
            className="text-[10px] uppercase tracking-widest"
            style={{ color: '#7A8F7A' }}
          >
            Live order tracking
          </p>
        </div>

        {/* Payment failed banner */}
        {paymentFailed && (
          <div className="bg-red-900/50 border border-red-500 text-red-300 rounded-xl p-4 text-sm text-center mb-4">
            Your payment was not completed. Your card was not charged.
          </div>
        )}

        {/* Loading state */}
        {loading && !paymentFailed && (
          <div className="flex justify-center items-center py-24">
            <div
              className="w-4 h-4 rounded-full animate-pulse"
              style={{ backgroundColor: '#D97706' }}
            />
          </div>
        )}

        {tracking && (
          <>
            {/* Info strip */}
            {(tracking.customer_name || tracking.order_number) && (
              <div
                className="rounded-2xl p-4 mb-4 grid grid-cols-3 gap-2 text-center"
                style={{ background: '#152415' }}
              >
                {tracking.customer_name && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: '#7A8F7A' }}>
                      Name
                    </p>
                    <p className="font-bold text-base" style={{ color: '#D97706' }}>
                      {tracking.customer_name.split(' ')[0]}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: '#7A8F7A' }}>
                    Location
                  </p>
                  <p className="font-bold text-base" style={{ color: '#D97706' }}>
                    Kaneshie
                  </p>
                </div>
                {tracking.order_number && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: '#7A8F7A' }}>
                      Order
                    </p>
                    <p className="font-bold text-base" style={{ color: '#D97706' }}>
                      #{tracking.order_number}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Order number card */}
            <div
              className="rounded-2xl p-5 mb-4 flex items-center justify-between"
              style={{ background: '#1B5E20', border: '1px solid #D97706' }}
            >
              <div>
                <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: '#7A8F7A' }}>
                  Order Number
                </p>
                <p className="text-4xl font-bold" style={{ color: '#fff' }}>
                  #{tracking.order_number ?? reference?.slice(-6).toUpperCase()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs mb-1" style={{ color: '#7A8F7A' }}>Show this to staff</p>
                <svg
                  width="28" height="28" viewBox="0 0 24 24" fill="none"
                  stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>

            {/* Live status card */}
            <div
              className="rounded-2xl p-8 text-center mb-6"
              style={{
                background: '#152415',
                border: isReady ? '2px solid #16A34A' : '2px solid transparent',
                transition: 'border-color 0.3s',
              }}
            >
              <div className="flex justify-center mb-4">
                <div
                  className={`w-4 h-4 rounded-full ${tracking.terminal ? '' : 'animate-pulse'}`}
                  style={{ backgroundColor: tracking.status_color || '#D97706' }}
                />
              </div>
              <p
                className="text-3xl font-semibold mb-2"
                style={{ color: '#F5F0E8', fontFamily: 'Cormorant Garamond, serif' }}
              >
                {tracking.status_label}
              </p>
              {isReady ? (
                <p className="text-sm font-semibold" style={{ color: '#4ADE80' }}>
                  Come in and show this screen at the counter.
                </p>
              ) : (
                <p className="text-sm" style={{ color: '#7A8F7A' }}>
                  {tracking.status_subtitle}
                </p>
              )}
            </div>

            {/* Progress steps */}
            <div className="relative mb-6">
              {/* Connector line */}
              <div
                className="absolute top-5 left-[12.5%] right-[12.5%] h-0.5"
                style={{ backgroundColor: '#152415', zIndex: 0 }}
              />
              <div className="flex justify-around relative" style={{ zIndex: 1 }}>
                {STEPS.map((step, idx) => {
                  const stepStatusIdx = STATUS_ORDER.indexOf(step.key);
                  const active = currentIdx >= stepStatusIdx;
                  return (
                    <div
                      key={step.key}
                      className="flex flex-col items-center gap-2"
                      style={{ opacity: active ? 1 : 0.3 }}
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                        style={{ backgroundColor: active ? '#1B5E20' : '#152415' }}
                      >
                        {step.emoji}
                      </div>
                      <span className="text-[10px] uppercase tracking-wide" style={{ color: '#7A8F7A' }}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Terminal message */}
            {tracking.terminal && (
              <p className="text-center text-sm mb-4" style={{ color: '#4ADE80' }}>
                Enjoy every bite 🎉
              </p>
            )}
          </>
        )}

        {/* Connection error */}
        {connError && (
          <p className="text-xs text-center mt-2" style={{ color: '#7A8F7A' }}>
            Connection lost — refresh the page to check your order.
          </p>
        )}

        {/* Footer */}
        <p
          className="text-xs text-center mt-4"
          style={{ color: '#7A8F7A', opacity: 0.5 }}
        >
          Updates arrive automatically — no refresh needed
        </p>
      </div>
    </div>
  );
}
