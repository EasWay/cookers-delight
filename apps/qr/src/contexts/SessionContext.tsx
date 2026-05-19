import React, {
  createContext, useCallback, useContext,
  useMemo, useState,
} from 'react';
import type { QRSession } from '../types';

const STORAGE_KEY = 'cd_qr_session_v1';

interface SessionContextValue {
  session:      QRSession | null;
  setSession:   (s: QRSession) => void;
  clearSession: () => void;
  isExpired:    () => boolean;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<QRSession | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as QRSession) : null;
    } catch {
      return null;
    }
  });

  const setSession = useCallback((s: QRSession) => {
    setSessionState(s);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* non-fatal */ }
  }, []);

  const clearSession = useCallback(() => {
    setSessionState(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* non-fatal */ }
  }, []);

  const isExpired = useCallback((): boolean => {
    if (!session?.expires_at) return true;
    return new Date(session.expires_at) < new Date();
  }, [session]);

  const value = useMemo<SessionContextValue>(
    () => ({ session, setSession, clearSession, isExpired }),
    [session, setSession, clearSession, isExpired]
  );

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}
