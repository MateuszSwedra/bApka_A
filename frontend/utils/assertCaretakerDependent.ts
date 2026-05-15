import { usersAPI } from '../services/api';
import { isUserUuid } from './resolveMedsTargetUserId';

/** Upewnia się, że userId to aktualny, sparowany podopieczny opiekuna. */
export async function assertCaretakerDependent(userId: string): Promise<void> {
  if (!isUserUuid(userId)) {
    throw new Error(
      'Nieprawidłowy profil podopiecznego. Wróć do listy i otwórz profil ponownie.',
    );
  }
  const dependents = (await usersAPI.getDependents()) as { id?: string }[];
  const ok = Array.isArray(dependents) && dependents.some(d => d?.id === userId);
  if (!ok) {
    throw new Error(
      'Ten podopieczny nie jest już powiązany z kontem. Odśwież listę na ekranie głównym i sparuj ponownie.',
    );
  }
}
