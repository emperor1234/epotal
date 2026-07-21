import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, ApiRequestError } from '../config/api';

const REFRESH_TOKEN_KEY = 'reachiq.refreshToken';

type User = { id: string; email: string };
type Wallet = { balance: number };

type Session = { accessToken: string; refreshToken: string; user: User };

type AuthContextValue = {
  user: User | null;
  accessToken: string | null;
  wallet: Wallet | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshWallet: () => Promise<void>;
  /** Runs an authenticated call, transparently retrying once after a token refresh on 401. */
  withAuth: <T>(fn: (accessToken: string) => Promise<T>) => Promise<T>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchWallet = useCallback(async (token: string) => {
    try {
      const { wallet: fetchedWallet } = await api.get<{ wallet: Wallet }>('/credits/wallet', token);
      setWallet(fetchedWallet);
    } catch {
      // Non-fatal — the UI just shows a blank credit pill until the next refresh.
    }
  }, []);

  const applySession = useCallback(
    async (session: Session) => {
      setUser(session.user);
      setAccessToken(session.accessToken);
      setRefreshToken(session.refreshToken);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, session.refreshToken);
      await fetchWallet(session.accessToken);
    },
    [fetchWallet],
  );

  const clearSession = useCallback(async () => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    setWallet(null);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  }, []);

  useEffect(() => {
    (async () => {
      const storedRefreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      if (!storedRefreshToken) {
        setLoading(false);
        return;
      }
      try {
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await api.post<{
          accessToken: string;
          refreshToken: string;
        }>('/auth/refresh', { refreshToken: storedRefreshToken });
        const me = await api.get<{ user: User }>('/me', newAccessToken);
        await applySession({ accessToken: newAccessToken, refreshToken: newRefreshToken, user: me.user });
      } catch {
        await clearSession();
      } finally {
        setLoading(false);
      }
    })();
  }, [applySession, clearSession]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const session = await api.post<Session>('/auth/sign-in', { email, password });
      await applySession(session);
    },
    [applySession],
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      const session = await api.post<Session>('/auth/sign-up', { email, password });
      await applySession(session);
    },
    [applySession],
  );

  const signOut = useCallback(async () => {
    if (refreshToken) {
      await api.post('/auth/sign-out', { refreshToken }).catch(() => undefined);
    }
    await clearSession();
  }, [refreshToken, clearSession]);

  const withAuth = useCallback(
    async <T,>(fn: (token: string) => Promise<T>): Promise<T> => {
      if (!accessToken) throw new ApiRequestError(401, 'Not signed in');
      try {
        return await fn(accessToken);
      } catch (err) {
        if (err instanceof ApiRequestError && err.status === 401 && refreshToken) {
          const refreshed = await api.post<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
            refreshToken,
          });
          setAccessToken(refreshed.accessToken);
          setRefreshToken(refreshed.refreshToken);
          await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshed.refreshToken);
          return fn(refreshed.accessToken);
        }
        throw err;
      }
    },
    [accessToken, refreshToken],
  );

  const refreshWallet = useCallback(async () => {
    if (!accessToken) return;
    await fetchWallet(accessToken);
  }, [accessToken, fetchWallet]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, accessToken, wallet, loading, signIn, signUp, signOut, refreshWallet, withAuth }),
    [user, accessToken, wallet, loading, signIn, signUp, signOut, refreshWallet, withAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
