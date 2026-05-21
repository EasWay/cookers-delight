import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from './AdminAuthContext';
import { inputClass } from './components/ui';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS   = 5 * 60 * 1000;

export default function AdminLogin() {
  const { login, loading, token } = useAdminAuth();
  const navigate                  = useNavigate();
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [error, setError]         = useState('');

  useEffect(() => {
    if (token) navigate('/admin/dashboard', { replace: true });
  }, [token, navigate]);

  const failCount   = useRef(0);
  const lockedUntil = useRef<number>(0);

  const isLocked = () => Date.now() < lockedUntil.current;
  const lockoutSecondsRemaining = () =>
    Math.ceil((lockedUntil.current - Date.now()) / 1000);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isLocked()) {
      setError(`Too many failed attempts. Please wait ${lockoutSecondsRemaining()} seconds.`);
      return;
    }

    try {
      await login(email, password);
      failCount.current = 0;
      navigate('/admin/dashboard', { replace: true });
    } catch (err: unknown) {
      failCount.current += 1;
      if (failCount.current >= MAX_ATTEMPTS) {
        lockedUntil.current = Date.now() + LOCKOUT_MS;
        failCount.current   = 0;
        setError(`Too many failed attempts. Login disabled for ${LOCKOUT_MS / 60000} minutes.`);
      } else {
        const remaining = MAX_ATTEMPTS - failCount.current;
        const msg = err instanceof Error ? err.message : 'Invalid email or password.';
        setError(`${msg} (${remaining} attempt${remaining !== 1 ? 's' : ''} remaining before lockout)`);
      }
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: '#FFFBF7', fontFamily: 'Syne, system-ui, sans-serif' }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{
              background: 'linear-gradient(135deg, #EC4824, #d4401f)',
              boxShadow: '0 8px 24px rgba(236,72,36,0.25)',
            }}
          >
            <span className="text-2xl text-white font-black">CD</span>
          </div>
          <h1 className="text-2xl font-black text-[#1C1917]">
            Cookers<span className="text-[#EC4824]">Delight</span>
          </h1>
          <p className="text-xs text-[#A8A29E] mt-1 uppercase tracking-widest font-bold">
            Admin Console
          </p>
        </div>

        {/* Card */}
        <div
          className="bg-white rounded-2xl p-6 space-y-5"
          style={{
            border: '1px solid #EDE8E3',
            boxShadow: '0 4px 20px rgba(28,25,23,0.08), 0 1px 4px rgba(28,25,23,0.06)',
          }}
        >
          <div>
            <h2 className="text-lg font-bold text-[#1C1917]">Welcome back</h2>
            <p className="text-sm text-[#78716C] mt-0.5">Sign in to your admin panel</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#78716C] uppercase tracking-widest">
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={inputClass}
                placeholder="admin@cookersdelight.com"
                autoComplete="username"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#78716C] uppercase tracking-widest">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={inputClass}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading || isLocked()}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all active:scale-[0.98] disabled:opacity-50"
              style={{
                backgroundColor: '#EC4824',
                boxShadow: '0 4px 12px rgba(236,72,36,0.3)',
              }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[#A8A29E] mt-6">
          Cookers Delight · Kaneshie, Opposite Cocoa Clinic
        </p>
      </div>
    </div>
  );
}
