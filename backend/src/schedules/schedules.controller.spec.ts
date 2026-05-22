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

  it('create passes userId from route', async () => {
    schedulesService.create.mockResolvedValue({ id: 's1' });
    await controller.create('user-1', { time: '08:00' });
    expect(schedulesService.create).toHaveBeenCalledWith('user-1', { time: '08:00' });
  });

  it('markDose passes status', async () => {
    schedulesService.markDose.mockResolvedValue({ status: 'TAKEN' });
    await controller.markDose('sched-1', 'TAKEN');
    expect(schedulesService.markDose).toHaveBeenCalledWith('sched-1', 'TAKEN');
  });
});
