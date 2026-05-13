import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

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
        let token = null;
        let roleStr = null;
        if (Platform.OS === 'web') {
          token = localStorage.getItem('userToken');
          roleStr = localStorage.getItem('userRole');
        } else {
          token = await SecureStore.getItemAsync('userToken');
          roleStr = await SecureStore.getItemAsync('userRole');
        }
        
        if (token && roleStr) {
          setUserRole(roleStr as Role);
        }
      } catch (e) {
        console.warn('Session restore failed', e);
      } finally {
        setIsReady(true);
      }
    };
    restoreSession();
  }, []);

  const setUserSession = async (token: string, role: Role) => {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem('userToken', token);
        if (role) {
          localStorage.setItem('userRole', role);
        }
      } else {
        await SecureStore.setItemAsync('userToken', token);
        if (role) {
          await SecureStore.setItemAsync('userRole', role);
        }
      }
      setUserRole(role);
    } catch (e) {
      console.warn('Could not store session', e);
    }
  };

  const loginFake = (role: Role) => {
    setUserRole(role);
  };

  const logout = async () => {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem('userToken');
        localStorage.removeItem('userRole');
      } else {
        for (const key of ['userToken', 'userRole'] as const) {
          try {
            await SecureStore.deleteItemAsync(key);
          } catch {
            /* brak klucza lub błąd magazynu */
          }
        }
      }
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
