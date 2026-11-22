
jest.mock('@prisma/client', () => ({
  Role: {
    DEPENDENT: 'DEPENDENT',
    CARETAKER: 'CARETAKER',
    HYBRID: 'HYBRID',
  },
  PrismaClient: class PrismaClient {},
}));

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { FirebaseSosService } from './firebase-sos.service';
import {
  buildCompletionNotification,
  buildMissedCaretakerNotification,
  activityKindFromInventoryType,
} from './activity-notification-messages';
import { CronService } from '../cron/cron.service';
import { PrismaService } from '../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../../test/helpers/prisma.mock';
import { formatLocalHm } from '../common/app-timezone';
import { DOSE_CONFIRMATION_WINDOW_MINUTES } from '../common/dose-windows';

const EXPO_TOKEN = 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]';

describe('Category F - notifications and cron', () => {

  describe('F-01 notification copy by kind / late / lang', () => {
    it('maps inventory type and builds PL/EN completion and missed copy', () => {
      expect(activityKindFromInventoryType('MEDICATION')).toBe('medication');
      expect(activityKindFromInventoryType('BLOOD_SUGAR')).toBe('measurement');
      expect(activityKindFromInventoryType('EXERCISE')).toBe('activity');

      expect(
        buildCompletionNotification('medication', 'Daniel', 'Franek', false, 'pl'),
      ).toEqual({
        title: 'Lek przyjęty',
        body: 'Daniel przyjął(a): Franek',
      });
      expect(
        buildCompletionNotification('medication', 'Daniel', 'Franek', true, 'pl'),
      ).toEqual({
        title: 'Lek przyjęty spóźnionie',
        body: 'Daniel przyjął(a) spóźnionie: Franek',
      });
      expect(
        buildCompletionNotification('medication', 'Daniel', 'Franek', false, 'en'),
      ).toEqual({
        title: 'Medicine taken',
        body: 'Daniel took: Franek',
      });
      expect(
        buildMissedCaretakerNotification('medication', 'Daniel', 'Franek', 'pl'),
      ).toEqual({
        title: 'Pominięty lek',
        body: 'Daniel nie przyjął(a): Franek',
      });
    });
  });



  describe('NotificationsService SOS and inventory alerts', () => {
    let prisma: PrismaMock;
    let service: NotificationsService;
    const firebaseSos = {
      isEnabled: jest.fn().mockReturnValue(false),
      sendSosAlarm: jest.fn().mockResolvedValue({ sent: false }),
    };

    beforeEach(async () => {
      jest.clearAllMocks();
      prisma = createPrismaMock();
      firebaseSos.isEnabled.mockReturnValue(false);
      firebaseSos.sendSosAlarm.mockResolvedValue({ sent: false });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          NotificationsService,
          { provide: PrismaService, useValue: prisma },
          { provide: FirebaseSosService, useValue: firebaseSos },
        ],
      }).compile();
      service = module.get(NotificationsService);
    });

    describe('F-02 SOS to paired caretakers [K]', () => {
      it('pushes to paired Expo tokens and clears stale native token', async () => {
        const sendSpy = jest.spyOn(service, 'sendToTokens').mockResolvedValue();
        prisma.connection.findMany.mockResolvedValue([
          {
            caretaker: {
              id: 'care-1',
              fcmToken: EXPO_TOKEN,
              nativePushToken: null,
            },
          },
        ]);

        await service.notifySos('dep-1', 'Daniel');

        expect(prisma.connection.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { dependentId: 'dep-1', isPaired: true },
          }),
        );
        expect(sendSpy).toHaveBeenCalledWith(
          [EXPO_TOKEN],
          expect.objectContaining({
            title: 'SOS!',
            body: expect.stringContaining('Daniel'),
          }),
        );
        sendSpy.mockRestore();

        firebaseSos.isEnabled.mockReturnValue(true);
        firebaseSos.sendSosAlarm.mockResolvedValue({
          sent: false,
          invalidToken: true,
        });
        prisma.connection.findMany.mockResolvedValue([
          {
            caretaker: {
              id: 'care-1',
              fcmToken: EXPO_TOKEN,
              nativePushToken: 'stale-native',
            },
          },
        ]);
        prisma.user.update.mockResolvedValue({ id: 'care-1' });

        await service.notifySos('dep-1', 'Daniel');

        expect(prisma.user.update).toHaveBeenCalledWith({
          where: { id: 'care-1' },
          data: { nativePushToken: null },
        });
      });
    });

    describe('F-03 inventory low-stock thresholds [K]', () => {
      it('sends low-stock alert once then skips when flag already set', async () => {
        const notifySpy = jest
          .spyOn(service, 'notifyCaretakersOfDependent')
          .mockResolvedValue();

        const baseInv = {
          id: 'inv-1',
          type: 'MEDICATION',
          name: 'Franek',
          currentPills: 5,
          totalPills: 5,
          lowStockAlertSent: false,
          emptyAlertSent: false,
          schedules: [
            { type: 'DAILY', dosage: '1', daysOfWeek: [1, 2, 3, 4, 5, 6, 7] },
          ],
          user: {
            id: 'dep-1',
            name: 'Daniel',
            email: 'daniel@test.pl',
            role: 'DEPENDENT',
            fcmToken: null,
          },
        };

        prisma.inventory.findUnique.mockResolvedValue(baseInv);
        prisma.connection.findMany.mockResolvedValue([
          {
            caretaker: {
              id: 'care-1',
              fcmToken: EXPO_TOKEN,
              nativePushToken: null,
            },
          },
        ]);
        prisma.inventory.update.mockResolvedValue({ id: 'inv-1' });

        await service.processInventoryAlerts('inv-1');

        expect(notifySpy).toHaveBeenCalledWith(
          'dep-1',
          expect.objectContaining({
            title: 'Koniec zapasu leku',
            data: expect.objectContaining({ type: 'inventory_low' }),
          }),
        );
        expect(prisma.inventory.update).toHaveBeenCalledWith({
          where: { id: 'inv-1' },
          data: { lowStockAlertSent: true },
        });

        notifySpy.mockClear();
        prisma.inventory.update.mockClear();
        prisma.inventory.findUnique.mockResolvedValue({
          ...baseInv,
          lowStockAlertSent: true,
        });

        await service.processInventoryAlerts('inv-1');

        expect(notifySpy).not.toHaveBeenCalled();
        expect(prisma.inventory.update).not.toHaveBeenCalled();
        notifySpy.mockRestore();
      });
    });
  });


  describe('CronService reminders and missed doses', () => {
    let prisma: PrismaMock;
    let service: CronService;
    const notifications = {
      formatMedName: jest.fn().mockReturnValue('Franek'),
      formatUserName: jest.fn().mockReturnValue('Daniel'),
      sendMedicationReminder: jest.fn(),
      sendMoodCheckReminder: jest.fn(),
      sendDoseMissedReminder: jest.fn(),
      notifyDoseMissed: jest.fn(),
      processInventoryAlerts: jest.fn(),
    };

    beforeEach(async () => {
      jest.clearAllMocks();
      prisma = createPrismaMock();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CronService,
          { provide: PrismaService, useValue: prisma },
          { provide: NotificationsService, useValue: notifications },
        ],
      }).compile();
      service = module.get(CronService);
    });

    describe('F-04 reminder at clock minute', () => {
      it('creates PENDING log and sends reminder when slot matches', async () => {
        const time = formatLocalHm();

        prisma.schedule.findMany.mockResolvedValue([
          {
            id: 'sched-1',
            medication: 'Franek',
            time,
            user: {
              email: 'daniel@test.pl',
              fcmToken: EXPO_TOKEN,
            },
            inventory: { name: 'Franek' },
          },
        ]);
        prisma.doseLog.findFirst.mockResolvedValue(null);
        prisma.doseLog.create.mockResolvedValue({ id: 'log-1' });

        await service.handleMedicationReminders();

        expect(prisma.doseLog.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            scheduleId: 'sched-1',
            status: 'PENDING',
          }),
        });
        expect(notifications.sendMedicationReminder).toHaveBeenCalledWith(
          EXPO_TOKEN,
          expect.objectContaining({
            medication: 'Franek',
            scheduleId: 'sched-1',
          }),
        );
      });
    });

    describe('F-05 PENDING to MISSED after window [K]', () => {
      it('marks overdue PENDING as MISSED and notifies', async () => {
        const scheduledAt = new Date(
          Date.now() - (DOSE_CONFIRMATION_WINDOW_MINUTES + 2) * 60 * 1000,
        );

        prisma.doseLog.findMany.mockResolvedValue([
          {
            id: 'log-1',
            scheduledAt,
            schedule: {
              id: 'sched-1',
              medication: 'Franek',
              inventory: { name: 'Franek', type: 'MEDICATION' },
              user: {
                id: 'dep-1',
                name: 'Daniel',
                email: 'daniel@test.pl',
                fcmToken: EXPO_TOKEN,
              },
            },
          },
        ]);
        prisma.doseLog.update.mockResolvedValue({ id: 'log-1', status: 'MISSED' });

        await service.markMissedDoses();

        expect(prisma.doseLog.update).toHaveBeenCalledWith({
          where: { id: 'log-1' },
          data: { status: 'MISSED' },
        });
        expect(notifications.notifyDoseMissed).toHaveBeenCalledWith(
          'dep-1',
          'Daniel',
          'Franek',
          'sched-1',
          'MEDICATION',
        );
        expect(notifications.sendDoseMissedReminder).toHaveBeenCalled();
      });
    });
  });
});
