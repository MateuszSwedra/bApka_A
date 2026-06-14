import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { createPrismaMock } from '../../test/helpers/prisma.mock';

describe('UsersService', () => {
  let service: UsersService;
  const prisma = createPrismaMock();
  const notifications = {
    formatUserName: jest.fn().mockReturnValue('Jan'),
    notifySos: jest.fn(),
    notifyMood: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();
    service = module.get<UsersService>(UsersService);
  });

  describe('getProfile', () => {
    it('throws when user missing', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getProfile('missing')).rejects.toThrow(NotFoundException);
    });

    it('returns profile fields', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        name: 'Jan',
        role: 'DEPENDENT',
        moodEnabled: true,
        fcmToken: null,
      });
      prisma.connection.findFirst.mockResolvedValue({ id: 'c1' });
      await expect(service.getProfile('u1')).resolves.toMatchObject({
        email: 'a@b.com',
        name: 'Jan',
        isPairedWithCaretaker: true,
        hasPushToken: false,
      });
    });
  });

  describe('generatePin', () => {
    it('clears old unpaired connections and returns 6-digit pin', async () => {
      prisma.connection.create.mockImplementation(({ data }) =>
        Promise.resolve({ pin: data.pin }),
      );

      const { pin } = await service.generatePin('caretaker-1');
      expect(prisma.connection.deleteMany).toHaveBeenCalledWith({
        where: { caretakerId: 'caretaker-1', isPaired: false },
      });
      expect(pin).toMatch(/^\d{6}$/);
    });
  });

  describe('pairWithPin', () => {
    it('rejects non-dependent users', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'CARETAKER' });
      await expect(service.pairWithPin('u1', '123456')).rejects.toThrow(NotFoundException);
    });

    it('rejects invalid pin', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'd1', role: 'DEPENDENT' });
      prisma.connection.findUnique.mockResolvedValue(null);
      await expect(service.pairWithPin('d1', '000000')).rejects.toThrow(NotFoundException);
    });

    it('pairs and clears pin', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'd1', role: 'DEPENDENT' });
      prisma.connection.findUnique.mockResolvedValue({
        id: 'c1',
        isPaired: false,
      });
      prisma.connection.update.mockResolvedValue({ id: 'c1', isPaired: true });

      await service.pairWithPin('d1', '123456');
      expect(prisma.connection.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: expect.objectContaining({
          dependentId: 'd1',
          isPaired: true,
          pin: null,
        }),
      });
    });
  });

  describe('getDependents', () => {
    it('maps paired dependents', async () => {
      prisma.connection.findMany.mockResolvedValue([
        { dependent: { id: 'd1', email: 'd@test.pl', name: 'Senior' } },
      ]);
      await expect(service.getDependents('c1')).resolves.toEqual([
        { id: 'd1', email: 'd@test.pl', name: 'Senior' },
      ]);
    });
  });

  describe('updateDisplayName', () => {
    it('rejects too short name', async () => {
      await expect(service.updateDisplayName('u1', 'A')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('trims and saves valid name', async () => {
      prisma.user.update.mockResolvedValue({
        id: 'u1',
        name: 'Basia',
      });
      await service.updateDisplayName('u1', '  Basia  ');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { name: 'Basia' } }),
      );
    });
  });

  describe('updateMood', () => {
    it('updates lastMood, logs mood and notifies caretakers', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        name: 'Jan',
        email: 'jan@test.pl',
      });
      prisma.user.update.mockResolvedValue({
        id: 'u1',
        lastMood: 'happy',
      });
      await service.updateMood('u1', 'happy');
      expect(notifications.notifyMood).toHaveBeenCalledWith('u1', 'Jan', 'happy');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ lastMood: 'happy' }),
        }),
      );
    });
  });

  describe('createSosLog', () => {
    it('creates log and notifies caretakers', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'dep-1',
        name: 'Jan',
        email: 'jan@test.pl',
      });
      prisma.sosLog.create.mockResolvedValue({ id: 'sos-1' });

      await service.createSosLog('dep-1', '  potrzebuję pomocy ');

      expect(prisma.sosLog.create).toHaveBeenCalled();
      expect(notifications.notifySos).toHaveBeenCalledWith(
        'dep-1',
        'Jan',
        '  potrzebuję pomocy ',
      );
    });

    it('throws when user missing', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.createSosLog('missing')).rejects.toThrow(NotFoundException);
    });
  });
});
