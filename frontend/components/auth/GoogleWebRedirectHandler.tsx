import { useEffect, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import {
  clearGoogleAuthPending,
  takeCapturedGoogleIdToken,
} from '../../utils/googleWebRedirect';

export function GoogleWebRedirectHandler() {
  const { setUserSession, isReady } = useAuth();
  const started = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || !isReady || started.current) return;

    const idToken = takeCapturedGoogleIdToken();
    if (!idToken) return;

    started.current = true;

    void (async () => {
      try {
        const response = await authAPI.loginGoogle(idToken);
        if (!response?.access_token) {
          throw new Error('Brak access_token z API');
        }
        const { finishAuthSession } = await import('../../services/finishAuthSession');
        await finishAuthSession({
          accessToken: response.access_token,
          user: response.user ?? {},
          setUserSession,
        });
      } catch (e) {
        clearGoogleAuthPending();
        started.current = false;
        const msg = e instanceof Error ? e.message : String(e);
        console.warn('Google web redirect login failed', e);
        if (typeof window !== 'undefined') {
          window.alert(`Logowanie Google nie powiodło się:\n${msg}`);
        } else {
          Alert.alert('Logowanie Google', msg);
        }
        router.replace('/login');
      }
    })();
  }, [isReady, setUserSession]);

  return null;
}
