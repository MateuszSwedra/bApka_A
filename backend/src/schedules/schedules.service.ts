import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  formatLocalYmd,
  getLocalDayRange,
  scheduledAtOnLocalDay,
} from '../common/app-timezone';
import { buildDoseStatsPayload } from './dose-stats.build';

import { DOSE_CONFIRMATION_WINDOW_MINUTES } from '../common/dose-windows';
import { isMedicationInventory } from '../inventory/inventory-depletion';

@Injectable()
export class SchedulesService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  private async notifyDataChanged(
    dependentId: string,
    action: 'created' | 'updated' | 'deleted',
    entityId?: string,
  ): Promise<void> {
    try {
      await this.notifications.notifyDependentDataChanged(dependentId, {
        entity: 'schedule',
        action,
        entityId,
      });
    } catch (error) {
      console.warn('Nie udało się wysłać data_changed (schedule)', error);
    }
  }

  private scheduledAtToday(time: string | null | undefined): Date {
    if (time && /^\d{2}:\d{2}$/.test(time)) {
      return scheduledAtOnLocalDay(time);
    }
    return scheduledAtOnLocalDay('00:00');
  }

  async create(userId: string, data: any) {
    const created = await this.prisma.schedule.create({
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
    await this.notifyDataChanged(userId, 'created', created.id);
    return created;
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
    const updated = await this.prisma.schedule.update({
      where: { id },
      data,
    });
    await this.notifyDataChanged(updated.userId, 'updated', updated.id);
    return updated;
  }

  async remove(id: string) {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id },
      select: { userId: true },
    });
    await this.prisma.doseLog.deleteMany({ where: { scheduleId: id } });
    const deleted = await this.prisma.schedule.delete({
      where: { id },
    });
    if (schedule?.userId) {
      await this.notifyDataChanged(schedule.userId, 'deleted', id);
    }
    return deleted;
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
    const [schedules, logs] = await Promise.all([
      this.prisma.schedule.findMany({
        where: { userId },
        include: { inventory: { select: { name: true } } },
      }),
      this.prisma.doseLog.findMany({
        where: {
          schedule: { userId },
          scheduledAt: { gte: from, lt: to },
        },
        select: {
          scheduleId: true,
          status: true,
          scheduledAt: true,
        },
      }),
    ]);

    const built = buildDoseStatsPayload({ schedules, logs, from, to });

    return {
      range: {
        from: from.toISOString(),
        to: to.toISOString(),
      },
      ...built,
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
        inventory: { select: { name: true, type: true } },
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
          schedule.inventory?.type,
        );
      } else if (newStatus === 'MISSED' && prev !== 'MISSED') {
        await this.notifications.notifyDoseMissed(
          dependentId,
          dependentName,
          medName,
          scheduleId,
          schedule.inventory?.type,
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
            select: {
              currentPills: true,
              totalPills: true,
              pillsPerDose: true,
              type: true,
            },
          });
          if (inv && isMedicationInventory(inv.type)) {
            const perDose = inv.pillsPerDose ?? 1;
            const cur = inv.currentPills ?? inv.totalPills ?? 0;
            const next = Math.max(0, cur - perDose);
            await this.prisma.inventory.update({
              where: { id: schedule.inventoryId },
              data: { currentPills: next },
            });
            await this.notifications.processInventoryAlerts(schedule.inventoryId);
          }
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
            select: {
              currentPills: true,
              totalPills: true,
              pillsPerDose: true,
              type: true,
            },
          });
          if (inv && isMedicationInventory(inv.type)) {
            const perDose = inv.pillsPerDose ?? 1;
            const cur = inv.currentPills ?? inv.totalPills ?? 0;
            const next = Math.max(0, cur - perDose);
            await this.prisma.inventory.update({
              where: { id: schedule.inventoryId },
              data: { currentPills: next },
            });
            await this.notifications.processInventoryAlerts(schedule.inventoryId);
          }
        }
      }

      await notifyCaretakersIfNeeded(newStatus, null);
      return createdLog;
    }
  }
}
