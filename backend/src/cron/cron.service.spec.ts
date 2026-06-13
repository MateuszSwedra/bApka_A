import { Test, TestingModule } from '@nestjs/testing';
import { CronService } from './cron.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { createPrismaMock } from '../../test/helpers/prisma.mock';
import { formatLocalHm } from '../common/app-timezone';

describe('CronService', () => {
  let service: CronService;
  const prisma = createPrismaMock();
  const notifications = {
    formatMedName: jest.fn().mockReturnValue('Aspirin'),
    formatUserName: jest.fn().mockReturnValue('Jan'),
    sendMedicationReminder: jest.fn(),
    notifyDoseMissed: jest.fn(),
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

  describe('markMissedDoses', () => {
    it('updates stale PENDING logs to MISSED and notifies caretakers', async () => {
      prisma.doseLog.findMany.mockResolvedValue([
        {
          id: 'log-1',
          schedule: {
            id: 'sched-1',
            medication: 'Aspirin',
            inventory: null,
            user: { id: 'dep-1', name: 'Jan', email: 'jan@test.pl' },
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
    });
  });
});
