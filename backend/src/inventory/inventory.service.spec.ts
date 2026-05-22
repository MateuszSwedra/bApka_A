import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { createPrismaMock } from '../../test/helpers/prisma.mock';

describe('InventoryService', () => {
  let service: InventoryService;
  const prisma = createPrismaMock();

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [InventoryService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<InventoryService>(InventoryService);
  });

  it('create sets currentPills from totalPills by default', async () => {
    prisma.inventory.create.mockResolvedValue({ id: 'i1' });
    await service.create('u1', {
      name: 'Aspirin',
      totalPills: 30,
    });
    expect(prisma.inventory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'u1',
        currentPills: 30,
        pillsPerDose: 1,
      }),
    });
  });

  describe('remove', () => {
    it('deletes related schedules and dose logs', async () => {
      prisma.inventory.findUnique.mockResolvedValue({ name: 'Aspirin' });
      prisma.schedule.findMany.mockResolvedValue([{ id: 's1' }, { id: 's2' }]);
      prisma.inventory.delete.mockResolvedValue({ id: 'i1' });

      await service.remove('i1');
      expect(prisma.doseLog.deleteMany).toHaveBeenCalledWith({
        where: { scheduleId: { in: ['s1', 's2'] } },
      });
      expect(prisma.schedule.deleteMany).toHaveBeenCalled();
      expect(prisma.inventory.delete).toHaveBeenCalledWith({ where: { id: 'i1' } });
    });
  });

  describe('calculateDepletion', () => {
    it('returns null when inventory missing', async () => {
      prisma.inventory.findUnique.mockResolvedValue(null);
      await expect(service.calculateDepletion('missing')).resolves.toBeNull();
    });

    it('returns high daysLeft when no recurring schedules', async () => {
      prisma.inventory.findUnique.mockResolvedValue({
        id: 'i1',
        currentPills: 20,
        totalPills: 20,
        schedules: [{ type: 'ONCE', dosage: '1', daysOfWeek: [] }],
      });
      await expect(service.calculateDepletion('i1')).resolves.toEqual({
        daysLeft: 999,
        pillsLeft: 20,
      });
    });

    it('computes days left from weekly consumption', async () => {
      prisma.inventory.findUnique.mockResolvedValue({
        id: 'i1',
        currentPills: 14,
        totalPills: 14,
        schedules: [
          {
            type: 'REGULAR',
            dosage: '2',
            daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
          },
        ],
      });
      const result = await service.calculateDepletion('i1');
      // 2 pills * 7 days = 14/week => 2/day => 14/2 = 7 days
      expect(result).toEqual({ daysLeft: 7, pillsLeft: 14 });
    });
  });
});
