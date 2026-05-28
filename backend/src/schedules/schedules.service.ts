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
        scheduledAt: {
          gte: today,
        },
      },
    });
  }

  async getDoseStats(userId: string, from: Date, to: Date) {
    const logs = await this.prisma.doseLog.findMany({
      where: {
        schedule: {
          userId,
        },
        scheduledAt: {
          gte: from,
          lt: to,
        },
      },
    });

    const takenCount = logs.filter((l) => l.status === 'TAKEN' || l.status === 'LATE').length;
    const lateCount = logs.filter((l) => l.status === 'LATE').length;
    const missedCount = logs.filter((l) => l.status === 'MISSED').length;
    const pendingCount = logs.filter((l) => l.status === 'PENDING').length;
    const totalPlanned = takenCount + missedCount + pendingCount;

    const WINDOW_MINUTES = 15;
    const msWindow = WINDOW_MINUTES * 60 * 1000;

    const onTimeTakenCount = logs.filter((l) => l.status === 'TAKEN').length;

    const onTimePercent =
      takenCount > 0 ? Math.round((onTimeTakenCount / takenCount) * 100) : 0;

    const dayKey = (d: Date) => d.toISOString().slice(0, 10); // UTC yyyy-mm-dd
    const dailyMap = new Map<
      string,
      { date: string; taken: number; late: number; missed: number; pending: number; takenOnTime: number; takenTotal: number }
    >();
    for (const l of logs) {
      const k = dayKey(l.scheduledAt);
      const existing =
        dailyMap.get(k) ?? { date: k, taken: 0, late: 0, missed: 0, pending: 0, takenOnTime: 0, takenTotal: 0 };
      if (l.status === 'TAKEN') {
        existing.taken += 1;
        existing.takenTotal += 1;
        existing.takenOnTime += 1;
      } else if (l.status === 'LATE') {
        existing.taken += 1;
        existing.late += 1;
        existing.takenTotal += 1;
      } else if (l.status === 'MISSED') {
        existing.missed += 1;
      } else {
        existing.pending += 1;
      }
      dailyMap.set(k, existing);
    }
    const daily = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    return {
      range: {
        from: from.toISOString(),
        to: to.toISOString(),
      },
      counts: {
        taken: takenCount,
        late: lateCount,
        missed: missedCount,
        pending: pendingCount,
        totalPlanned,
      },
      daily,
      onTime: {
        takenOnTime: onTimeTakenCount,
        percentOfTaken: onTimePercent,
        windowMinutes: WINDOW_MINUTES,
      },
    };
  }

  async markDose(scheduleId: string, status: 'TAKEN' | 'MISSED') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingLog = await this.prisma.doseLog.findFirst({
      where: {
        scheduleId,
        scheduledAt: {
          gte: today,
        },
      },
    });

    const now = new Date();
    const WINDOW_MINUTES = 15;
    const msWindow = WINDOW_MINUTES * 60 * 1000;

    const computeTakenStatus = (scheduledAt: Date | null | undefined) => {
      const scheduledMs = scheduledAt instanceof Date ? scheduledAt.getTime() : NaN;
      // Jeśli z jakiegoś powodu nie znamy scheduledAt (np. stary log / niepełny mock),
      // traktujemy jako "TAKEN" żeby nie blokować zapisu dawki.
      if (Number.isNaN(scheduledMs)) return 'TAKEN';
      const diff = Math.abs(now.getTime() - scheduledMs);
      return diff <= msWindow ? 'TAKEN' : 'LATE';
    };

    const isCompletionStatus = (s: string) => s === 'TAKEN' || s === 'LATE';

    if (existingLog) {
      const newStatus = status === 'TAKEN' ? computeTakenStatus(existingLog.scheduledAt) : status;
      const wasCompleted = isCompletionStatus(existingLog.status);
      const willBeCompleted = isCompletionStatus(newStatus);

      const updatedLog = await this.prisma.doseLog.update({
        where: { id: existingLog.id },
        data: {
          status: newStatus,
          takenAt: status === 'TAKEN' ? now : null,
          source: 'APP_SENIOR'
        },
      });

      // Zapas: odejmujemy tylko raz, gdy PENDING -> TAKEN/LATE.
      if (!wasCompleted && willBeCompleted) {
        const schedule = await this.prisma.schedule.findUnique({
          where: { id: scheduleId },
          select: { inventoryId: true },
        });
        if (schedule?.inventoryId) {
          const inv = await this.prisma.inventory.findUnique({
            where: { id: schedule.inventoryId },
            select: { currentPills: true, totalPills: true, pillsPerDose: true },
          });
          const perDose = inv?.pillsPerDose ?? 1;
          const cur = inv?.currentPills ?? inv?.totalPills ?? 0;
          const next = Math.max(0, cur - perDose);
          await this.prisma.inventory.update({
            where: { id: schedule.inventoryId },
            data: { currentPills: next },
          });
        }
      }

      return updatedLog;
    } else {
      // Jeśli log nie został wcześniej wygenerowany (np. backend był wyłączony o czasie dawki),
      // wyliczamy scheduledAt z Schedule.time, żeby poprawnie oznaczyć LATE.
      const schedule = await this.prisma.schedule.findUnique({ where: { id: scheduleId } });
      const planned = new Date(now);
      if (schedule?.time && /^\d{2}:\d{2}$/.test(schedule.time)) {
        const [hh, mm] = schedule.time.split(':').map((x) => Number(x));
        planned.setHours(hh, mm, 0, 0);
      }
      const newStatus = status === 'TAKEN' ? computeTakenStatus(planned) : status;
      const createdLog = await this.prisma.doseLog.create({
        data: {
          scheduleId,
          status: newStatus,
          scheduledAt: planned,
          takenAt: status === 'TAKEN' ? now : null,
          source: 'APP_SENIOR'
        },
      });

      // Zapas: jeśli od razu tworzymy wpis jako TAKEN/LATE, odejmujemy raz.
      if (isCompletionStatus(newStatus)) {
        if (schedule?.inventoryId) {
          const inv = await this.prisma.inventory.findUnique({
            where: { id: schedule.inventoryId },
            select: { currentPills: true, totalPills: true, pillsPerDose: true },
          });
          const perDose = inv?.pillsPerDose ?? 1;
          const cur = inv?.currentPills ?? inv?.totalPills ?? 0;
          const next = Math.max(0, cur - perDose);
          await this.prisma.inventory.update({
            where: { id: schedule.inventoryId },
            data: { currentPills: next },
          });
        }
      }

      return createdLog;
    }
  }
}
