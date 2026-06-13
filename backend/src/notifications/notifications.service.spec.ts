import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { createPrismaMock } from '../../test/helpers/prisma.mock';

describe('NotificationsService', () => {
  let service: NotificationsService;
  const prisma = createPrismaMock();

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('notifySos sends to paired caretaker tokens', async () => {
    prisma.connection.findMany.mockResolvedValue([
      { caretaker: { fcmToken: 'ExponentPushToken[abc]' } },
    ]);

    await service.notifySos('dep-1', 'Jan');

    expect(prisma.connection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { dependentId: 'dep-1', isPaired: true },
      }),
    );
  });
});
