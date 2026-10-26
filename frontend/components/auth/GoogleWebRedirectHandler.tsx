import { useEffect, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import {
  clearGoogleIdTokenLock,
  consumeGoogleIdTokenFromUrl,
} from '../../utils/googleWebRedirect';

/**
 * Google wraca na origin (http://localhost:8081/), nie na /login.
 * Jedyne miejsce, które zjada id_token z URL po full-page redirect.
 */
export function GoogleWebRedirectHandler() {
  const { setUserSession, isReady } = useAuth();
  const started = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || !isReady || started.current) return;

    const idToken = consumeGoogleIdTokenFromUrl();
    if (!idToken) return;
    started.current = true;

    void (async () => {
      try {
        const response = await authAPI.loginGoogle(idToken);
        const { finishAuthSession } = await import('../../services/finishAuthSession');
        await finishAuthSession({
          accessToken: response.access_token,
          user: response.user ?? {},
          setUserSession,
          resetTours: response.isNewUser === true || response.user?.roleSelected === false,
        });
      } catch (e) {
        clearGoogleIdTokenLock();
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
