import React, { createContext, useContext, useState, useEffect } from 'react';
import { usersAPI } from '../services/api';
import {
  getStoredToken,
  getStoredRole,
  persistSession,
  clearSessionStorage,
} from '../services/sessionStorage';

type Role = 'CARETAKER' | 'DEPENDENT' | 'HYBRID' | null;

interface AuthContextType {
  userRole: Role;
  loginFake: (role: Role) => void;
  logout: () => Promise<void>;
  setUserSession: (token: string, role: Role) => Promise<void>;
  isReady: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userRole, setUserRole] = useState<Role>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const token = await getStoredToken();
        if (!token) return;

        const storedRole = await getStoredRole();
        if (storedRole) {
          setUserRole(storedRole as Role);
        }

        try {
          const me = await usersAPI.getMe();
          const role = (me?.role as Role) ?? (storedRole as Role) ?? null;
          if (role) {
            await persistSession(token, role);
            setUserRole(role);
          }
        } catch {
          if (!storedRole) {
            await clearSessionStorage();
            setUserRole(null);
          }
        }
      } catch (e) {
        console.warn('Session restore failed', e);
      } finally {
        setIsReady(true);
      }
    };
    void restoreSession();
  }, []);

  const setUserSession = async (token: string, role: Role) => {
    try {
      const effectiveRole = role ?? ((await getStoredRole()) as Role);
      await persistSession(token, effectiveRole);
      setUserRole(role ?? effectiveRole ?? null);
    } catch (e) {
      console.warn('Could not store session', e);
    }
  };

  const loginFake = (role: Role) => {
    setUserRole(role);
  };

  const logout = async () => {
    try {
      await clearSessionStorage();
    } catch (e) {
      console.warn('Logout error', e);
    }
    setUserRole(null);
  };

  return (
    <AuthContext.Provider value={{ userRole, loginFake, logout, setUserSession, isReady }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
