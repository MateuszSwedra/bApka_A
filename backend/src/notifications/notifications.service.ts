import { Injectable, Logger } from '@nestjs/common';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { PrismaService } from '../prisma/prisma.service';

type MedScheduleRef = {
  id: string;
  medication?: string | null;
  inventory?: { name?: string | null } | null;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly expo = new Expo();

  constructor(private prisma: PrismaService) {}

  formatMedName(schedule: MedScheduleRef): string {
    return (
      schedule.inventory?.name?.trim() ||
      schedule.medication?.trim() ||
      'lek'
    );
  }

  formatUserName(user: { name?: string | null; email?: string | null }): string {
    return user.name?.trim() || user.email || 'Podopieczny';
  }

  async getCaretakerPushTokens(dependentId: string): Promise<string[]> {
    const connections = await this.prisma.connection.findMany({
      where: { dependentId, isPaired: true },
      include: { caretaker: { select: { fcmToken: true } } },
    });
    return connections
      .map((c) => c.caretaker.fcmToken)
      .filter((t): t is string => !!t && Expo.isExpoPushToken(t));
  }

  async sendToTokens(
    tokens: string[],
    message: Omit<ExpoPushMessage, 'to'>,
  ): Promise<void> {
    if (tokens.length === 0) return;

    const messages: ExpoPushMessage[] = tokens.map((to) => ({ ...message, to }));
    const chunks = this.expo.chunkPushNotifications(messages);

    for (const chunk of chunks) {
      try {
        await this.expo.sendPushNotificationsAsync(chunk);
      } catch (error) {
        this.logger.error('Błąd wysyłki push', error);
      }
    }
  }

  async notifyCaretakersOfDependent(
    dependentId: string,
    payload: {
      title: string;
      body: string;
      data?: Record<string, unknown>;
      priority?: 'default' | 'high';
      sound?: 'default' | null;
    },
  ): Promise<void> {
    const tokens = await this.getCaretakerPushTokens(dependentId);
    if (tokens.length === 0) {
      this.logger.debug(`Brak tokenów opiekunów dla podopiecznego ${dependentId}`);
      return;
    }

    await this.sendToTokens(tokens, {
      title: payload.title,
      body: payload.body,
      sound: payload.sound ?? 'default',
      priority: payload.priority ?? 'default',
      data: payload.data,
    });
    this.logger.log(
      `Powiadomienie do ${tokens.length} opiekuna(ów): ${payload.title}`,
    );
  }

  async sendMedicationReminder(
    fcmToken: string | null | undefined,
    params: { medication: string; scheduleId: string; email?: string },
  ): Promise<void> {
    if (!fcmToken || !Expo.isExpoPushToken(fcmToken)) return;

    await this.sendToTokens([fcmToken], {
      title: 'Czas na lek!',
      body: `Pamiętaj o przyjęciu: ${params.medication || 'lek z apteczki'}`,
      sound: 'default',
      data: { type: 'med_reminder', scheduleId: params.scheduleId },
    });
    if (params.email) {
      this.logger.log(`Wysłano przypomnienie o leku do ${params.email}`);
    }
  }

  async notifyDoseTaken(
    dependentId: string,
    dependentName: string,
    medName: string,
    late: boolean,
    scheduleId: string,
  ): Promise<void> {
    await this.notifyCaretakersOfDependent(dependentId, {
      title: late ? 'Lek przyjęty spóźnionie' : 'Lek przyjęty',
      body: late
        ? `${dependentName} przyjął(a) spóźnionie: ${medName}`
        : `${dependentName} przyjął(a): ${medName}`,
      data: { type: 'dose_taken', scheduleId, late },
    });
  }

  async notifyDoseMissed(
    dependentId: string,
    dependentName: string,
    medName: string,
    scheduleId: string,
  ): Promise<void> {
    await this.notifyCaretakersOfDependent(dependentId, {
      title: 'Pominięty lek',
      body: `${dependentName} nie przyjął(a): ${medName}`,
      priority: 'high',
      data: { type: 'dose_missed', scheduleId },
    });
  }

  async notifySos(
    dependentId: string,
    dependentName: string,
    note?: string | null,
  ): Promise<void> {
    const body = note?.trim()
      ? `${dependentName} wysłał(a) SOS: ${note.trim()}`
      : `${dependentName} nacisnął(a) przycisk SOS!`;

    await this.notifyCaretakersOfDependent(dependentId, {
      title: 'SOS!',
      body,
      priority: 'high',
      sound: 'default',
      data: { type: 'sos', dependentId },
    });
  }
}
