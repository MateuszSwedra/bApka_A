

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

import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AccessControlService } from '../common/access-control.service';
import { createPrismaMock, PrismaMock } from '../../test/helpers/prisma.mock';

describe('Category E - pairing and profile', () => {
  let prisma: PrismaMock;
  let service: UsersService;
  const notifications = {
    formatUserName: jest.fn().mockReturnValue('Daniel'),
    notifySos: jest.fn(),
    notifyMood: jest.fn(),
  };
  const access = {
    assertCanAccessUser: jest.fn().mockResolvedValue(undefined),
    assertCanAccessSchedule: jest.fn(),
    assertCanAccessInventory: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    access.assertCanAccessUser.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
        { provide: AccessControlService, useValue: access },
      ],
    }).compile();
    service = module.get(UsersService);
  });

 
  describe('E-01 pair only DEPENDENT [K]', () => {
    it('rejects CARETAKER and HYBRID as pairing actor', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'care-1', role: 'CARETAKER' });
      await expect(service.pairWithPin('care-1', '123456')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.connection.findUnique).not.toHaveBeenCalled();

      prisma.user.findUnique.mockResolvedValue({ id: 'hyb-1', role: 'HYBRID' });
      await expect(service.pairWithPin('hyb-1', '123456')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('E-02 bad or used PIN [K]', () => {
    it('rejects missing PIN and already paired connection', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'dep-1', role: 'DEPENDENT' });
      prisma.connection.findUnique.mockResolvedValue(null);
      await expect(service.pairWithPin('dep-1', '000000')).rejects.toThrow(
        NotFoundException,
      );

      prisma.connection.findUnique.mockResolvedValue({
        id: 'c-used',
        isPaired: true,
        pin: '123456',
      });
      await expect(service.pairWithPin('dep-1', '123456')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.connection.update).not.toHaveBeenCalled();
    });
  });

  describe('E-03 pair success', () => {
    it('sets isPaired true, links dependent, clears PIN', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'dep-1', role: 'DEPENDENT' });
      prisma.connection.findUnique.mockResolvedValue({
        id: 'c1',
        isPaired: false,
        pin: '654321',
      });
      prisma.connection.update.mockResolvedValue({
        id: 'c1',
        dependentId: 'dep-1',
        isPaired: true,
        pin: null,
      });

      await service.pairWithPin('dep-1', '654321');

      expect(prisma.connection.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: {
          dependentId: 'dep-1',
          isPaired: true,
          pin: null,
        },
      });
    });
  });

});
