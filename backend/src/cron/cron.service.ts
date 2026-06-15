import { Injectable, Logger } from '@nestjs/common';

import { Cron, CronExpression } from '@nestjs/schedule';

import { PrismaService } from '../prisma/prisma.service';

import { NotificationsService } from '../notifications/notifications.service';

import { DOSE_CONFIRMATION_WINDOW_MINUTES } from '../common/dose-windows';

import { normalizeHm } from '../common/normalize-hm';

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

      include: {

        user: true,

        inventory: { select: { name: true } },

      },

    });



    for (const schedule of schedules) {

      const slot = normalizeHm(schedule.time);

      if (slot !== currentTime) continue;

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



  @Cron(CronExpression.EVERY_MINUTE)

  async handleMoodCheckReminders() {

    this.logger.debug('Sprawdzanie przypomnień o humorze...');



    const now = new Date();

    const currentTime = formatLocalHm(now);

    const todayYmd = formatLocalYmd(now);

    const { start: dayStart, end: dayEnd } = getLocalDayRange(todayYmd);



    const users = await this.prisma.user.findMany({

      where: {

        role: { in: ['DEPENDENT', 'HYBRID'] },

        moodEnabled: true,

        fcmToken: { not: null },

      },

      select: { id: true, email: true, fcmToken: true, moodCheckTimes: true },

    });



    for (const user of users) {

      const slotTimes = (user.moodCheckTimes ?? [])

        .map((t) => normalizeHm(t))

        .filter((t): t is string => !!t);



      if (!slotTimes.includes(currentTime)) continue;



      const existingMood = await this.prisma.moodLog.findFirst({

        where: {

          userId: user.id,

          createdAt: {

            gte: dayStart,

            lt: dayEnd,

          },

        },

      });



      if (existingMood) continue;



      this.logger.log(

        `Wysyłam przypomnienie o humorze o ${currentTime} do ${user.email}`,

      );

      await this.notifications.sendMoodCheckReminder(user.fcmToken, {

        slotTime: currentTime,

        email: user.email,

      });

    }

  }



  @Cron(CronExpression.EVERY_MINUTE)

  async markMissedDoses() {

    this.logger.debug('Sprawdzanie pominiętych leków...');



    const now = new Date();

    const confirmationMs = DOSE_CONFIRMATION_WINDOW_MINUTES * 60 * 1000;



    const pendingLogs = await this.prisma.doseLog.findMany({

      where: {

        status: 'PENDING',

      },

      include: {

        schedule: {

          include: {

            user: { select: { id: true, name: true, email: true, fcmToken: true } },

            inventory: { select: { name: true, type: true } },

          },

        },

      },

    });



    let marked = 0;



    for (const log of pendingLogs) {

      const deadline = log.scheduledAt.getTime() + confirmationMs;

      if (now.getTime() <= deadline) continue;



      await this.prisma.doseLog.update({

        where: { id: log.id },

        data: { status: 'MISSED' },

      });

      marked += 1;



      const schedule = log.schedule;

      if (!schedule?.user) continue;



      const dependentName = this.notifications.formatUserName(schedule.user);

      const medName = this.notifications.formatMedName(schedule);



      await this.notifications.notifyDoseMissed(
        schedule.user.id,
        dependentName,
        medName,
        schedule.id,
        schedule.inventory?.type,
      );

      await this.notifications.sendDoseMissedReminder(schedule.user.fcmToken, {
        medication: medName,
        scheduleId: schedule.id,
        email: schedule.user.email,
        inventoryType: schedule.inventory?.type,
      });

    }



    if (marked > 0) {

      this.logger.log(`Oznaczono ${marked} leków jako POMINIĘTE`);

    }

  }



  /** Codziennie rano — alerty o niskim / zerowym zapasie leków. */

  @Cron('0 8 * * *')

  async handleInventoryAlerts() {

    this.logger.debug('Sprawdzanie zapasów leków...');



    const items = await this.prisma.inventory.findMany({
      where: { type: 'MEDICATION' },
      select: { id: true },
    });



    for (const item of items) {

      await this.notifications.processInventoryAlerts(item.id);

    }

  }

}


