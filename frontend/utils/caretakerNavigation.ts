import { router } from 'expo-router';

/** Nawigacja do dodawania harmonogramu — ścieżka z UUID (nie object pathname). */
export function openAddMedForDependent(dependentUserId: string): void {
  router.push(`/(caretaker)/add-med/${dependentUserId}` as any);
}

export function openAddTreatmentForDependent(dependentUserId: string): void {
  router.push(`/(caretaker)/add-treatment/${dependentUserId}` as any);
}
