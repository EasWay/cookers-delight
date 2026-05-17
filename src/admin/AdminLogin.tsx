import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from './AdminAuthContext';

const MAX_ATTEMPTS  = 5;
const LOCKOUT_MS    = 5 * 60 * 1000; // 5 minutes

export default function AdminLogin() {
  const { login, loading, token } = useAdminAuth();
  const navigate                  = useNavigate();
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [error, setError]         = useState('');

  // If the user is already authenticated (token survived a reload), skip
  // the login form entirely.
  useEffect(() => {
    if (token) navigate('/admin/dashboard', { replace: true });
  }, [token, navigate]);

  // SECURITY: Track failed login attempts to prevent brute-force attacks.
  // After MAX_ATTEMPTS failures within LOCKOUT_MS the form is disabled.
  const failCount    = useRef(0);
  const lockedUntil  = useRef<number>(0);

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
      failCount.current = 0; // reset on success
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
    <div className="admin-panel min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <span className="text-3xl font-black tracking-tight">
            Cookers<span className="text-[#EC4824]">Delight</span>
          </span>
          <p className="text-white/30 text-sm mt-2 uppercase tracking-widest font-bold">Admin Panel</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-white/40 uppercase tracking-widest">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#EC4824] focus:outline-none transition-colors"
              placeholder="admin@cookersdelight.com"
              autoComplete="username"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-white/40 uppercase tracking-widest">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#EC4824] focus:outline-none transition-colors"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading || isLocked()}
            className="w-full bg-[#EC4824] text-white py-3.5 rounded-xl font-bold text-sm hover:bg-[#d4401f] disabled:opacity-50 transition-colors mt-2"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
