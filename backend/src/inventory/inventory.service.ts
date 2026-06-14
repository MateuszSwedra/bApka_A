import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { calculateInventoryDepletion } from './inventory-depletion';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, data: any) {
    return this.prisma.inventory.create({
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
  }

  async findAll(userId: string) {
    return this.prisma.inventory.findMany({
      where: { userId },
    });
  }

  async findOne(id: string) {
    return this.prisma.inventory.findUnique({
      where: { id },
    });
  }

  async update(id: string, data: any) {
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
          return this.prisma.inventory.update({
            where: { id },
            data: reset,
          });
        }
      }
    }

    return updated;
  }

  async remove(id: string) {
    const item = await this.prisma.inventory.findUnique({
      where: { id },
      select: { name: true },
    });
    if (!item) {
      return this.prisma.inventory.delete({ where: { id } });
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
    return this.prisma.inventory.delete({
      where: { id },
    });
  }
  
  async calculateDepletion(id: string) {
    const inventory = await this.prisma.inventory.findUnique({
      where: { id },
      include: { schedules: true },
    });
    if (!inventory) return null;
    return calculateInventoryDepletion(inventory);
  }
}