import i18n from '../i18n';
import { usersAPI } from '../services/api';
import { isUserUuid } from './resolveMedsTargetUserId';

/** Upewnia się, że userId to sparowany podopieczny opiekuna lub własne konto (HYBRID). */
export async function assertCaretakerDependent(userId: string): Promise<void> {
  if (!isUserUuid(userId)) {
    throw new Error(i18n.t('errors.invalidDependentProfile'));
  }
  try {
    const me = await usersAPI.getMe();
    if (me?.id === userId) return;
  } catch {
    /* kontynuuj weryfikację opiekuna */
  }
  const dependents = (await usersAPI.getDependents()) as { id?: string }[];
  const ok = Array.isArray(dependents) && dependents.some(d => d?.id === userId);
  if (!ok) {
    throw new Error(i18n.t('errors.dependentUnlinked'));
  }
}
