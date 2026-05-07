import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Use standard localhost for iOS/web, 10.0.2.2 for Android emulator
const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

const fetchApi = async (endpoint: string, options?: RequestInit) => {
  const url = `${API_URL}${endpoint}`;
  
  let token = null;
  try {
    token = await SecureStore.getItemAsync('userToken');
  } catch (e) {
    // secure store not available on web sometimes
  }
  
  const headers: any = {
    'Content-Type': 'application/json',
    ...options?.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  
  return response.json();
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
  pairDependent: async (dependentEmail: string) => {
    return fetchApi('/users/pair', {
      method: 'POST',
      body: JSON.stringify({ dependentEmail })
    });
  }
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
