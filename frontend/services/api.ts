import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

/** Porty dev-serwera (Metro / Expo) — nigdy nie używamy ich jako portu API. */
const METRO_LIKE_PORTS = new Set([
  '8081',
  '8082',
  '19000',
  '19001',
  '19002',
  '19006',
]);

function stripTrailingSlash(s: string): string {
  return s.replace(/\/$/, '');
}

/** hostUri bywa `192.168.1.2:8081` albo `http://localhost:8081` — nie używamy `split(':')`. */
function hostnameFromExpoHostUri(hostUri: string): string | null {
  const t = hostUri.trim();
  if (!t) return null;
  try {
    const withScheme = /^https?:\/\//i.test(t) ? t : `http://${t}`;
    const u = new URL(withScheme);
    return u.hostname || null;
  } catch {
    return null;
  }
}

/** Gdy ktoś wklei URL bundlera lub zły hostUri, nie wysyłamy API na port Metro. */
function ensureApiBaseNotOnMetroPort(base: string): string {
  const trimmed = stripTrailingSlash(base);
  try {
    const href = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
    const u = new URL(href);
    if (METRO_LIKE_PORTS.has(u.port)) {
      u.port = '3000';
    }
    const path =
      u.pathname && u.pathname !== '/'
        ? stripTrailingSlash(u.pathname)
        : '';
    return stripTrailingSlash(path ? `${u.origin}${path}` : u.origin);
  } catch {
    return trimmed;
  }
}

/**
 * Bazowy URL API — zawsze absolutny (unikamy żądań względnych do Metro :8081).
 * Ustaw EXPO_PUBLIC_API_URL (np. http://192.168.0.10:3000) gdy API nie jest na tym samym hoście co bundler.
 */
function resolveApiBaseUrl(): string {
  const raw =
    typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL
      ? String(process.env.EXPO_PUBLIC_API_URL).trim()
      : '';
  if (raw) {
    return ensureApiBaseNotOnMetroPort(raw);
  }

  /** W przeglądarce host strony jest wiarygodniejszy niż hostUri z manifestu. */
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const h = window.location?.hostname;
    if (h) {
      return ensureApiBaseNotOnMetroPort(`http://${h}:3000`);
    }
  }

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostnameFromExpoHostUri(hostUri);
    if (host) {
      return ensureApiBaseNotOnMetroPort(`http://${host}:3000`);
    }
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000';
  }

  return ensureApiBaseNotOnMetroPort('http://localhost:3000');
}

const API_URL = resolveApiBaseUrl();

const fetchApi = async (endpoint: string, options?: RequestInit) => {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_URL.replace(/\/$/, '')}${path}`;

  if (!/^https?:\/\//i.test(url)) {
    throw new Error(`Nieprawidłowy adres API: ${url}`);
  }

  let token = null;
  try {
    if (Platform.OS === 'web') {
      token = localStorage.getItem('userToken');
    } else {
      token = await SecureStore.getItemAsync('userToken');
    }
  } catch (e) {
    // secure store not available on web sometimes
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...((options?.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const text = await response.text();

  if (!response.ok) {
    let detail = `Serwer zwrócił błąd ${response.status}.`;
    if (text) {
      try {
        const body = JSON.parse(text) as {
          message?: string | string[];
          error?: string;
        };
        if (body.message) {
          detail = Array.isArray(body.message)
            ? body.message.join(', ')
            : String(body.message);
        } else if (body.error) {
          detail = String(body.error);
        }
      } catch {
        if (text.length < 200) {
          detail = text;
        }
      }
    }
    throw new Error(detail);
  }

  return text ? JSON.parse(text) : {};
};

export const authAPI = {
  login: async (data: any) => {
    return fetchApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  register: async (data: any) => {
    return fetchApi('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
};

export const usersAPI = {
  updateRole: async (role: string) => {
    return fetchApi('/users/me/role', {
      method: 'PATCH',
      body: JSON.stringify({ role })
    });
  },
  updateFcmToken: async (fcmToken: string) => {
    return fetchApi('/users/me/fcm-token', {
      method: 'PATCH',
      body: JSON.stringify({ fcmToken })
    });
  },
  generatePin: async () => {
    return fetchApi('/users/generate-pin', {
      method: 'POST'
    });
  },
  pairWithPin: async (pin: string) => {
    return fetchApi('/users/pair-with-pin', {
      method: 'POST',
      body: JSON.stringify({ pin })
    });
  },
  getDependents: async () => {
    return fetchApi('/users/me/dependents');
  },
  getMe: async () => {
    return fetchApi('/users/me');
  },
  updateDisplayName: async (name: string) => {
    const body = JSON.stringify({ name });
    const attempts: Array<{ method: 'PATCH' | 'POST'; path: string }> = [
      { method: 'PATCH', path: '/users/me/name' },
      { method: 'POST', path: '/users/me/name' },
      { method: 'POST', path: '/users/me/display-name' },
    ];
    let lastError: unknown;
    for (const { method, path } of attempts) {
      try {
        return await fetchApi(path, { method, body });
      } catch (e) {
        lastError = e;
        const msg = e instanceof Error ? e.message : '';
        const looksLikeMissingRoute =
          /\b404\b/.test(msg) ||
          /\b405\b/.test(msg) ||
          /Cannot\s+PATCH\b/i.test(msg) ||
          /Cannot\s+POST\b/i.test(msg) ||
          /\bNot Found\b/i.test(msg);
        if (!looksLikeMissingRoute) {
          throw e;
        }
      }
    }
    throw lastError;
  },
};

export const inventoryAPI = {
  getInventory: async (userId: string) => {
    try {
      const data = await fetchApi(`/inventory/user/${userId}`);
      return data;
    } catch (error) {
      console.warn('Error fetching inventory', error);
      return [];
    }
  },
  getDepletion: async (inventoryId: string) => {
    try {
      const data = await fetchApi(`/inventory/${inventoryId}/depletion`);
      return data;
    } catch (error) {
      console.warn('Error fetching depletion', error);
      return null;
    }
  }
};

export const scheduleAPI = {
  getSchedules: async (userId: string) => {
    // Zostanie podpięte pod dedykowany kontroler Schedules w przyszłości
    return [];
  },
  markTaken: async (scheduleId: string) => {
    // Zostanie podpięte pod DoseLog
    return { success: true };
  }
};
