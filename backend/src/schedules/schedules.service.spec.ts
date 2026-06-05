import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { PrismaService } from '../prisma/prisma.service';
import { createPrismaMock } from '../../test/helpers/prisma.mock';

describe('SchedulesService', () => {
  let service: SchedulesService;
  const prisma = createPrismaMock();

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [SchedulesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<SchedulesService>(SchedulesService);
  });

  it('create passes userId and defaults', async () => {
    prisma.schedule.create.mockResolvedValue({ id: 's1' });
    await service.create('user-1', { time: '08:00', medication: 'Aspirin' });
    expect(prisma.schedule.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        time: '08:00',
        medication: 'Aspirin',
        dosage: '1',
        type: 'DAILY',
        daysOfWeek: [],
      }),
    });
  });

  it('findAll filters by userId', async () => {
    prisma.schedule.findMany.mockResolvedValue([]);
    await service.findAll('user-1');
    expect(prisma.schedule.findMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
  });

  describe('markDose', () => {
    it('updates existing log for today', async () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const time = `${hh}:${mm}`;
      const scheduled = new Date(now);
      scheduled.setSeconds(0, 0);

      prisma.doseLog.findFirst.mockResolvedValue({ id: 'log-1', scheduledAt: scheduled, status: 'PENDING' });
      prisma.schedule.findUnique.mockResolvedValue({ id: 'sched-1', time });
      prisma.doseLog.update.mockResolvedValue({ id: 'log-1', status: 'TAKEN' });

      await service.markDose('sched-1', 'TAKEN');
      expect(prisma.doseLog.update).toHaveBeenCalledWith({
        where: { id: 'log-1' },
        data: expect.objectContaining({
          status: 'TAKEN',
          source: 'APP_SENIOR',
        }),
      });
    });

    it('creates log when none exists today', async () => {
      prisma.doseLog.findFirst.mockResolvedValue(null);
      prisma.schedule.findUnique.mockResolvedValue({ id: 'sched-1', time: '08:00' });
      prisma.doseLog.create.mockResolvedValue({ id: 'log-new' });

      await service.markDose('sched-1', 'MISSED');
      expect(prisma.doseLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          scheduleId: 'sched-1',
          status: 'MISSED',
          source: 'APP_SENIOR',
        }),
      });
    });

    it('marks early confirmation as TAKEN (before scheduled time)', async () => {
      const scheduled = new Date();
      scheduled.setHours(14, 0, 0, 0);
      const thirtyMinBefore = new Date(scheduled.getTime() - 30 * 60 * 1000);

      jest.useFakeTimers();
      jest.setSystemTime(thirtyMinBefore);

      prisma.doseLog.findFirst.mockResolvedValue({
        id: 'log-early',
        scheduledAt: scheduled,
        status: 'PENDING',
      });
      prisma.schedule.findUnique.mockResolvedValue({ id: 'sched-1', time: '14:00' });
      prisma.doseLog.update.mockResolvedValue({ id: 'log-early', status: 'TAKEN' });

      await service.markDose('sched-1', 'TAKEN');
      expect(prisma.doseLog.update).toHaveBeenCalledWith({
        where: { id: 'log-early' },
        data: expect.objectContaining({ status: 'TAKEN' }),
      });

      jest.useRealTimers();
    });

    it('marks TAKEN as LATE after confirmation window', async () => {
      const scheduled = new Date();
      scheduled.setHours(8, 0, 0, 0);
      const twoHoursLater = new Date(scheduled.getTime() + 2 * 60 * 60 * 1000);

      jest.useFakeTimers();
      jest.setSystemTime(twoHoursLater);

      prisma.doseLog.findFirst.mockResolvedValue({
        id: 'log-1',
        scheduledAt: scheduled,
        status: 'PENDING',
      });
      prisma.schedule.findUnique.mockResolvedValue({ id: 'sched-1', time: '08:00' });
      prisma.doseLog.update.mockResolvedValue({ id: 'log-1', status: 'LATE' });

      await service.markDose('sched-1', 'TAKEN');
      expect(prisma.doseLog.update).toHaveBeenCalledWith({
        where: { id: 'log-1' },
        data: expect.objectContaining({ status: 'LATE' }),
      });

      jest.useRealTimers();
    });
  });

  it('getTodayDoseLogs queries logs since midnight', async () => {
    prisma.doseLog.findMany.mockResolvedValue([]);
    await service.getTodayDoseLogs('user-1');
    expect(prisma.doseLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          schedule: { userId: 'user-1' },
        }),
      }),
    );
  });
});
