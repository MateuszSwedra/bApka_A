import { Test, TestingModule } from '@nestjs/testing';
import { CronService } from './cron.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { createPrismaMock } from '../../test/helpers/prisma.mock';
import { formatLocalHm } from '../common/app-timezone';
import { DOSE_CONFIRMATION_WINDOW_MINUTES } from '../common/dose-windows';

describe('CronService', () => {
  let service: CronService;
  const prisma = createPrismaMock();
  const notifications = {
    formatMedName: jest.fn().mockReturnValue('Aspirin'),
    formatUserName: jest.fn().mockReturnValue('Jan'),
    sendMedicationReminder: jest.fn(),
    sendMoodCheckReminder: jest.fn(),
    sendDoseMissedReminder: jest.fn(),
    notifyDoseMissed: jest.fn(),
    processInventoryAlerts: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CronService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();
    service = module.get<CronService>(CronService);
  });

  describe('handleMedicationReminders', () => {
    it('creates PENDING log and sends push when schedule matches current minute', async () => {
      const time = formatLocalHm();

      prisma.schedule.findMany.mockResolvedValue([
        {
          id: 'sched-1',
          medication: 'Aspirin',
          time,
          user: {
            email: 'senior@test.pl',
            fcmToken: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
          },
          inventory: null,
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
      expect(notifications.sendMedicationReminder).toHaveBeenCalled();
    });

    it('matches schedule when stored as 8:00 and clock is 08:00', async () => {
      const time = formatLocalHm();
      if (!time.startsWith('0')) return;

      prisma.schedule.findMany.mockResolvedValue([
        {
          id: 'sched-1',
          medication: 'Aspirin',
          time: time.slice(1),
          user: {
            email: 'senior@test.pl',
            fcmToken: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
          },
          inventory: null,
        },
      ]);
      prisma.doseLog.findFirst.mockResolvedValue(null);
      prisma.doseLog.create.mockResolvedValue({ id: 'log-1' });

      await service.handleMedicationReminders();
      expect(notifications.sendMedicationReminder).toHaveBeenCalled();
    });

    it('skips when log already exists for today', async () => {
      const time = formatLocalHm();
      prisma.schedule.findMany.mockResolvedValue([
        {
          id: 'sched-1',
          time,
          user: { email: 'x@y.pl', fcmToken: null },
          inventory: null,
        },
      ]);
      prisma.doseLog.findFirst.mockResolvedValue({ id: 'existing' });

      await service.handleMedicationReminders();
      expect(prisma.doseLog.create).not.toHaveBeenCalled();
      expect(notifications.sendMedicationReminder).not.toHaveBeenCalled();
    });
  });

  describe('handleMoodCheckReminders', () => {
    it('sends push when mood check time matches and no mood logged today', async () => {
      const time = formatLocalHm();

      prisma.user.findMany.mockResolvedValue([
        {
          id: 'dep-1',
          email: 'senior@test.pl',
          fcmToken: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
          moodCheckTimes: [time],
        },
      ]);
      prisma.moodLog.findFirst.mockResolvedValue(null);

      await service.handleMoodCheckReminders();

      expect(notifications.sendMoodCheckReminder).toHaveBeenCalledWith(
        'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        expect.objectContaining({ slotTime: time, email: 'senior@test.pl' }),
      );
    });

    it('skips when mood already logged today', async () => {
      const time = formatLocalHm();

      prisma.user.findMany.mockResolvedValue([
        {
          id: 'dep-1',
          email: 'senior@test.pl',
          fcmToken: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
          moodCheckTimes: [time],
        },
      ]);
      prisma.moodLog.findFirst.mockResolvedValue({ id: 'mood-1' });

      await service.handleMoodCheckReminders();

      expect(notifications.sendMoodCheckReminder).not.toHaveBeenCalled();
    });
  });

  describe('markMissedDoses', () => {
    it('updates PENDING logs past confirmation window and notifies senior + caretakers', async () => {
      const scheduledAt = new Date(
        Date.now() - (DOSE_CONFIRMATION_WINDOW_MINUTES + 2) * 60 * 1000,
      );

      prisma.doseLog.findMany.mockResolvedValue([
        {
          id: 'log-1',
          scheduledAt,
          schedule: {
            id: 'sched-1',
            medication: 'Aspirin',
            inventory: null,
            user: {
              id: 'dep-1',
              name: 'Jan',
              email: 'jan@test.pl',
              fcmToken: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
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
        'Jan',
        'Aspirin',
        'sched-1',
      );
      expect(notifications.sendDoseMissedReminder).toHaveBeenCalledWith(
        'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        expect.objectContaining({ scheduleId: 'sched-1' }),
      );
    });

    it('skips PENDING logs still within confirmation window', async () => {
      const scheduledAt = new Date();

      prisma.doseLog.findMany.mockResolvedValue([
        {
          id: 'log-1',
          scheduledAt,
          schedule: {
            id: 'sched-1',
            medication: 'Aspirin',
            inventory: null,
            user: { id: 'dep-1', name: 'Jan', email: 'jan@test.pl', fcmToken: null },
          },
        },
      ]);

      await service.markMissedDoses();

      expect(prisma.doseLog.update).not.toHaveBeenCalled();
      expect(notifications.notifyDoseMissed).not.toHaveBeenCalled();
    });
  });

  describe('handleInventoryAlerts', () => {
    it('checks medication inventory items only', async () => {
      prisma.inventory.findMany.mockResolvedValue([{ id: 'inv-1' }, { id: 'inv-2' }]);

      await service.handleInventoryAlerts();

      expect(prisma.inventory.findMany).toHaveBeenCalledWith({
        where: { type: 'MEDICATION' },
        select: { id: true },
      });
      expect(notifications.processInventoryAlerts).toHaveBeenCalledTimes(2);
      expect(notifications.processInventoryAlerts).toHaveBeenCalledWith('inv-1');
      expect(notifications.processInventoryAlerts).toHaveBeenCalledWith('inv-2');
    });
  });
});
