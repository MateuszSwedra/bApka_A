import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { isAuthApiError, usersAPI } from '../services/api';
import {
  getStoredToken,
  getStoredRole,
  persistSession,
  clearSessionStorage,
} from '../services/sessionStorage';
import { syncPushTokenWithBackend, clearPushTokenFromBackend } from '../services/registerPushToken';
import { isGoogleAuthPending } from '../utils/googleWebRedirect';

type Role = 'CARETAKER' | 'DEPENDENT' | 'HYBRID' | null;

type LogoutOptions = {
  skipPushClear?: boolean;
};

interface AuthContextType {
  userRole: Role;
  loginFake: (role: Role) => void;
  logout: (options?: LogoutOptions) => Promise<void>;
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
          if (me?.roleSelected === false) {
            await persistSession(token, null);
            setUserRole(null);
          } else {
            const role = (me?.role as Role) ?? (storedRole as Role) ?? null;
            if (role) {
              await persistSession(token, role);
              setUserRole(role);
              void syncPushTokenWithBackend();
            }
          }
        } catch (e) {
          if (isAuthApiError(e) && !isGoogleAuthPending()) {
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
      await persistSession(token, role);
      setUserRole(role);
      try {
        await clearPushTokenFromBackend();
      } catch {
      }
      void syncPushTokenWithBackend();
    } catch (e) {
      console.warn('Could not store session', e);
    }
  };

  const loginFake = (role: Role) => {
    setUserRole(role);
  };

  const logout = async (options?: LogoutOptions) => {
    try {
      if (!options?.skipPushClear) {
        await clearPushTokenFromBackend();
      }
      await clearSessionStorage();
    } catch (e) {
      console.warn('Logout error', e);
      try {
        await clearSessionStorage();
      } catch {
      }
    }
    setUserRole(null);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.replace('/login');
      return;
    }
    router.replace('/login');
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
