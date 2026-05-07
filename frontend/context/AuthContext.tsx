import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { usersAPI } from '../services/api';
import { Platform } from 'react-native';

type Role = 'CARETAKER' | 'DEPENDENT' | 'HYBRID' | null;

interface AuthContextType {
  userRole: Role;
  loginFake: (role: Role) => void;
  logout: () => void;
  setUserSession: (token: string, role: Role) => Promise<void>;
  isReady: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userRole, setUserRole] = useState<Role>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const token = await SecureStore.getItemAsync('userToken');
        const roleStr = await SecureStore.getItemAsync('userRole');
        
        if (token && roleStr) {
          setUserRole(roleStr as Role);
          registerForPushNotificationsAsync();
        }
      } catch (e) {
        console.warn('Session restore failed', e);
      } finally {
        setIsReady(true);
      }
    };
    restoreSession();
  }, []);

  async function registerForPushNotificationsAsync() {
    let token;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        return;
      }
      try {
        token = (await Notifications.getExpoPushTokenAsync({
          projectId: 'bapka-anti-project-id' // dummy ID for expo go
        })).data;
        await usersAPI.updateFcmToken(token);
      } catch (e) {
        console.warn('Failed to get push token', e);
      }
    }
  }

  const setUserSession = async (token: string, role: Role) => {
    try {
      await SecureStore.setItemAsync('userToken', token);
      if (role) {
        await SecureStore.setItemAsync('userRole', role);
      }
      setUserRole(role);
      registerForPushNotificationsAsync();
    } catch (e) {
      console.warn('Could not store session', e);
    }
  };

  const loginFake = (role: Role) => {
    setUserRole(role);
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync('userToken');
      await SecureStore.deleteItemAsync('userRole');
    } catch (e) {}
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
