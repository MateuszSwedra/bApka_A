import { InteractionManager, Platform } from 'react-native';
import { router } from 'expo-router';
import { getStoredRole } from './sessionStorage';

export type PushData = Record<string, unknown>;

function readType(data: PushData | undefined): string | null {
  const type = data?.type;
  return typeof type === 'string' ? type : null;
}

function readString(data: PushData, key: string): string | null {
  const value = data[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/** Nawigacja po kliknięciu / otrzymaniu pusha. */
export async function routeIncomingPush(data: PushData | undefined): Promise<void> {
  if (Platform.OS === 'web' || !data) return;

  const type = readType(data);
  if (!type) return;

  const role = await getStoredRole();
  const seniorHome = role === 'HYBRID' ? '/(hybrid)/(tabs)' : '/(dependent)';
  const dependentId = readString(data, 'dependentId');

  const go = () => {
    switch (type) {
      case 'mood_reminder':
      case 'med_reminder':
      case 'dose_missed':
        router.push(seniorHome as Parameters<typeof router.push>[0]);
        break;

      case 'inventory_low':
      case 'inventory_empty':
        if (role === 'HYBRID') {
          router.push('/(hybrid)/(tabs)/treatments' as Parameters<typeof router.push>[0]);
        } else if (role === 'DEPENDENT') {
          router.push(seniorHome as Parameters<typeof router.push>[0]);
        } else if (role === 'CARETAKER' && dependentId) {
          router.push(`/(caretaker)/dependent/${dependentId}/treatments` as Parameters<typeof router.push>[0]);
        }
        break;

      case 'dose_taken':
      case 'dose_missed_caretaker':
        if (role === 'CARETAKER' && dependentId) {
          router.push(`/(caretaker)/dependent/${dependentId}` as Parameters<typeof router.push>[0]);
        }
        break;

      case 'mood_update':
        if (role === 'CARETAKER' && dependentId) {
          router.push(`/(caretaker)/dependent/${dependentId}/insights` as Parameters<typeof router.push>[0]);
        }
        break;

      default:
        break;
    }
  };

  InteractionManager.runAfterInteractions(go);
}
