import { router } from 'expo-router';
import { usersAPI } from './api';
import { getStoredRole } from './sessionStorage';
import {
  resolvePostAuthRoute,
  type MeProfile,
  type PostAuthRoute,
} from './postAuthRouting';

type CaretakerDependentRoute = `/(caretaker)/dependent/${string}`;

export type SosDismissRoute = PostAuthRoute | CaretakerDependentRoute;

async function caretakerHasDependent(dependentId: string): Promise<boolean> {
  try {
    const data = await usersAPI.getDependents();
    const list = Array.isArray(data) ? data : [];
    return list.some((d) => d?.id === dependentId);
  } catch {
    return false;
  }
}

/** Gdzie iść po zamknięciu alarmu SOS — zależnie od roli i sparowania. */
export async function resolveSosDismissRoute(dependentId?: string): Promise<SosDismissRoute> {
  const storedRole = await getStoredRole();
  let me: MeProfile | null = null;
  try {
    me = (await usersAPI.getMe()) as MeProfile;
  } catch {
    /* offline / wygasła sesja */
  }

  const role = me?.role ?? storedRole;
  const trimmedDependentId = dependentId?.trim();

  if (
    trimmedDependentId &&
    (role === 'CARETAKER' || role === 'HYBRID') &&
    (await caretakerHasDependent(trimmedDependentId))
  ) {
    return `/(caretaker)/dependent/${trimmedDependentId}`;
  }

  return resolvePostAuthRoute(me, {
    storedRole,
    skipNotificationCheck: true,
  });
}

export async function navigateAfterSosDismiss(dependentId?: string): Promise<void> {
  const destination = await resolveSosDismissRoute(dependentId);
  router.replace(destination as Parameters<typeof router.replace>[0]);
}
