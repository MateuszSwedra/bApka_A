import { Test, TestingModule } from '@nestjs/testing';
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
      prisma.doseLog.findFirst.mockResolvedValue({ id: 'log-1' });
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
