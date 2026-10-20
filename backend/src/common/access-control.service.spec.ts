import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AccessControlService } from './access-control.service';
import { PrismaService } from '../prisma/prisma.service';
import { createPrismaMock } from '../../test/helpers/prisma.mock';

describe('AccessControlService', () => {
  const prisma = createPrismaMock();
  let service: AccessControlService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AccessControlService(prisma as unknown as PrismaService);
  });

  describe('assertCanAccessUser', () => {
    it('allows self', async () => {
      await expect(service.assertCanAccessUser('u1', 'u1')).resolves.toBeUndefined();
      expect(prisma.connection.findFirst).not.toHaveBeenCalled();
    });

    it('allows paired caretaker', async () => {
      prisma.connection.findFirst.mockResolvedValue({ id: 'c1' });
      await expect(service.assertCanAccessUser('care-1', 'dep-1')).resolves.toBeUndefined();
      expect(prisma.connection.findFirst).toHaveBeenCalledWith({
        where: {
          caretakerId: 'care-1',
          dependentId: 'dep-1',
          isPaired: true,
        },
        select: { id: true },
      });
    });

    it('forbids unrelated user', async () => {
      prisma.connection.findFirst.mockResolvedValue(null);
      await expect(service.assertCanAccessUser('stranger', 'dep-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('assertCanAccessSchedule', () => {
    it('throws when schedule missing', async () => {
      prisma.schedule.findUnique.mockResolvedValue(null);
      await expect(service.assertCanAccessSchedule('u1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('checks ownership of schedule owner', async () => {
      prisma.schedule.findUnique.mockResolvedValue({ userId: 'dep-1' });
      prisma.connection.findFirst.mockResolvedValue({ id: 'c1' });
      await expect(service.assertCanAccessSchedule('care-1', 's1')).resolves.toEqual({
        userId: 'dep-1',
      });
    });
  });

  describe('assertCanAccessInventory', () => {
    it('throws when inventory missing', async () => {
      prisma.inventory.findUnique.mockResolvedValue(null);
      await expect(service.assertCanAccessInventory('u1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
