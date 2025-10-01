import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useData } from './data-context';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  loginUser: (credentials: { username: string; password: string }) => Promise<void>;
  loginAdmin: (password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { users } = useData();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!user) return;
    const updated = users.find((candidate) => candidate.id === user.id);
    if (updated && updated !== user) {
      setUser(updated);
    }
  }, [users, user]);

  const loginUser: AuthContextValue['loginUser'] = async ({ username, password }) => {
    const found = users.find(
      (u) => u.role === 'user' && u.username === username && u.password === password
    );
    if (!found) {
      throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.');
    }
    setUser(found);
  };

  const loginAdmin: AuthContextValue['loginAdmin'] = async (password) => {
    const found = users.find((u) => u.role === 'admin' && u.password === password);
    if (!found) {
      throw new Error('관리자 비밀번호가 올바르지 않습니다.');
    }
    setUser(found);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loginUser,
      loginAdmin,
      logout: () => setUser(null)
    }),
    [user]
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
