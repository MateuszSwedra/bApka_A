import type { DependentMainScheduleState, MoodScheduleState } from './dependentScheduleUi';

export type MedPressAction = 'open_confirm' | 'open_upcoming_info' | 'none';

export function resolveMedPressAction(
  kind: DependentMainScheduleState['kind'],
): MedPressAction {
  if (kind === 'due' || kind === 'missed') return 'open_confirm';
  if (kind === 'upcoming') return 'open_upcoming_info';
  return 'none';
}


export function canSubmitMarkTaken(kind: DependentMainScheduleState['kind']): boolean {
  return kind === 'due' || kind === 'missed';
}


export function canSubmitMood(kind: MoodScheduleState['kind']): boolean {
  return kind === 'active';
}

export type ConfirmModalOutcome = 'confirm' | 'cancel';

export async function runAfterConfirmModal(
  outcome: ConfirmModalOutcome,
  onConfirm: () => void | Promise<void>,
): Promise<boolean> {
  if (outcome === 'cancel') return false;
  await onConfirm();
  return true;
}
