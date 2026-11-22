

jest.mock('../i18n', () => ({
  __esModule: true,
  default: {
    t: (key: string) => key,
  },
}));

jest.mock('../services/api', () => ({
  usersAPI: {
    getMe: jest.fn(),
    getDependents: jest.fn(),
  },
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  InteractionManager: {
    runAfterInteractions: (cb: () => void) => {
      cb();
      return { cancel: jest.fn() };
    },
  },
}));

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
}));

jest.mock('../services/notificationOnboarding', () => ({
  hasCompletedNotificationOnboarding: jest.fn().mockResolvedValue(true),
}));

jest.mock('../services/fullScreenIntentPermission', () => ({
  needsFullScreenIntentPrompt: jest.fn().mockResolvedValue(false),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

jest.mock('../services/sessionStorage', () => ({
  getStoredRole: jest.fn(),
}));

jest.mock('../services/dataSyncBus', () => ({
  emitDataSync: jest.fn(),
}));

jest.mock('../context/MedsContext', () => ({
  getScheduleTreatmentId: (s: { treatmentId?: string; inventoryId?: string }) =>
    s.treatmentId ?? s.inventoryId,
}));

import { usersAPI } from '../services/api';
import { assertCaretakerDependent } from '../utils/assertCaretakerDependent';
import {
  dependentNeedsCaretakerPin,
  resolvePostAuthRoute,
} from '../services/postAuthRouting';
import {
  classifyDayStatus,
  computeAdherencePercent,
  enrichDailyEntry,
} from '../utils/doseStats';
import { routeIncomingPush } from '../services/incomingPushRouter';
import { computeMoodScheduleState } from '../utils/dependentScheduleUi';
import { router } from 'expo-router';
import { getStoredRole } from '../services/sessionStorage';
import { emitDataSync } from '../services/dataSyncBus';

const DEP_ID = 'a1b2c3d4-e5f6-4178-9abc-def012345678';
const CARE_ID = 'b2c3d4e5-f6a7-4890-abcd-ef0123456789';
const STRANGER_ID = 'c3d4e5f6-a7b8-4901-bcde-f01234567890';

const mockedUsersAPI = usersAPI as jest.Mocked<typeof usersAPI>;
const mockedGetStoredRole = getStoredRole as jest.MockedFunction<typeof getStoredRole>;
const mockedRouterPush = router.push as jest.Mock;

describe('Category G - frontend gates and routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });



  describe('G-01 assertCaretakerDependent [K]', () => {
    it('throws when userId is not a linked dependent', async () => {
      mockedUsersAPI.getMe.mockResolvedValue({ id: CARE_ID } as never);
      mockedUsersAPI.getDependents.mockResolvedValue([{ id: DEP_ID }] as never);

      await expect(assertCaretakerDependent(STRANGER_ID)).rejects.toThrow(
        'errors.dependentUnlinked',
      );
      expect(mockedUsersAPI.getDependents).toHaveBeenCalled();
    });

    it('allows self id and linked dependent id', async () => {
      mockedUsersAPI.getMe.mockResolvedValue({ id: DEP_ID } as never);
      await expect(assertCaretakerDependent(DEP_ID)).resolves.toBeUndefined();
      expect(mockedUsersAPI.getDependents).not.toHaveBeenCalled();

      mockedUsersAPI.getMe.mockResolvedValue({ id: CARE_ID } as never);
      mockedUsersAPI.getDependents.mockResolvedValue([{ id: DEP_ID }] as never);
      await expect(assertCaretakerDependent(DEP_ID)).resolves.toBeUndefined();
    });
  });



  describe('G-02 DEPENDENT to enter-pin [K]', () => {
    it('routes unpaired dependent to /enter-pin', async () => {
      expect(
        dependentNeedsCaretakerPin({
          role: 'DEPENDENT',
          roleSelected: true,
          isPairedWithCaretaker: false,
        }),
      ).toBe(true);

      await expect(
        resolvePostAuthRoute(
          {
            role: 'DEPENDENT',
            roleSelected: true,
            isPairedWithCaretaker: false,
          },
          { skipNotificationCheck: true },
        ),
      ).resolves.toBe('/enter-pin');

      await expect(
        resolvePostAuthRoute(
          {
            role: 'DEPENDENT',
            roleSelected: true,
            isPairedWithCaretaker: true,
          },
          { skipNotificationCheck: true },
        ),
      ).resolves.toBe('/(dependent)');
    });
  });



  describe('G-03 dose stats FE adherence parity', () => {
    it('matches backend-style status and percent rules', () => {
      expect(computeAdherencePercent(8, 10)).toBe(80);
      expect(computeAdherencePercent(0, 0)).toBe(0);

      expect(classifyDayStatus({ taken: 2, late: 0, missed: 0, pending: 0 })).toBe(
        'perfect',
      );
      expect(classifyDayStatus({ taken: 1, late: 1, missed: 0, pending: 0 })).toBe(
        'late',
      );
      expect(classifyDayStatus({ taken: 1, late: 0, missed: 1, pending: 0 })).toBe(
        'missed',
      );
      expect(classifyDayStatus({ taken: 0, late: 0, missed: 0, pending: 1 })).toBe(
        'pending',
      );
      expect(classifyDayStatus({ taken: 0, late: 0, missed: 0, pending: 0 })).toBe(
        'empty',
      );

      expect(
        enrichDailyEntry({
          date: '2026-06-15',
          taken: 3,
          late: 0,
          missed: 1,
          pending: 0,
        }),
      ).toMatchObject({
        totalPlanned: 4,
        adherencePercent: 75,
        status: 'missed',
      });
    });
  });


  describe('G-04 incoming push router', () => {
    it('emits data sync and navigates by push type', async () => {
      mockedGetStoredRole.mockResolvedValue('DEPENDENT');

      await routeIncomingPush({ type: 'med_reminder' });
      expect(emitDataSync).toHaveBeenCalled();
      expect(mockedRouterPush).toHaveBeenCalledWith('/(dependent)');

      mockedRouterPush.mockClear();
      (emitDataSync as jest.Mock).mockClear();
      mockedGetStoredRole.mockResolvedValue('CARETAKER');

      await routeIncomingPush({
        type: 'dose_taken',
        dependentId: DEP_ID,
      });
      expect(emitDataSync).toHaveBeenCalled();
      expect(mockedRouterPush).toHaveBeenCalledWith(
        `/(caretaker)/dependent/${DEP_ID}`,
      );
    });
  });


  describe('G-05 mood schedule tile state', () => {
    it('returns disabled / active / inactive kinds', () => {
      expect(computeMoodScheduleState([], new Set(), new Date('2026-06-15T10:00:00'))).toEqual({
        kind: 'disabled',
      });

      expect(
        computeMoodScheduleState(
          ['10:00'],
          new Set(),
          new Date('2026-06-15T10:15:00'),
        ),
      ).toEqual({ kind: 'active', slotTime: '10:00' });

      expect(
        computeMoodScheduleState(
          ['14:00'],
          new Set(),
          new Date('2026-06-15T10:00:00'),
        ),
      ).toEqual({ kind: 'inactive', nextTime: '14:00' });

      expect(
        computeMoodScheduleState(
          ['10:00'],
          new Set(['10:00']),
          new Date('2026-06-15T10:15:00'),
        ),
      ).toEqual({ kind: 'disabled' });
    });
  });
});
