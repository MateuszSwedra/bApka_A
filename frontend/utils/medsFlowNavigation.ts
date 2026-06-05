import { router } from 'expo-router';

export type MedsFlowScope = 'caretaker' | 'hybrid';

export function resolveMedsFlowScope(segments: string[]): MedsFlowScope {
  return segments.includes('(hybrid)') ? 'hybrid' : 'caretaker';
}

function flowRoot(scope: MedsFlowScope): string {
  return scope === 'hybrid' ? '/(hybrid)' : '/(caretaker)';
}

export function openAddMed(userId: string, scope: MedsFlowScope = 'caretaker'): void {
  router.push(`${flowRoot(scope)}/add-med/${userId}` as any);
}

export function openAddTreatment(userId: string, scope: MedsFlowScope = 'caretaker'): void {
  router.push(`${flowRoot(scope)}/add-treatment/${userId}` as any);
}

export function openEditTreatment(treatmentId: string, scope: MedsFlowScope = 'caretaker'): void {
  router.push(`${flowRoot(scope)}/edit-treatment/${treatmentId}` as any);
}

export function returnAfterScheduleSaved(userId: string, scope: MedsFlowScope): void {
  if (scope === 'hybrid') {
    router.replace('/(hybrid)/(tabs)/calendar' as any);
    return;
  }
  router.replace(`/(caretaker)/dependent/${userId}/calendar` as any);
}

export function addMedStepPath(
  scope: MedsFlowScope,
  userId: string,
  step: 'index' | 'frequency' | 'timing' | 'schedule',
): string {
  if (step === 'index') return `${flowRoot(scope)}/add-med/${userId}`;
  return `${flowRoot(scope)}/add-med/${userId}/${step}`;
}

export function addMedRoute(
  scope: MedsFlowScope,
  step: 'frequency' | 'timing' | 'schedule',
): string {
  return `${flowRoot(scope)}/add-med/[dependentId]/${step}`;
}
