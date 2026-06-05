import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';

type GoogleExtra = {
  googleWebClientId?: string;
  googleAndroidClientId?: string;
};

function readExtra(): GoogleExtra {
  return (Constants.expoConfig?.extra ?? {}) as GoogleExtra;
}

function fromEnv(key: string): string {
  const v = process.env[key];
  return typeof v === 'string' ? v.trim() : '';
}

/** Web client ID — logowanie w przeglądarce + id_token na Androidzie. */
export function getGoogleWebClientId(): string {
  return fromEnv('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID') || readExtra().googleWebClientId || '';
}

export function getGoogleAndroidClientId(): string {
  return fromEnv('EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID') || readExtra().googleAndroidClientId || '';
}

/** Redirect URI do wpisania w Google Cloud (Web client → Authorized redirect URIs). */
export function getGoogleRedirectUri(): string {
  return AuthSession.makeRedirectUri({
    scheme: 'bapka',
    path: 'login',
  });
}

/** Web: wystarczy Web client ID. Android: Web + Android client ID. iOS: wyłączone. */
export function isGoogleSignInConfigured(): boolean {
  const webId = getGoogleWebClientId();
  if (Platform.OS === 'web') {
    return Boolean(webId);
  }
  if (Platform.OS === 'android') {
    return Boolean(webId && getGoogleAndroidClientId());
  }
  return false;
}

export const GOOGLE_ANDROID_PACKAGE = 'com.bapka.app';

/** Origins do Google Cloud → Web client → Authorized JavaScript origins. */
export const GOOGLE_WEB_DEV_ORIGINS = [
  'http://localhost:8081',
  'http://127.0.0.1:8081',
  'http://localhost:19006',
  'http://127.0.0.1:19006',
] as const;
