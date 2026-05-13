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
        totalPills: data.totalPills ?? 0,
        currentPills: data.currentPills ?? data.totalPills ?? 0,
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
    return this.prisma.inventory.delete({
      where: { id },
    });
  }
  
  async calculateDepletion(id: string) {
    const inventory = await this.prisma.inventory.findUnique({
      where: { id },
      include: { schedules: true }
    });
    if (!inventory) return null;
    
    // Prosta logika: zakładamy codziennie po 1 dawce na każdy schedule typu DAILY
    const dailyDoses = inventory.schedules.filter((s: any) => s.type === 'DAILY').length;
    if (dailyDoses === 0) return { daysLeft: 999, pillsLeft: inventory.currentPills };
    
    const pillsPerDay = dailyDoses * inventory.pillsPerDose;
    const daysLeft = Math.floor(inventory.currentPills / pillsPerDay);
    
    return {
      daysLeft,
      pillsLeft: inventory.currentPills,
    };
  }
}
