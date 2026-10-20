import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { calculateInventoryDepletion } from './inventory-depletion';
import { NotificationsService } from '../notifications/notifications.service';
import { AccessControlService } from '../common/access-control.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private access: AccessControlService,
  ) {}

  private async notifyDataChanged(
    dependentId: string,
    action: 'created' | 'updated' | 'deleted',
    entityId?: string,
  ): Promise<void> {
    try {
      await this.notifications.notifyDependentDataChanged(dependentId, {
        entity: 'inventory',
        action,
        entityId,
      });
    } catch (error) {
      console.warn('Nie udało się wysłać data_changed (inventory)', error);
    }
  }

  async create(actorId: string, userId: string, data: CreateInventoryDto) {
    await this.access.assertCanAccessUser(actorId, userId);
    const created = await this.prisma.inventory.create({
      data: {
        userId,
        name: data.name,
        type: data.type || 'MEDICATION',
        description: data.description,
        totalPills: data.totalPills,
        currentPills: data.currentPills ?? data.totalPills,
        pillsPerDose: data.pillsPerDose ?? 1,
      },
    });
    await this.notifyDataChanged(userId, 'created', created.id);
    return created;
  }

  async findAll(actorId: string, userId: string) {
    await this.access.assertCanAccessUser(actorId, userId);
    return this.prisma.inventory.findMany({
      where: { userId },
    });
  }

  async findOne(actorId: string, id: string) {
    await this.access.assertCanAccessInventory(actorId, id);
    return this.prisma.inventory.findUnique({
      where: { id },
    });
  }

  async update(actorId: string, id: string, data: UpdateInventoryDto) {
    await this.access.assertCanAccessInventory(actorId, id);
    const updated = await this.prisma.inventory.update({
      where: { id },
      data,
    });

    if (data.currentPills !== undefined || data.totalPills !== undefined) {
      const full = await this.prisma.inventory.findUnique({
        where: { id },
        include: { schedules: true },
      });
      if (full) {
        const { daysLeft, pillsLeft } = calculateInventoryDepletion(full);
        const reset: { lowStockAlertSent?: boolean; emptyAlertSent?: boolean } =
          {};
        if (daysLeft > 7) reset.lowStockAlertSent = false;
        if (pillsLeft > 0) reset.emptyAlertSent = false;
        if (Object.keys(reset).length > 0) {
          const resetUpdated = await this.prisma.inventory.update({
            where: { id },
            data: reset,
          });
          await this.notifyDataChanged(resetUpdated.userId, 'updated', resetUpdated.id);
          return resetUpdated;
        }
      }
    }

    await this.notifyDataChanged(updated.userId, 'updated', updated.id);
    return updated;
  }

  async remove(actorId: string, id: string) {
    await this.access.assertCanAccessInventory(actorId, id);
    const item = await this.prisma.inventory.findUnique({
      where: { id },
      select: { name: true, userId: true },
    });
    if (!item) {
      throw new NotFoundException('Pozycja magazynu nie istnieje');
    }

    const schedules = await this.prisma.schedule.findMany({
      where: {
        OR: [
          { inventoryId: id },
          { inventoryId: null, medication: item.name },
        ],
      },
      select: { id: true },
    });
    const scheduleIds = schedules.map((s) => s.id);
    if (scheduleIds.length > 0) {
      await this.prisma.doseLog.deleteMany({
        where: { scheduleId: { in: scheduleIds } },
      });
      await this.prisma.schedule.deleteMany({
        where: { id: { in: scheduleIds } },
      });
    }
    const deleted = await this.prisma.inventory.delete({
      where: { id },
    });
    await this.notifyDataChanged(item.userId, 'deleted', id);
    return deleted;
  }
  
  async calculateDepletion(actorId: string, id: string) {
    await this.access.assertCanAccessInventory(actorId, id);
    const inventory = await this.prisma.inventory.findUnique({
      where: { id },
      include: { schedules: true },
    });
    if (!inventory) return null;
    return calculateInventoryDepletion(inventory);
  }
}