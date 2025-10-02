import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useData } from './data-context';
import type { User } from '../types';
import { clearSession, loadSession, saveSession } from '../services/session-storage';

interface AuthContextValue {
  user: User | null;
  isReady: boolean;
  loginUser: (credentials: { username: string; password: string }) => Promise<void>;
  loginAdmin: (password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { users, isHydrated } = useData();
  const [user, setUser] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!isHydrated || isReady) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const session = await loadSession();
        if (!session || cancelled) {
          return;
        }
        const found = users.find((candidate) => candidate.id === session.userId);
        if (found) {
          setUser(found);
        } else {
          await clearSession();
        }
      } finally {
        if (!cancelled) {
          setIsReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isHydrated, isReady, users]);

  useEffect(() => {
    if (!user) {
      return;
    }
    const updated = users.find((candidate) => candidate.id === user.id);
    if (updated && updated !== user) {
      setUser(updated);
    }
    if (!updated) {
      setUser(null);
      void clearSession();
    }
  }, [users, user]);

  const loginUser = useCallback<AuthContextValue['loginUser']>(
    async ({ username, password }) => {
      const found = users.find(
        (u) => u.role === 'user' && u.username === username && u.password === password
      );
      if (!found) {
        throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.');
      }
      setUser(found);
      await saveSession({ userId: found.id });
      setIsReady(true);
    },
    [users]
  );

  const loginAdmin = useCallback<AuthContextValue['loginAdmin']>(
    async (password) => {
      const found = users.find((u) => u.role === 'admin' && u.password === password);
      if (!found) {
        throw new Error('관리자 비밀번호가 올바르지 않습니다.');
      }
      setUser(found);
      await saveSession({ userId: found.id });
      setIsReady(true);
    },
    [users]
  );

  const logout = useCallback<AuthContextValue['logout']>(async () => {
    await clearSession();
    setUser(null);
    setIsReady(true);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isReady,
      loginUser,
      loginAdmin,
      logout
    }),
    [user, isReady, loginUser, loginAdmin, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth는 AuthProvider 안에서 사용해야 합니다.');
  }
  return context;
}
