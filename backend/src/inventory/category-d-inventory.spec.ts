

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
import { SchedulesService } from '../schedules/schedules.service';
import {
  calculateInventoryDepletion,
  isMedicationInventory,
} from './inventory-depletion';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AccessControlService } from '../common/access-control.service';
import { createPrismaMock, PrismaMock } from '../../test/helpers/prisma.mock';

function mockScheduleFindUnique(prisma: PrismaMock, inventoryId: string | null = 'inv-1') {
  prisma.schedule.findUnique.mockImplementation((args: { select?: { inventoryId?: boolean } }) => {
    if (args?.select?.inventoryId !== undefined) {
      return Promise.resolve({ inventoryId });
    }
    return Promise.resolve({
      id: 'sched-1',
      time: '14:00',
      inventoryId,
      user: { id: 'dep-1', name: 'Daniel', email: 'daniel@test.pl' },
      inventory: inventoryId
        ? { name: 'Franek', type: 'MEDICATION' }
        : null,
    });
  });
}

describe('Category D - inventory and dose stock side effects', () => {


  describe('D-01 only MEDICATION counts as inventory stock', () => {
    it('is true for MEDICATION / null default, false for vitals types', () => {
      expect(isMedicationInventory('MEDICATION')).toBe(true);
      expect(isMedicationInventory(null)).toBe(true);
      expect(isMedicationInventory('BLOOD_SUGAR')).toBe(false);
      expect(isMedicationInventory('BLOOD_PRESSURE')).toBe(false);
      expect(isMedicationInventory('EXERCISE')).toBe(false);
    });
  });

  describe('D-02 days until depletion', () => {
    it('returns high daysLeft when only ONCE schedules', () => {
      expect(
        calculateInventoryDepletion({
          currentPills: 10,
          totalPills: 10,
          schedules: [{ type: 'ONCE', dosage: '1', daysOfWeek: [] }],
        }),
      ).toEqual({ daysLeft: 999, pillsLeft: 10 });
    });

    it('calculates daysLeft from daily recurring usage', () => {
      expect(
        calculateInventoryDepletion({
          currentPills: 14,
          totalPills: 14,
          schedules: [
            { type: 'DAILY', dosage: '1', daysOfWeek: [1, 2, 3, 4, 5, 6, 7] },
          ],
        }),
      ).toEqual({ daysLeft: 14, pillsLeft: 14 });
    });
  });


  describe('markDose inventory side effects', () => {
    let prisma: PrismaMock;
    let service: SchedulesService;
    const notifications = {
      formatUserName: jest.fn().mockReturnValue('Daniel'),
      formatMedName: jest.fn().mockReturnValue('Franek'),
      notifyDoseTaken: jest.fn(),
      notifyDoseMissed: jest.fn(),
      notifyDependentDataChanged: jest.fn(),
      processInventoryAlerts: jest.fn(),
    };
    const access = {
      assertCanAccessUser: jest.fn().mockResolvedValue(undefined),
      assertCanAccessSchedule: jest.fn().mockResolvedValue({ userId: 'dep-1' }),
      assertCanAccessInventory: jest.fn().mockResolvedValue({ userId: 'dep-1' }),
    };

    beforeEach(async () => {
      jest.clearAllMocks();
      jest.useRealTimers();
      prisma = createPrismaMock();
      access.assertCanAccessSchedule.mockResolvedValue({ userId: 'dep-1' });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SchedulesService,
          { provide: PrismaService, useValue: prisma },
          { provide: NotificationsService, useValue: notifications },
          { provide: AccessControlService, useValue: access },
        ],
      }).compile();
      service = module.get(SchedulesService);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    describe('D-03 first TAKEN decrements stock [K]', () => {
      it('decrements currentPills on first PENDING -> TAKEN', async () => {
        const scheduled = new Date();
        scheduled.setHours(14, 0, 0, 0);
        jest.useFakeTimers();
        jest.setSystemTime(scheduled);

        prisma.doseLog.findFirst.mockResolvedValue({
          id: 'log-1',
          scheduledAt: scheduled,
          status: 'PENDING',
        });
        mockScheduleFindUnique(prisma, 'inv-1');
        prisma.inventory.findUnique.mockResolvedValue({
          currentPills: 10,
          totalPills: 10,
          pillsPerDose: 2,
          type: 'MEDICATION',
        });
        prisma.doseLog.update.mockResolvedValue({ id: 'log-1', status: 'TAKEN' });
        prisma.inventory.update.mockResolvedValue({ id: 'inv-1', currentPills: 8 });

        await service.markDose('dep-1', 'sched-1', 'TAKEN');

        expect(prisma.inventory.update).toHaveBeenCalledWith({
          where: { id: 'inv-1' },
          data: { currentPills: 8 },
        });
        expect(notifications.processInventoryAlerts).toHaveBeenCalledWith('inv-1');
      });
    });

    describe('D-04 second confirmation is idempotent [K]', () => {
      it('does not decrement again when log already TAKEN', async () => {
        const scheduled = new Date();
        scheduled.setHours(14, 0, 0, 0);
        jest.useFakeTimers();
        jest.setSystemTime(scheduled);

        prisma.doseLog.findFirst.mockResolvedValue({
          id: 'log-1',
          scheduledAt: scheduled,
          status: 'TAKEN',
        });
        mockScheduleFindUnique(prisma, 'inv-1');
        prisma.doseLog.update.mockResolvedValue({ id: 'log-1', status: 'TAKEN' });

        await service.markDose('dep-1', 'sched-1', 'TAKEN');

        expect(prisma.inventory.findUnique).not.toHaveBeenCalled();
        expect(prisma.inventory.update).not.toHaveBeenCalled();
        expect(notifications.processInventoryAlerts).not.toHaveBeenCalled();
      });
    });

    describe('D-05 MISSED does not decrement', () => {
      it('skips inventory update when marking MISSED', async () => {
        prisma.doseLog.findFirst.mockResolvedValue(null);
        mockScheduleFindUnique(prisma, 'inv-1');
        prisma.doseLog.create.mockResolvedValue({ id: 'log-new', status: 'MISSED' });

        await service.markDose('dep-1', 'sched-1', 'MISSED');

        expect(prisma.doseLog.create).toHaveBeenCalledWith({
          data: expect.objectContaining({ status: 'MISSED' }),
        });
        expect(prisma.inventory.update).not.toHaveBeenCalled();
        expect(notifications.notifyDoseMissed).toHaveBeenCalled();
      });
    });
  });
});
