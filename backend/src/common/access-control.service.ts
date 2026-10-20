import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Self or paired caretaker of the target user may access that user's care data.
 */
@Injectable()
export class AccessControlService {
  constructor(private readonly prisma: PrismaService) {}

  async assertCanAccessUser(actorId: string, targetUserId: string): Promise<void> {
    if (actorId === targetUserId) {
      return;
    }

    const connection = await this.prisma.connection.findFirst({
      where: {
        caretakerId: actorId,
        dependentId: targetUserId,
        isPaired: true,
      },
      select: { id: true },
    });

    if (!connection) {
      throw new ForbiddenException('Brak uprawnień do tego zasobu');
    }
  }

  async assertCanAccessSchedule(
    actorId: string,
    scheduleId: string,
  ): Promise<{ userId: string }> {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id: scheduleId },
      select: { userId: true },
    });
    if (!schedule) {
      throw new NotFoundException('Harmonogram nie istnieje');
    }
    await this.assertCanAccessUser(actorId, schedule.userId);
    return schedule;
  }

  async assertCanAccessInventory(
    actorId: string,
    inventoryId: string,
  ): Promise<{ userId: string }> {
    const item = await this.prisma.inventory.findUnique({
      where: { id: inventoryId },
      select: { userId: true },
    });
    if (!item) {
      throw new NotFoundException('Pozycja magazynu nie istnieje');
    }
    await this.assertCanAccessUser(actorId, item.userId);
    return item;
  }
}
