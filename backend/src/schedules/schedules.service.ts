import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SchedulesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, data: any) {
    return this.prisma.schedule.create({
      data: {
        userId,
        createdById: data.createdById || null,
        inventoryId: data.inventoryId || null,
        medication: data.medication || null,
        dosage: data.dosage || "1",
        time: data.time,
        type: data.type || "DAILY",
        startDate: data.startDate || null,
        endDate: data.endDate || null,
        daysOfWeek: data.daysOfWeek || [],
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.schedule.findMany({
      where: { userId },
    });
  }

  async findOne(id: string) {
    return this.prisma.schedule.findUnique({
      where: { id },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.schedule.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.schedule.delete({
      where: { id },
    });
  }

  async getTodayDoseLogs(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.prisma.doseLog.findMany({
      where: {
        schedule: {
          userId: userId,
        },
        createdAt: {
          gte: today,
        },
      },
    });
  }

  async markDose(scheduleId: string, status: 'TAKEN' | 'MISSED') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingLog = await this.prisma.doseLog.findFirst({
      where: {
        scheduleId,
        createdAt: {
          gte: today,
        },
      },
    });

    if (existingLog) {
      return this.prisma.doseLog.update({
        where: { id: existingLog.id },
        data: {
          status,
          takenAt: status === 'TAKEN' ? new Date() : null,
          source: 'APP_SENIOR'
        },
      });
    } else {
      return this.prisma.doseLog.create({
        data: {
          scheduleId,
          status,
          scheduledAt: new Date(),
          takenAt: status === 'TAKEN' ? new Date() : null,
          source: 'APP_SENIOR'
        },
      });
    }
  }
}
