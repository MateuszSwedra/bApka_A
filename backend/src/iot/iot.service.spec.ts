import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { IotService } from './iot.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { SchedulesService } from '../schedules/schedules.service';
import { createPrismaMock } from '../../test/helpers/prisma.mock';
import { sha256Hex } from './iot-crypto';

describe('IotService', () => {
  let service: IotService;
  const prisma = createPrismaMock();
  const users = {
    updateMood: jest.fn(),
    createSosLog: jest.fn(),
    deleteDependentAccount: jest.fn(),
  };
  const schedules = {
    markDose: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(
      async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IotService,
        { provide: PrismaService, useValue: prisma },
        { provide: UsersService, useValue: users },
        { provide: SchedulesService, useValue: schedules },
      ],
    }).compile();

    service = module.get(IotService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('prepareDevice', () => {
    it('rejects non-caretaker', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        role: Role.DEPENDENT,
      });
      await expect(service.prepareDevice('u1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('creates dependent + connection + device and returns claimToken', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: 'c1', role: Role.CARETAKER })
        .mockResolvedValue(null);
      prisma.device.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'dep-1',
        name: 'Płytka',
        email: 'iot-abcd@device.bapka.local',
      });
      prisma.connection.create.mockResolvedValue({ id: 'conn-1' });
      prisma.device.create.mockResolvedValue({
        id: 'dev-1',
        publicId: 'ABCD',
        name: 'Płytka',
        dependentUserId: 'dep-1',
        claimTokenExpiresAt: new Date(Date.now() + 60_000),
        createdAt: new Date(),
      });

      const result = await service.prepareDevice('c1', 'Płytka');

      expect(result.deviceId).toBe('dev-1');
      expect(result.claimToken).toHaveLength(8);
      expect(result.softApSsid).toBe('bApka-ABCD');
      expect(prisma.connection.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            caretakerId: 'c1',
            dependentId: 'dep-1',
            isPaired: true,
          }),
        }),
      );
    });
  });

  describe('claimDevice', () => {
    it('exchanges claimToken for deviceSecret', async () => {
      const claimToken = 'ABCD2345';
      prisma.device.findFirst.mockResolvedValue({
        id: 'dev-1',
        publicId: 'ABCD',
        secretHash: null,
        claimTokenHash: sha256Hex(claimToken),
        claimTokenExpiresAt: new Date(Date.now() + 60_000),
        dependentUserId: 'dep-1',
        name: 'Płytka',
      });
      prisma.device.update.mockResolvedValue({
        id: 'dev-1',
        publicId: 'ABCD',
        dependentUserId: 'dep-1',
        name: 'Płytka',
      });

      const result = await service.claimDevice(claimToken);

      expect(result.deviceSecret).toHaveLength(64);
      expect(prisma.device.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'dev-1' },
          data: expect.objectContaining({
            claimTokenHash: null,
            wifiConfigured: true,
          }),
        }),
      );
    });

    it('rejects unknown token', async () => {
      prisma.device.findFirst.mockResolvedValue(null);
      await expect(service.claimDevice('missing-token-xx')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('idempotency', () => {
    const device = {
      id: 'dev-1',
      publicId: 'ABCD',
      caretakerId: 'c1',
      dependentUserId: 'dep-1',
      name: 'Płytka',
    };

    it('sos skips duplicate clientEventId', async () => {
      prisma.deviceEvent.create.mockRejectedValue({ code: 'P2002' });
      const result = await service.sosFromDevice(device, undefined, 'evt-sos-1');
      expect(result).toEqual({
        duplicate: true,
        kind: 'SOS',
        clientEventId: 'evt-sos-1',
      });
      expect(users.createSosLog).not.toHaveBeenCalled();
    });

    it('sos fires once for new clientEventId', async () => {
      prisma.deviceEvent.create.mockResolvedValue({ id: 'e1' });
      prisma.device.update.mockResolvedValue({});
      users.createSosLog.mockResolvedValue({ id: 'sos-1' });

      const result = await service.sosFromDevice(device, 'help', 'evt-sos-2');

      expect(users.createSosLog).toHaveBeenCalledWith(
        'dep-1',
        'help',
        'DEVICE_ESP32',
      );
      expect(result).toEqual({
        duplicate: false,
        log: { id: 'sos-1' },
      });
    });

    it('markDose reuses schedules.markDose with DEVICE_ESP32', async () => {
      prisma.deviceEvent.create.mockResolvedValue({ id: 'e2' });
      prisma.device.update.mockResolvedValue({});
      schedules.markDose.mockResolvedValue({ id: 'log-1', status: 'TAKEN' });

      await service.markDoseFromDevice(device, 'sched-1', 'TAKEN', 'evt-mark-1');

      expect(schedules.markDose).toHaveBeenCalledWith(
        'dep-1',
        'sched-1',
        'TAKEN',
        'DEVICE_ESP32',
      );
    });
  });
});
