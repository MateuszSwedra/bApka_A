import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
    return this.prisma.inventory.update({
      where: { id },
      data,
    });
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
  
  private parseDosagePills(dosage?: string | null): number {
    if (!dosage?.trim()) return 1;
    const n = parseInt(dosage.replace(/[^0-9]/g, ''), 10);
    if (!n || n <= 0) return 1;
    return n;
  }

  async calculateDepletion(id: string) {
    const inventory = await this.prisma.inventory.findUnique({
      where: { id },
      include: { schedules: true },
    });
    if (!inventory) return null;

    const currentPills = inventory.currentPills ?? inventory.totalPills ?? 0;
    const recurring = inventory.schedules.filter(
      (s) => s.type !== 'ONCE',
    );

    if (recurring.length === 0) {
      return { daysLeft: 999, pillsLeft: currentPills };
    }

    let pillsPerWeek = 0;
    for (const s of recurring) {
      const pills = this.parseDosagePills(s.dosage);
      const days =
        s.daysOfWeek && s.daysOfWeek.length > 0
          ? s.daysOfWeek.length
          : s.type === 'TEMPORARY'
            ? 7
            : 0;
      pillsPerWeek += pills * days;
    }

    if (pillsPerWeek <= 0) {
      return { daysLeft: 999, pillsLeft: currentPills };
    }

    const pillsPerDay = pillsPerWeek / 7;
    const daysLeft =
      pillsPerDay > 0 ? Math.floor(currentPills / pillsPerDay) : 999;

    return {
      daysLeft,
      pillsLeft: currentPills,
    };
  }
}
