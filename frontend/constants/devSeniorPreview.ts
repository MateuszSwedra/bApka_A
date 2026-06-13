import { format } from 'date-fns';
import type { ScheduleItem, Treatment } from '../context/MedsContext';

/** Stały ID podglądu - bez wywołań API. */
export const DEV_PREVIEW_USER_ID = 'dev-senior-preview';

/**
 * Tryb podglądu panelu seniora bez backendu (mock danych).
 * Włącz opcję w .env: EXPO_PUBLIC_DEV_SENIOR_PREVIEW=true
 * Nadal wymaga „sztucznego” logowania przyciskiem na ekranie logowania.
 * Działa tylko w __DEV__ (nie trafi do produkcji).
 */
let manualPreviewActive = false;

/** Flaga z .env - pokazuje przycisk podglądu, nie loguje automatycznie. */
export function isDevSeniorPreview(): boolean {
  return (
    typeof __DEV__ !== 'undefined' &&
    __DEV__ &&
    String(process.env.EXPO_PUBLIC_DEV_SENIOR_PREVIEW ?? '').trim().toLowerCase() === 'true'
  );
}

/** Po kliknięciu „Zaloguj jako senior (podgląd)” na ekranie logowania. */
export function activateManualSeniorPreview(): void {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    manualPreviewActive = true;
  }
}

/** Aktywna sesja podglądu - mocki i pominięcie API. */
export function isSeniorPreviewActive(): boolean {
  return manualPreviewActive;
}

export function clearSeniorPreview(): void {
  manualPreviewActive = false;
}

function padTime(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Godzina „teraz” - kafelek WEŹ LEK będzie aktywny. */
function dueTimeNow(): string {
  const now = new Date();
  return padTime(now.getHours(), now.getMinutes());
}

export function devPreviewTreatments(): Treatment[] {
  return [
    {
      id: 'demo-t-med',
      type: 'MEDICATION',
      name: 'Aspiryna',
      totalPills: 30,
      currentPills: 8,
      description: 'Demo - bez API',
    },
    {
      id: 'demo-t-bp',
      type: 'BLOOD_PRESSURE',
      name: 'Ciśnienie',
    },
    {
      id: 'demo-t-sugar',
      type: 'BLOOD_SUGAR',
      name: 'Cukier',
    },
    {
      id: 'demo-t-walk',
      type: 'EXERCISE',
      name: 'Spacer',
    },
  ];
}

export function devPreviewSchedules(): ScheduleItem[] {
  const today = format(new Date(), 'yyyy-MM-dd');
  const due = dueTimeNow();
  const base = {
    type: 'REGULAR' as const,
    daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
    startDate: today,
    dosage: '1',
  };

  return [
    { id: 'demo-s-med', treatmentId: 'demo-t-med', time: due, ...base },
    { id: 'demo-s-bp', treatmentId: 'demo-t-bp', time: '14:00', ...base },
    { id: 'demo-s-sugar', treatmentId: 'demo-t-sugar', time: '08:00', ...base },
    { id: 'demo-s-walk', treatmentId: 'demo-t-walk', time: '18:00', ...base },
  ];
}

export const DEV_PREVIEW_SENIOR_NAME = 'Jan (podgląd)';
