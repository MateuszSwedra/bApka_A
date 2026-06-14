import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { FirebaseSosService } from './firebase-sos.service';
import { PrismaService } from '../prisma/prisma.service';
import { createPrismaMock } from '../../test/helpers/prisma.mock';

describe('NotificationsService', () => {
  let service: NotificationsService;
  const prisma = createPrismaMock();
  const firebaseSos = {
    isEnabled: jest.fn().mockReturnValue(false),
    sendSosAlarm: jest.fn().mockResolvedValue({ sent: false }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: FirebaseSosService, useValue: firebaseSos },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('notifySos sends to paired caretaker tokens', async () => {
    prisma.connection.findMany.mockResolvedValue([
      {
        caretaker: {
          id: 'caretaker-1',
          fcmToken: 'ExponentPushToken[abc]',
          nativePushToken: null,
        },
      },
    ]);

    await service.notifySos('dep-1', 'Jan');

    expect(prisma.connection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { dependentId: 'dep-1', isPaired: true },
      }),
    );
  });

  it('processInventoryAlerts skips non-medication items', async () => {
    prisma.inventory.findUnique.mockResolvedValue({
      id: 'inv-vitals',
      type: 'BLOOD_SUGAR',
      name: 'Pomiar cukru',
      lowStockAlertSent: false,
      emptyAlertSent: false,
      schedules: [{ type: 'DAILY', dosage: '1', daysOfWeek: [1, 2, 3, 4, 5, 6, 7] }],
      user: {
        id: 'u1',
        name: 'Jan',
        email: 'jan@test.pl',
        role: 'HYBRID',
        fcmToken: 'ExponentPushToken[x]',
      },
    });

    await service.processInventoryAlerts('inv-vitals');

    expect(prisma.inventory.update).not.toHaveBeenCalled();
  });

  it('notifySos skips Expo when FCM succeeds', async () => {
    firebaseSos.isEnabled.mockReturnValue(true);
    firebaseSos.sendSosAlarm.mockResolvedValue({ sent: true });
    const sendSpy = jest.spyOn(service, 'sendToTokens').mockResolvedValue();
    prisma.connection.findMany.mockResolvedValue([
      {
        caretaker: {
          id: 'caretaker-1',
          fcmToken: 'ExponentPushToken[abc]',
          nativePushToken: 'native-fcm-token',
        },
      },
    ]);

    await service.notifySos('dep-1', 'Jan');

    expect(firebaseSos.sendSosAlarm).toHaveBeenCalled();
    expect(sendSpy).not.toHaveBeenCalled();
    sendSpy.mockRestore();
  });

  it('notifySos sends Expo with title when FCM not sent', async () => {
    firebaseSos.isEnabled.mockReturnValue(false);
    const sendSpy = jest.spyOn(service, 'sendToTokens').mockResolvedValue();
    prisma.connection.findMany.mockResolvedValue([
      {
        caretaker: {
          id: 'caretaker-1',
          fcmToken: 'ExponentPushToken[abc]',
          nativePushToken: null,
        },
      },
    ]);

    await service.notifySos('dep-1', 'Jan');

    expect(sendSpy).toHaveBeenCalledWith(
      ['ExponentPushToken[abc]'],
      expect.objectContaining({
        title: 'SOS!',
        body: expect.stringContaining('Jan'),
      }),
    );
    sendSpy.mockRestore();
  });

  it('notifySos clears stale nativePushToken when FCM reports unregistered', async () => {
    firebaseSos.isEnabled.mockReturnValue(true);
    firebaseSos.sendSosAlarm.mockResolvedValue({ sent: false, invalidToken: true });
    prisma.connection.findMany.mockResolvedValue([
      {
        caretaker: {
          id: 'caretaker-1',
          fcmToken: 'ExponentPushToken[abc]',
          nativePushToken: 'stale-fcm-token',
        },
      },
    ]);
    prisma.user.update.mockResolvedValue({ id: 'caretaker-1' });

    await service.notifySos('dep-1', 'Jan');

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'caretaker-1' },
      data: { nativePushToken: null },
    });
  });
});
