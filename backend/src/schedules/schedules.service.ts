import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  formatLocalYmd,
  getLocalDayRange,
  scheduledAtOnLocalDay,
} from '../common/app-timezone';

const DOSE_CONFIRMATION_WINDOW_MINUTES = 5;

@Injectable()
export class SchedulesService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  private scheduledAtToday(time: string | null | undefined): Date {
    if (time && /^\d{2}:\d{2}$/.test(time)) {
      return scheduledAtOnLocalDay(time);
    }
    return scheduledAtOnLocalDay('00:00');
  }

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

  /** Zakres [początek dnia, początek następnego) dla yyyy-MM-dd z klienta (strefa APP_TIMEZONE). */
  private calendarDayRange(dateYmd?: string): { start: Date; end: Date } {
    return getLocalDayRange(dateYmd);
  }

  async getTodayDoseLogs(userId: string, dateYmd?: string) {
    const { start, end } = this.calendarDayRange(dateYmd);

    return this.prisma.doseLog.findMany({
      where: {
        schedule: {
          userId: userId,
        },
        scheduledAt: {
          gte: start,
          lt: end,
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
      include: {
        schedule: {
          select: {
            id: true,
            medication: true,
            time: true,
            inventoryId: true,
            inventory: { select: { name: true } },
          },
        },
      },
    });

    const takenCount = logs.filter((l) => l.status === 'TAKEN' || l.status === 'LATE').length;
    const lateCount = logs.filter((l) => l.status === 'LATE').length;
    const missedCount = logs.filter((l) => l.status === 'MISSED').length;
    const pendingCount = logs.filter((l) => l.status === 'PENDING').length;
    const totalPlanned = takenCount + missedCount + pendingCount;

    const WINDOW_MINUTES = DOSE_CONFIRMATION_WINDOW_MINUTES;
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

    const medMap = new Map<
      string,
      { medKey: string; name: string; taken: number; late: number; missed: number; pending: number }
    >();
    for (const l of logs) {
      const sch = l.schedule;
      const medKey = sch.inventoryId ?? sch.medication ?? sch.id;
      const name =
        sch.inventory?.name?.trim() ||
        sch.medication?.trim() ||
        `${sch.time}`;
      const row =
        medMap.get(medKey) ?? { medKey, name, taken: 0, late: 0, missed: 0, pending: 0 };
      if (l.status === 'TAKEN') row.taken += 1;
      else if (l.status === 'LATE') {
        row.taken += 1;
        row.late += 1;
      } else if (l.status === 'MISSED') row.missed += 1;
      else row.pending += 1;
      medMap.set(medKey, row);
    }
    const byMedication = Array.from(medMap.values()).sort((a, b) => a.name.localeCompare(b.name));

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
      byMedication,
      onTime: {
        takenOnTime: onTimeTakenCount,
        percentOfTaken: onTimePercent,
        windowMinutes: WINDOW_MINUTES,
      },
    };
  }

  async markDose(scheduleId: string, status: 'TAKEN' | 'MISSED') {
    const now = new Date();
    const todayYmd = formatLocalYmd(now);
    const { start, end } = this.calendarDayRange(todayYmd);

    const schedule = await this.prisma.schedule.findUnique({
      where: { id: scheduleId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        inventory: { select: { name: true } },
      },
    });
    const planned = this.scheduledAtToday(schedule?.time ?? undefined);

    const existingLog = await this.prisma.doseLog.findFirst({
      where: {
        scheduleId,
        scheduledAt: {
          gte: start,
          lt: end,
        },
      },
      orderBy: { scheduledAt: 'desc' },
    });

    const msWindow = DOSE_CONFIRMATION_WINDOW_MINUTES * 60 * 1000;

    const computeTakenStatus = (scheduledAt: Date) => {
      const lateAfterMs = scheduledAt.getTime() + msWindow;
      return now.getTime() > lateAfterMs ? 'LATE' : 'TAKEN';
    };

    const isCompletionStatus = (s: string) => s === 'TAKEN' || s === 'LATE';

    const notifyCaretakersIfNeeded = async (
      newStatus: string,
      previousStatus: string | null,
    ) => {
      if (!schedule?.user) return;

      const dependentId = schedule.user.id;
      const dependentName = this.notifications.formatUserName(schedule.user);
      const medName = this.notifications.formatMedName(schedule);
      const prev = previousStatus ?? 'NONE';

      if (
        (newStatus === 'TAKEN' || newStatus === 'LATE') &&
        prev !== 'TAKEN' &&
        prev !== 'LATE'
      ) {
        await this.notifications.notifyDoseTaken(
          dependentId,
          dependentName,
          medName,
          newStatus === 'LATE',
          scheduleId,
        );
      } else if (newStatus === 'MISSED' && prev !== 'MISSED') {
        await this.notifications.notifyDoseMissed(
          dependentId,
          dependentName,
          medName,
          scheduleId,
        );
      }
    };

    if (existingLog) {
      const newStatus = status === 'TAKEN' ? computeTakenStatus(planned) : status;
      const wasCompleted = isCompletionStatus(existingLog.status);
      const willBeCompleted = isCompletionStatus(newStatus);
      const previousStatus = existingLog.status;

      const updatedLog = await this.prisma.doseLog.update({
        where: { id: existingLog.id },
        data: {
          status: newStatus,
          scheduledAt: planned,
          takenAt: status === 'TAKEN' ? now : null,
          source: 'APP_SENIOR',
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

      await notifyCaretakersIfNeeded(newStatus, previousStatus);
      return updatedLog;
    } else {
      const planned = this.scheduledAtToday(schedule?.time ?? undefined);
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

      await notifyCaretakersIfNeeded(newStatus, null);
      return createdLog;
    }
  }
}
