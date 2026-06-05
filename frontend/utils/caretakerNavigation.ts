import { openAddMed, openAddTreatment } from './medsFlowNavigation';

/** Nawigacja do dodawania harmonogramu — ścieżka z UUID (nie object pathname). */
export function openAddMedForDependent(dependentUserId: string): void {
  openAddMed(dependentUserId, 'caretaker');
}

export function openAddTreatmentForDependent(dependentUserId: string): void {
  openAddTreatment(dependentUserId, 'caretaker');
}
