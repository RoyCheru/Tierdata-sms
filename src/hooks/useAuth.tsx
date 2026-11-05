import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { authApi, type OtpRequestResult } from "@/api/auth";
import { getSessionId, setSessionExpiresIn, setSessionId, setUnauthorizedHandler } from "@/lib/http";
import type { CurrentUser } from "@/types/entities";

interface AuthContextValue {
  user: CurrentUser | null;
  initializing: boolean;
  requestOtp: (identifier: string) => Promise<OtpRequestResult>;
  verifyOtp: (identifier: string, code: string) => Promise<void>;
  extendSession: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  const clearSession = useCallback(() => {
    setSessionId(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(clearSession);
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  useEffect(() => {
    const existing = getSessionId();
    if (!existing) {
      setInitializing(false);
      return;
    }
    authApi
      .session()
      .then((current) => {
        setSessionExpiresIn(current.expiresInSeconds);
        setUser(current);
      })
      .catch(() => clearSession())
      .finally(() => setInitializing(false));
  }, [clearSession]);

  const requestOtp = useCallback((identifier: string) => authApi.requestOtp(identifier), []);

  const verifyOtp = useCallback(async (identifier: string, code: string) => {
    const session = await authApi.verifyOtp(identifier, code);
    setSessionId(session.sessionId);
    setSessionExpiresIn(session.expiresInSeconds);
    const currentUser = await authApi.session();
    setUser(currentUser);
  }, []);

  const extendSession = useCallback(async () => {
    const result = await authApi.extendSession();
    setSessionExpiresIn(result.expiresInSeconds);
  }, []);

  const logout = useCallback(async () => {
    const sessionId = getSessionId();
    try {
      if (sessionId) await authApi.logout(sessionId);
    } finally {
      clearSession();
    }
  }, [clearSession]);

  return (
    <AuthContext.Provider value={{ user, initializing, requestOtp, verifyOtp, extendSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
