import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

/** Porty dev-serwera (Metro / Expo) - nigdy nie używamy ich jako portu API. */
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

/** hostUri bywa `192.168.1.2:8081` albo `http://localhost:8081` - nie używamy `split(':')`. */
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
 * Bazowy URL API - zawsze absolutny (unikamy żądań względnych do Metro :8081).
 * Ustaw EXPO_PUBLIC_API_URL (np. http://192.168.0.10:3000) na urządzeniu fizycznym / emulatorze,
 * gdy API nie jest na tym samym hoście co bundler.
 *
 * W przeglądarce najpierw bierzemy host strony (localhost / 127.0.0.1), żeby jedna wartość
 * EXPO_PUBLIC_API_URL pod telefon nie psuła logowania na komputerze.
 */
function resolveApiBaseUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const h = window.location?.hostname;
    if (h) {
      return ensureApiBaseNotOnMetroPort(`http://${h}:3000`);
    }
  }

  const raw =
    typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL
      ? String(process.env.EXPO_PUBLIC_API_URL).trim()
      : '';
  if (raw) {
    return ensureApiBaseNotOnMetroPort(raw);
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

/** Rozwiązywane przy każdym żądaniu - na webie host strony może być dostępny dopiero po hydracji. */
function getApiBaseUrl(): string {
  return resolveApiBaseUrl();
}

export function isAuthApiError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error ?? '');
  return /401|403|Unauthorized|Forbidden/i.test(msg);
}

export async function getStoredAuthToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem('userToken');
    }
    return await SecureStore.getItemAsync('userToken');
  } catch {
    return null;
  }
}

const fetchApi = async (endpoint: string, options?: RequestInit) => {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${getApiBaseUrl().replace(/\/$/, '')}${path}`;

  if (!/^https?:\/\//i.test(url)) {
    throw new Error(`Nieprawidłowy adres API: ${url}`);
  }

  const token = await getStoredAuthToken();

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...((options?.headers as Record<string, string>) || {}),
  };

  if (options?.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

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
  },
  loginGoogle: async (idToken: string) => {
    return fetchApi('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    });
  },
};

export const usersAPI = {
  updateRole: async (role: string) => {
    return fetchApi('/users/me/role', {
      method: 'PATCH',
      body: JSON.stringify({ role })
    });
  },
  updateFcmToken: async (fcmToken: string, nativePushToken?: string) => {
    return fetchApi('/users/me/fcm-token', {
      method: 'PATCH',
      body: JSON.stringify({ fcmToken, nativePushToken }),
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
  updateMood: async (mood: string) => {
    return fetchApi('/users/me/mood', {
      method: 'PATCH',
      body: JSON.stringify({ mood }),
    });
  },
  updateSettings: async (settings: any) => {
    return fetchApi('/users/me/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
  },
  updateDependentSettings: async (dependentId: string, settings: Record<string, unknown>) => {
    return fetchApi(`/users/${dependentId}/settings`, {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
  },
  getMoodHistory: async (userId: string, from: string, to: string) => {
    const params = new URLSearchParams({ from, to }).toString();
    try {
      return await fetchApi(`/users/${userId}/moods?${params}`);
    } catch {
      return {
        range: { from, to },
        items: [],
        histogram: {},
      };
    }
  },
  createSos: async (note?: string) => {
    return fetchApi('/users/me/sos', {
      method: 'POST',
      body: JSON.stringify({ note: note ?? '' }),
    });
  },
  listSos: async (userId: string, from: string, to: string) => {
    const params = new URLSearchParams({ from, to }).toString();
    return fetchApi(`/users/${userId}/sos?${params}`);
  },
  createMetric: async (body: any) => {
    return fetchApi('/users/me/metrics', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
  listMetrics: async (userId: string, from: string, to: string, type?: string) => {
    const params = new URLSearchParams({ from, to, ...(type ? { type } : {}) }).toString();
    return fetchApi(`/users/${userId}/metrics?${params}`);
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
  getById: async (id: string) => {
    return fetchApi(`/inventory/${id}`);
  },
  getDepletion: async (inventoryId: string) => {
    try {
      const data = await fetchApi(`/inventory/${inventoryId}/depletion`);
      return data;
    } catch (error) {
      console.warn('Error fetching depletion', error);
      return null;
    }
  },
  create: async (userId: string, data: any) => {
    return fetchApi(`/inventory/${userId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  remove: async (id: string) => {
    return fetchApi(`/inventory/${id}`, {
      method: 'DELETE',
    });
  },
  update: async (id: string, data: any) => {
    return fetchApi(`/inventory/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};

export const scheduleAPI = {
  getSchedules: async (userId: string) => {
    try {
      const data = await fetchApi(`/schedules/user/${userId}`);
      return data;
    } catch (error) {
      console.warn('Error fetching schedules', error);
      return [];
    }
  },
  create: async (userId: string, data: any) => {
    return fetchApi(`/schedules/${userId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  remove: async (id: string) => {
    return fetchApi(`/schedules/${id}`, {
      method: 'DELETE',
    });
  },
  update: async (id: string, data: any) => {
    return fetchApi(`/schedules/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  markTaken: async (scheduleId: string) => {
    return fetchApi(`/schedules/logs/${scheduleId}/mark`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'TAKEN' })
    });
  },
  markMissed: async (scheduleId: string) => {
    return fetchApi(`/schedules/logs/${scheduleId}/mark`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'MISSED' })
    });
  },
  getTodayLogs: async (userId: string, dateYmd?: string) => {
    try {
      const q =
        dateYmd && /^\d{4}-\d{2}-\d{2}$/.test(dateYmd)
          ? `?date=${encodeURIComponent(dateYmd)}`
          : '';
      return await fetchApi(`/schedules/user/${userId}/logs${q}`);
    } catch {
      return [];
    }
  },
  getStats: async (userId: string, from: string, to: string) => {
    const params = new URLSearchParams({ from, to }).toString();
    try {
      return await fetchApi(`/schedules/user/${userId}/stats?${params}`);
    } catch {
      return {
        range: { from, to },
        counts: { taken: 0, late: 0, missed: 0, pending: 0, totalPlanned: 0, adherencePercent: 0 },
        daily: [],
        onTime: { takenOnTime: 0, percentOfTaken: 0, windowMinutes: 5 },
      };
    }
  },
};
