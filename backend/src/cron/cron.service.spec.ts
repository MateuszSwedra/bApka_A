import { Test, TestingModule } from '@nestjs/testing';
import { CronService } from './cron.service';
import { PrismaService } from '../prisma/prisma.service';
import { createPrismaMock } from '../../test/helpers/prisma.mock';

const sendPushMock = jest.fn().mockResolvedValue([]);

jest.mock('expo-server-sdk', () => {
  const ExpoMock = jest.fn().mockImplementation(() => ({
    sendPushNotificationsAsync: sendPushMock,
  }));
  (ExpoMock as jest.Mock & { isExpoPushToken: jest.Mock }).isExpoPushToken = jest
    .fn()
    .mockReturnValue(true);
  return { Expo: ExpoMock, __esModule: true };
});

describe('CronService', () => {
  let service: CronService;
  const prisma = createPrismaMock();
  beforeEach(async () => {
    jest.clearAllMocks();
    sendPushMock.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [CronService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<CronService>(CronService);
  });

  describe('handleMedicationReminders', () => {
    it('creates PENDING log and sends push when schedule matches current minute', async () => {
      const now = new Date();
      const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      prisma.schedule.findMany.mockResolvedValue([
        {
          id: 'sched-1',
          medication: 'Aspirin',
          time,
          user: {
            email: 'senior@test.pl',
            fcmToken: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
          },
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
      expect(sendPushMock).toHaveBeenCalled();
    });

    it('skips when log already exists for today', async () => {
      const now = new Date();
      const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      prisma.schedule.findMany.mockResolvedValue([
        {
          id: 'sched-1',
          time,
          user: { email: 'x@y.pl', fcmToken: null },
        },
      ]);
      prisma.doseLog.findFirst.mockResolvedValue({ id: 'existing' });

      await service.handleMedicationReminders();
      expect(prisma.doseLog.create).not.toHaveBeenCalled();
    });
  });

  describe('markMissedDoses', () => {
    it('updates stale PENDING logs to MISSED', async () => {
      prisma.doseLog.updateMany.mockResolvedValue({ count: 3 });
      await service.markMissedDoses();
      expect(prisma.doseLog.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({ status: 'PENDING' }),
        data: { status: 'MISSED' },
      });
    });
  });
});
