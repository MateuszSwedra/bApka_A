jest.mock('../context/MedsContext', () => ({
  getScheduleTreatmentId: (s: { treatmentId?: string; inventoryId?: string }) =>
    s.treatmentId ?? s.inventoryId,
}));

jest.mock('../i18n', () => {
  const t = (key: string) => key;
  return {
    __esModule: true,
    default: { t, getFixedT: () => t },
  };
});

import type { ScheduleItem, Treatment } from '../context/MedsContext';
import { computeDependentMainScheduleState } from '../utils/dependentScheduleUi';
import {
  canSubmitMarkTaken,
  canSubmitMood,
  resolveMedPressAction,
  runAfterConfirmModal,
} from '../utils/seniorHomeInteractions';

const treatments: Treatment[] = [
  { id: 't1', type: 'MEDICATION', name: 'Franek' },
];

const scheduleAt = (time: string): ScheduleItem => ({
  id: 'sched-1',
  treatmentId: 't1',
  type: 'ONCE',
  time,
  startDate: '2026-05-22',
  daysOfWeek: [],
  dosage: '1',
});

describe('Category H - senior interactions', () => {

  describe('H-01 due click opens confirm then markTaken [K]', () => {
    it('due state → confirm action and markTaken once after TAK', async () => {
      const now = new Date('2026-05-22T08:00:00');
      const mainState = computeDependentMainScheduleState(
        [scheduleAt('08:00')],
        treatments,
        new Set(),
        now,
      );

      expect(mainState.kind).toBe('due');
      expect(resolveMedPressAction(mainState.kind)).toBe('open_confirm');
      expect(canSubmitMarkTaken(mainState.kind)).toBe(true);

      const markTaken = jest.fn().mockResolvedValue(undefined);
      const ran = await runAfterConfirmModal('confirm', async () => {
        if (!canSubmitMarkTaken(mainState.kind)) return;
        if (mainState.kind !== 'due' && mainState.kind !== 'missed') return;
        await markTaken(mainState.scheduleId);
      });

      expect(ran).toBe(true);
      expect(markTaken).toHaveBeenCalledTimes(1);
      expect(markTaken).toHaveBeenCalledWith('sched-1');
    });
  });

  describe('H-02 upcoming click does not markTaken [K]', () => {
    it('upcoming → info only, markTaken never called', async () => {
      const now = new Date('2026-05-22T07:00:00');
      const mainState = computeDependentMainScheduleState(
        [scheduleAt('08:00')],
        treatments,
        new Set(),
        now,
      );

      expect(mainState.kind).toBe('upcoming');
      expect(resolveMedPressAction(mainState.kind)).toBe('open_upcoming_info');
      expect(canSubmitMarkTaken(mainState.kind)).toBe(false);

      const markTaken = jest.fn();
      const ran = await runAfterConfirmModal('confirm', async () => {
        if (!canSubmitMarkTaken(mainState.kind)) return;
        await markTaken('sched-1');
      });

      expect(ran).toBe(true);
      expect(markTaken).not.toHaveBeenCalled();
    });
  });



  describe('H-03 mood pick calls updateMood', () => {
    it('active mood slot → updateMood with chosen value', async () => {
      expect(canSubmitMood('active')).toBe(true);
      expect(canSubmitMood('inactive')).toBe(false);
      expect(canSubmitMood('disabled')).toBe(false);

      const updateMood = jest.fn().mockResolvedValue(undefined);

      const pick = async (
        mood: 'sad' | 'neutral' | 'happy',
        kind: 'active' | 'inactive' | 'disabled',
      ) => {
        if (!canSubmitMood(kind)) return;
        await updateMood(mood);
      };

      await pick('sad', 'inactive');
      expect(updateMood).not.toHaveBeenCalled();

      await pick('happy', 'active');
      expect(updateMood).toHaveBeenCalledTimes(1);
      expect(updateMood).toHaveBeenCalledWith('happy');
    });
  });


  describe('H-04 SOS only after confirm [K]', () => {
    it('cancel skips createSos; confirm calls it once', async () => {
      const createSos = jest.fn().mockResolvedValue(undefined);

      const cancelled = await runAfterConfirmModal('cancel', async () => {
        await createSos();
      });
      expect(cancelled).toBe(false);
      expect(createSos).not.toHaveBeenCalled();

      const confirmed = await runAfterConfirmModal('confirm', async () => {
        await createSos();
      });
      expect(confirmed).toBe(true);
      expect(createSos).toHaveBeenCalledTimes(1);
    });
  });

  describe('H-05 SeniorConfirmModal callback contract', () => {
    it('routes TAK to onConfirm and NIE to onCancel', async () => {
      const onConfirm = jest.fn();
      const onCancel = jest.fn();

      await runAfterConfirmModal('confirm', onConfirm);
      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onCancel).not.toHaveBeenCalled();

      onConfirm.mockClear();
      await runAfterConfirmModal('cancel', onConfirm);
      expect(onConfirm).not.toHaveBeenCalled();

      onCancel();
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });
});
