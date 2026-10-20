import { Test, TestingModule } from '@nestjs/testing';
import { SchedulesController } from './schedules.controller';
import { SchedulesService } from './schedules.service';

describe('SchedulesController', () => {
  let controller: SchedulesController;
  const schedulesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getTodayDoseLogs: jest.fn(),
    markDose: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SchedulesController],
      providers: [{ provide: SchedulesService, useValue: schedulesService }],
    }).compile();

    controller = module.get<SchedulesController>(SchedulesController);
  });

  it('create passes actor and userId from route', async () => {
    schedulesService.create.mockResolvedValue({ id: 's1' });
    await controller.create(
      { user: { userId: 'actor-1', email: 'a@b.pl', role: 'CARETAKER' } },
      'user-1',
      { time: '08:00' } as any,
    );
    expect(schedulesService.create).toHaveBeenCalledWith('actor-1', 'user-1', {
      time: '08:00',
    });
  });

  it('markDose passes actor and status', async () => {
    schedulesService.markDose.mockResolvedValue({ status: 'TAKEN' });
    await controller.markDose(
      { user: { userId: 'actor-1', email: 'a@b.pl', role: 'DEPENDENT' } },
      'sched-1',
      { status: 'TAKEN' },
    );
    expect(schedulesService.markDose).toHaveBeenCalledWith(
      'actor-1',
      'sched-1',
      'TAKEN',
    );
  });
});
