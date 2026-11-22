

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

import {
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AccessControlService } from './access-control.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { JwtStrategy } from '../auth/jwt.strategy';
import { createPrismaMock, PrismaMock } from '../../test/helpers/prisma.mock';

describe('Category A - access rules and IDOR protection', () => {
  let prisma: PrismaMock;
  let access: AccessControlService;
  let users: UsersService;
  let jwtStrategy: JwtStrategy;

  const notifications = {
    formatUserName: jest.fn().mockReturnValue('Jan'),
    notifySos: jest.fn(),
    notifyMood: jest.fn(),
  };

  beforeEach(async () => {
    prisma = createPrismaMock();
    access = new AccessControlService(prisma as unknown as PrismaService);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
        { provide: AccessControlService, useValue: access },
      ],
    }).compile();

    users = module.get(UsersService);
    jwtStrategy = new JwtStrategy(prisma as unknown as PrismaService);
  });


  describe('A-01 Self-access (assertCanAccessUser)', () => {
    it('allows owner access to own userId without querying Connection', async () => {
      await expect(access.assertCanAccessUser('u1', 'u1')).resolves.toBeUndefined();
      expect(prisma.connection.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('A-02 paired caretaker [K]', () => {
    it('allows caretaker with isPaired=true to access dependent data', async () => {
      prisma.connection.findFirst.mockResolvedValue({ id: 'c1' });

      await expect(access.assertCanAccessUser('care-1', 'dep-1')).resolves.toBeUndefined();

      expect(prisma.connection.findFirst).toHaveBeenCalledWith({
        where: {
          caretakerId: 'care-1',
          dependentId: 'dep-1',
          isPaired: true,
        },
        select: { id: true },
      });
    });
  });

  describe('A-03 foreign caretaker / IDOR [K]', () => {
    it('rejects access when not paired (ForbiddenException)', async () => {
      prisma.connection.findFirst.mockResolvedValue(null);

      await expect(access.assertCanAccessUser('stranger', 'dep-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('A-04 HYBRID = self', () => {
    it('HYBRID can access only own userId', async () => {
      await expect(
        access.assertCanAccessUser('hybrid-1', 'hybrid-1'),
      ).resolves.toBeUndefined();
    });

    it('HYBRID cannot access another userId', async () => {
      prisma.connection.findFirst.mockResolvedValue(null);

      await expect(access.assertCanAccessUser('hybrid-1', 'dep-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('A-05 missing schedule', () => {
    it('throws NotFoundException when schedule does not exist', async () => {
      prisma.schedule.findUnique.mockResolvedValue(null);

      await expect(access.assertCanAccessSchedule('u1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('A-06 foreign schedule [K]', () => {
    it('when schedule exists but actor is not owner or paired - 403', async () => {
      prisma.schedule.findUnique.mockResolvedValue({ userId: 'dep-1' });
      prisma.connection.findFirst.mockResolvedValue(null);

      await expect(access.assertCanAccessSchedule('stranger', 'sched-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('paired caretaker gets access and owner userId', async () => {
      prisma.schedule.findUnique.mockResolvedValue({ userId: 'dep-1' });
      prisma.connection.findFirst.mockResolvedValue({ id: 'c1' });

      await expect(access.assertCanAccessSchedule('care-1', 'sched-1')).resolves.toEqual({
        userId: 'dep-1',
      });
    });
  });

  describe('A-07 missing inventory', () => {
    it('throws NotFoundException when inventory does not exist', async () => {
      prisma.inventory.findUnique.mockResolvedValue(null);

      await expect(access.assertCanAccessInventory('u1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('A-08 foreign inventory [K]', () => {
    it('when item exists but pairing missing - ForbiddenException', async () => {
      prisma.inventory.findUnique.mockResolvedValue({ userId: 'dep-1' });
      prisma.connection.findFirst.mockResolvedValue(null);

      await expect(access.assertCanAccessInventory('stranger', 'inv-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('paired caretaker gets access to dependent inventory', async () => {
      prisma.inventory.findUnique.mockResolvedValue({ userId: 'dep-1' });
      prisma.connection.findFirst.mockResolvedValue({ id: 'c1' });

      await expect(access.assertCanAccessInventory('care-1', 'inv-1')).resolves.toEqual({
        userId: 'dep-1',
      });
    });
  });


  describe('A-09 senior settings by caretaker [K]', () => {
    it('rejects when caretaker is not paired', async () => {
      prisma.connection.findFirst.mockResolvedValue(null);

      await expect(
        users.updateDependentSettingsByCaretaker('care-1', 'dep-1', {
          highContrast: true,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects when target role is not DEPENDENT', async () => {
      prisma.connection.findFirst.mockResolvedValue({ id: 'c1' });
      prisma.user.findUnique.mockResolvedValue({ id: 'dep-1', role: 'HYBRID' });

      await expect(
        users.updateDependentSettingsByCaretaker('care-1', 'dep-1', {
          highContrast: true,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('paired caretaker updates DEPENDENT settings', async () => {
      prisma.connection.findFirst.mockResolvedValue({ id: 'c1' });
      prisma.user.findUnique.mockResolvedValue({ id: 'dep-1', role: 'DEPENDENT' });
      prisma.user.update.mockResolvedValue({
        id: 'dep-1',
        highContrast: true,
        moodEnabled: true,
        moodCheckTimes: ['08:00'],
        vitalsEntryEnabled: false,
        colorBlindFriendly: false,
        appLanguage: 'pl',
        medicationSoundChoice: 'default',
      });

      await expect(
        users.updateDependentSettingsByCaretaker('care-1', 'dep-1', {
          highContrast: true,
        }),
      ).resolves.toMatchObject({ id: 'dep-1', highContrast: true });

      expect(prisma.user.update).toHaveBeenCalled();
    });
  });

  describe('A-10 Unpair / delete dependent [K]', () => {
    it('unpairDependent: no pairing -> ForbiddenException', async () => {
      prisma.connection.findFirst.mockResolvedValue(null);

      await expect(users.unpairDependent('stranger', 'dep-1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.connection.deleteMany).not.toHaveBeenCalled();
    });

    it('unpairDependent: paired caretaker deletes Connection', async () => {
      prisma.connection.findFirst.mockResolvedValue({ id: 'c1' });
      prisma.connection.deleteMany.mockResolvedValue({ count: 1 });

      await expect(users.unpairDependent('care-1', 'dep-1')).resolves.toEqual({ ok: true });
      expect(prisma.connection.deleteMany).toHaveBeenCalledWith({
        where: { caretakerId: 'care-1', dependentId: 'dep-1', isPaired: true },
      });
    });

    it('deleteDependentAccount: no pairing -> ForbiddenException', async () => {
      prisma.connection.findFirst.mockResolvedValue(null);

      await expect(users.deleteDependentAccount('stranger', 'dep-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('deleteDependentAccount: paired caretaker + DEPENDENT -> purge', async () => {
      prisma.connection.findFirst.mockResolvedValue({ id: 'c1' });
      prisma.user.findUnique.mockResolvedValue({ id: 'dep-1', role: 'DEPENDENT' });

      prisma.$transaction.mockResolvedValue(undefined);

      await expect(users.deleteDependentAccount('care-1', 'dep-1')).resolves.toEqual({
        ok: true,
      });
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('A-11 history lists always go through assertCanAccessUser', () => {
    const from = new Date('2026-01-01T00:00:00.000Z');
    const to = new Date('2026-02-01T00:00:00.000Z');

    it('listSosLogs: foreign actor -> 403, sosLog not queried', async () => {
      prisma.connection.findFirst.mockResolvedValue(null);

      await expect(users.listSosLogs('stranger', 'dep-1', from, to)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.sosLog.findMany).not.toHaveBeenCalled();
    });

    it('listSosLogs: paired caretaker -> returns logs', async () => {
      prisma.connection.findFirst.mockResolvedValue({ id: 'c1' });
      prisma.sosLog.findMany.mockResolvedValue([{ id: 'sos-1' }]);

      await expect(users.listSosLogs('care-1', 'dep-1', from, to)).resolves.toEqual([
        { id: 'sos-1' },
      ]);
      expect(prisma.sosLog.findMany).toHaveBeenCalled();
    });

    it('getMoodHistory: foreign actor -> 403', async () => {
      prisma.connection.findFirst.mockResolvedValue(null);

      await expect(users.getMoodHistory('stranger', 'dep-1', from, to)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.moodLog.findMany).not.toHaveBeenCalled();
    });

    it('listHealthMetricLogs: self → OK', async () => {
      prisma.healthMetricLog.findMany.mockResolvedValue([{ id: 'm1' }]);

      await expect(
        users.listHealthMetricLogs('dep-1', 'dep-1', from, to),
      ).resolves.toEqual([{ id: 'm1' }]);
      expect(prisma.connection.findFirst).not.toHaveBeenCalled();
    });
  });



  describe('A-12 JWT without user in DB', () => {
    it('validate throws UnauthorizedException when user missing', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(jwtStrategy.validate({ sub: 'deleted-user' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('validate returns userId/email/role when user exists', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        role: 'DEPENDENT',
      });

      await expect(jwtStrategy.validate({ sub: 'u1' })).resolves.toEqual({
        userId: 'u1',
        email: 'a@b.com',
        role: 'DEPENDENT',
      });
    });
  });
});
