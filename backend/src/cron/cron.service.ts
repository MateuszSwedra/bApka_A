import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { Expo } from 'expo-server-sdk';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);
  private expo = new Expo();

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleMedicationReminders() {
    this.logger.debug('Sprawdzanie harmonogramów leków...');
    
    // Pobranie aktualnego czasu w formacie "HH:mm"
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    // Pobranie wszystkich harmonogramów na tę minutę wraz z Userem (żeby mieć token)
    const schedules = await this.prisma.schedule.findMany({
      where: {
        time: currentTime,
      },
      include: {
        user: true
      }
    });

    for (const schedule of schedules) {
      this.logger.log(`Wykryto lek do wzięcia: ${schedule.medication || schedule.inventoryId} o ${currentTime}`);
      
      // Sprawdzamy czy już wygenerowano dzisiaj log
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existingLog = await this.prisma.doseLog.findFirst({
        where: {
          scheduleId: schedule.id,
          scheduledAt: {
            gte: today,
          },
        },
      });

      if (!existingLog) {
        // Zapisujemy nowy PENDING log do bazy
        await this.prisma.doseLog.create({
          data: {
            scheduleId: schedule.id,
            status: 'PENDING',
            scheduledAt: now,
          },
        });
        this.logger.log(`Utworzono log PENDING dla harmonogramu ${schedule.id}`);
        
        // Wysyłka Push przez Expo Server SDK
        if (schedule.user.fcmToken && Expo.isExpoPushToken(schedule.user.fcmToken)) {
          try {
            const receipts = await this.expo.sendPushNotificationsAsync([{
              to: schedule.user.fcmToken,
              sound: 'default',
              title: 'Czas na lek!',
              body: `Pamiętaj o przyjęciu: ${schedule.medication || 'lek z apteczki'}`,
              data: { scheduleId: schedule.id },
            }]);
            this.logger.log(`Wysłano powiadomienie Push do ${schedule.user.email}`);
          } catch (error) {
            this.logger.error(`Błąd przy wysyłce powiadomienia do ${schedule.user.email}`, error);
          }
        }
      }
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async markMissedDoses() {
    this.logger.debug('Sprawdzanie pominiętych leków...');
    
    // Dawka jest „spóźniona” aż do czasu kolejnej dawki.
    // Przy aktualnym modelu (1 log na dawkę, generowany o godzinie harmonogramu),
    // najbezpieczniej oznaczyć MISSED dopiero, gdy minęło ~24h od scheduledAt.
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    const result = await this.prisma.doseLog.updateMany({
      where: {
        status: 'PENDING',
        scheduledAt: {
          lt: oneDayAgo,
        },
      },
      data: {
        status: 'MISSED',
      },
    });

    if (result.count > 0) {
      this.logger.log(`Oznaczono ${result.count} leków jako POMINIĘTE`);
    }
  }
}
