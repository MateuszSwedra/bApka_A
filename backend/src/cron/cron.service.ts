import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  formatLocalHm,
  formatLocalYmd,
  getLocalDayRange,
  scheduledAtOnLocalDay,
} from '../common/app-timezone';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleMedicationReminders() {
    this.logger.debug('Sprawdzanie harmonogramów leków...');

    const now = new Date();
    const currentTime = formatLocalHm(now);
    const todayYmd = formatLocalYmd(now);
    const { start: dayStart, end: dayEnd } = getLocalDayRange(todayYmd);

    const schedules = await this.prisma.schedule.findMany({
      where: {
        time: currentTime,
      },
      include: {
        user: true,
        inventory: { select: { name: true } },
      },
    });

    for (const schedule of schedules) {
      this.logger.log(
        `Wykryto lek do wzięcia: ${schedule.medication || schedule.inventoryId} o ${currentTime}`,
      );

      const existingLog = await this.prisma.doseLog.findFirst({
        where: {
          scheduleId: schedule.id,
          scheduledAt: {
            gte: dayStart,
            lt: dayEnd,
          },
        },
      });

      if (!existingLog) {
        const planned =
          schedule.time && /^\d{2}:\d{2}$/.test(schedule.time)
            ? scheduledAtOnLocalDay(schedule.time, todayYmd)
            : scheduledAtOnLocalDay('00:00', todayYmd);

        await this.prisma.doseLog.create({
          data: {
            scheduleId: schedule.id,
            status: 'PENDING',
            scheduledAt: planned,
          },
        });
        this.logger.log(`Utworzono log PENDING dla harmonogramu ${schedule.id}`);

        const medName = this.notifications.formatMedName(schedule);
        await this.notifications.sendMedicationReminder(schedule.user.fcmToken, {
          medication: medName,
          scheduleId: schedule.id,
          email: schedule.user.email,
        });
      }
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async markMissedDoses() {
    this.logger.debug('Sprawdzanie pominiętych leków...');

    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    const pendingLogs = await this.prisma.doseLog.findMany({
      where: {
        status: 'PENDING',
        scheduledAt: {
          lt: oneDayAgo,
        },
      },
      include: {
        schedule: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            inventory: { select: { name: true } },
          },
        },
      },
    });

    for (const log of pendingLogs) {
      await this.prisma.doseLog.update({
        where: { id: log.id },
        data: { status: 'MISSED' },
      });

      const schedule = log.schedule;
      if (!schedule?.user) continue;

      const dependentName = this.notifications.formatUserName(schedule.user);
      const medName = this.notifications.formatMedName(schedule);

      await this.notifications.notifyDoseMissed(
        schedule.user.id,
        dependentName,
        medName,
        schedule.id,
      );
    }

    if (pendingLogs.length > 0) {
      this.logger.log(`Oznaczono ${pendingLogs.length} leków jako POMINIĘTE`);
    }
  }
}
