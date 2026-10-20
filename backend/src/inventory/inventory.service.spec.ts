import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AccessControlService } from '../common/access-control.service';
import { createPrismaMock } from '../../test/helpers/prisma.mock';

describe('InventoryService', () => {
  let service: InventoryService;
  const prisma = createPrismaMock();
  const notifications = {
    notifyDependentDataChanged: jest.fn(),
  };
  const access = {
    assertCanAccessUser: jest.fn().mockResolvedValue(undefined),
    assertCanAccessInventory: jest.fn().mockResolvedValue({ userId: 'u1' }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    access.assertCanAccessUser.mockResolvedValue(undefined);
    access.assertCanAccessInventory.mockResolvedValue({ userId: 'u1' });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
        { provide: AccessControlService, useValue: access },
      ],
    }).compile();
    service = module.get<InventoryService>(InventoryService);
  });

  it('create sets currentPills from totalPills by default', async () => {
    prisma.inventory.create.mockResolvedValue({ id: 'i1' });
    await service.create('u1', 'u1', {
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
      prisma.inventory.findUnique.mockResolvedValue({
        name: 'Aspirin',
        userId: 'u1',
      });
      prisma.schedule.findMany.mockResolvedValue([{ id: 's1' }, { id: 's2' }]);
      prisma.inventory.delete.mockResolvedValue({ id: 'i1' });

      await service.remove('u1', 'i1');
      expect(prisma.doseLog.deleteMany).toHaveBeenCalledWith({
        where: { scheduleId: { in: ['s1', 's2'] } },
      });
      expect(prisma.schedule.deleteMany).toHaveBeenCalled();
      expect(prisma.inventory.delete).toHaveBeenCalledWith({ where: { id: 'i1' } });
    });
  });

  describe('calculateDepletion', () => {
    it('returns null when inventory missing after access check', async () => {
      access.assertCanAccessInventory.mockResolvedValue({ userId: 'u1' });
      prisma.inventory.findUnique.mockResolvedValue(null);
      await expect(service.calculateDepletion('u1', 'missing')).resolves.toBeNull();
    });

    it('returns high daysLeft when no recurring schedules', async () => {
      prisma.inventory.findUnique.mockResolvedValue({
        id: 'i1',
        currentPills: 20,
        totalPills: 20,
        schedules: [{ type: 'ONCE', dosage: '1', daysOfWeek: [] }],
      });
      await expect(service.calculateDepletion('u1', 'i1')).resolves.toEqual({
        daysLeft: 999,
        pillsLeft: 20,
      });
    });
  });
});
