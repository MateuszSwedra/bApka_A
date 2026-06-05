import i18n from '../i18n';
import { usersAPI } from '../services/api';
import { isUserUuid } from './resolveMedsTargetUserId';

/** Upewnia się, że userId to aktualny, sparowany podopieczny opiekuna. */
export async function assertCaretakerDependent(userId: string): Promise<void> {
  if (!isUserUuid(userId)) {
    throw new Error(i18n.t('errors.invalidDependentProfile'));
  }
  const dependents = (await usersAPI.getDependents()) as { id?: string }[];
  const ok = Array.isArray(dependents) && dependents.some(d => d?.id === userId);
  if (!ok) {
    throw new Error(i18n.t('errors.dependentUnlinked'));
  }
}
