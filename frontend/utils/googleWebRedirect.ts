import { Platform } from 'react-native';

const LOCK_KEY = 'bapka_google_id_token_lock';

/**
 * Po pełnym redirectcie Google (_self) Expo AuthSession gubi `state` (nowy mount).
 * Backend weryfikuje id_token — tu wyciągamy token z URL (raz) i czyścimy hash.
 */
export function consumeGoogleIdTokenFromUrl(): string | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;

  try {
    const href = window.location.href;
    if (!href.includes('id_token') && !href.includes('error=')) return null;

    const hash = window.location.hash?.replace(/^#/, '') ?? '';
    const search = window.location.search?.replace(/^\?/, '') ?? '';
    const params = new URLSearchParams(hash || search);

    const error = params.get('error');
    if (error) {
      cleanAuthParamsFromUrl();
      sessionStorage.removeItem(LOCK_KEY);
      return null;
    }

    const idToken = params.get('id_token')?.trim();
    if (!idToken) return null;

    // Zapobiega podwójnemu loginowi (root handler + przycisk / React Strict Mode).
    const existing = sessionStorage.getItem(LOCK_KEY);
    if (existing === idToken) {
      cleanAuthParamsFromUrl();
      return null;
    }
    sessionStorage.setItem(LOCK_KEY, idToken);
    cleanAuthParamsFromUrl();
    return idToken;
  } catch {
    return null;
  }
}

export function clearGoogleIdTokenLock() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(LOCK_KEY);
  } catch {
    /* ignore */
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
    /* ignore */
  }
}
