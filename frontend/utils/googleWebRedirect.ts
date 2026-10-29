import { Platform } from 'react-native';

const PENDING_KEY = 'bapka_google_auth_pending';
const TOKEN_KEY = 'bapka_google_id_token';

function canUseSession(): boolean {
  return Platform.OS === 'web' && typeof window !== 'undefined' && typeof sessionStorage !== 'undefined';
}

export function isGoogleAuthPending(): boolean {
  if (!canUseSession()) return false;
  try {
    if (sessionStorage.getItem(PENDING_KEY) === '1') return true;
    if (sessionStorage.getItem(TOKEN_KEY)) return true;
    return window.location.href.includes('id_token');
  } catch {
    return false;
  }
}

export function captureGoogleRedirectSync(): void {
  if (!canUseSession()) return;
  try {
    const href = window.location.href;
    if (!href.includes('id_token') && !href.includes('error=')) return;

    sessionStorage.setItem(PENDING_KEY, '1');

    const hash = window.location.hash?.replace(/^#/, '') ?? '';
    const search = window.location.search?.replace(/^\?/, '') ?? '';
    const params = new URLSearchParams(hash || search);

    if (params.get('error')) {
      cleanAuthParamsFromUrl();
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(PENDING_KEY);
      return;
    }

    const idToken = params.get('id_token')?.trim();
    cleanAuthParamsFromUrl();
    if (!idToken) {
      sessionStorage.removeItem(PENDING_KEY);
      return;
    }

    sessionStorage.setItem(TOKEN_KEY, idToken);
  } catch {
  }
}

export function takeCapturedGoogleIdToken(): string | null {
  if (!canUseSession()) return null;
  try {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (token) sessionStorage.removeItem(TOKEN_KEY);
    return token;
  } catch {
    return null;
  }
}

export function clearGoogleAuthPending(): void {
  if (!canUseSession()) return;
  try {
    sessionStorage.removeItem(PENDING_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
  }
}

function cleanAuthParamsFromUrl() {
  try {
    const url = new URL(window.location.href);
    url.hash = '';
    ['id_token', 'access_token', 'state', 'error', 'error_description', 'session_state', 'prompt'].forEach(
      (k) => url.searchParams.delete(k),
    );
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}`);
  } catch {
  }
}
