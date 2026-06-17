import { Injectable, Logger } from '@nestjs/common';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { PrismaService } from '../prisma/prisma.service';
import { FirebaseSosService, SOS_ANDROID_CHANNEL_ID } from './firebase-sos.service';
import { EXPO_ANDROID_CHANNELS } from '../common/notification-channels';
import { calculateInventoryDepletion, isMedicationInventory } from '../inventory/inventory-depletion';
import {
  activityKindFromInventoryType,
  buildCompletionNotification,
  buildMissedCaretakerNotification,
  buildMissedSeniorNotification,
  type NotificationLang,
} from './activity-notification-messages';
type MedScheduleRef = {
  id: string;
  medication?: string | null;
  inventory?: { name?: string | null } | null;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly expo = new Expo();

  constructor(
    private prisma: PrismaService,
    private firebaseSos: FirebaseSosService,
  ) {}

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

  async getCaretakerPushTokens(dependentId: string): Promise<
    Array<{ caretakerId: string; expoToken: string | null; nativeToken: string | null }>
  > {
    const connections = await this.prisma.connection.findMany({
      where: { dependentId, isPaired: true },
      include: {
        caretaker: { select: { id: true, fcmToken: true, nativePushToken: true } },
      },
    });
    return connections.map((c) => ({
      caretakerId: c.caretaker.id,
      expoToken:
        c.caretaker.fcmToken && Expo.isExpoPushToken(c.caretaker.fcmToken)
          ? c.caretaker.fcmToken
          : null,
      nativeToken: c.caretaker.nativePushToken?.trim() || null,
    }));
  }

  async sendToTokens(
    tokens: string[],
    message: Omit<ExpoPushMessage, 'to'>,
  ): Promise<void> {
    if (tokens.length === 0) return;

    const data =
      message.data &&
      Object.fromEntries(
        Object.entries(message.data).map(([k, v]) => [k, v == null ? '' : String(v)]),
      );

    const messages: ExpoPushMessage[] = tokens.map((to) => ({
      ...message,
      to,
      data,
    }));
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
      channelId?: string;
      interruptionLevel?: 'active' | 'critical' | 'passive' | 'time-sensitive';
    },
  ): Promise<void> {
    const recipients = await this.getCaretakerPushTokens(dependentId);
    const tokens = recipients.map((r) => r.expoToken).filter((t): t is string => !!t);
    if (tokens.length === 0) {
      this.logger.debug(`Brak tokenów Expo opiekunów dla podopiecznego ${dependentId}`);
      return;
    }

    await this.sendToTokens(tokens, {
      title: payload.title,
      body: payload.body,
      sound: payload.sound ?? 'default',
      priority: payload.priority ?? 'default',
      channelId: payload.channelId,
      interruptionLevel: payload.interruptionLevel,
      data: payload.data,
    });
    this.logger.log(
      `Powiadomienie Expo do ${tokens.length} opiekuna(ów): ${payload.title}`,
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
      priority: 'high',
      channelId: EXPO_ANDROID_CHANNELS.MEDICATION,
      data: { type: 'med_reminder', scheduleId: params.scheduleId },
    });
    if (params.email) {
      this.logger.log(`Wysłano przypomnienie o leku do ${params.email}`);
    }
  }

  async sendMoodCheckReminder(
    fcmToken: string | null | undefined,
    params: { slotTime: string; email?: string },
  ): Promise<void> {
    if (!fcmToken || !Expo.isExpoPushToken(fcmToken)) return;

    await this.sendToTokens([fcmToken], {
      title: 'Jak się czujesz?',
      body: 'Powiedz, jak się dziś czujesz — wybierz buzię w aplikacji.',
      sound: 'default',
      priority: 'high',
      channelId: EXPO_ANDROID_CHANNELS.MOOD,
      data: { type: 'mood_reminder', slotTime: params.slotTime },
    });
    if (params.email) {
      this.logger.log(`Wysłano przypomnienie o humorze do ${params.email}`);
    }
  }

  async notifyDoseTaken(
    dependentId: string,
    dependentName: string,
    medName: string,
    late: boolean,
    scheduleId: string,
    inventoryType?: string | null,
    lang: NotificationLang = 'pl',
  ): Promise<void> {
    const kind = activityKindFromInventoryType(inventoryType);
    const { title, body } = buildCompletionNotification(
      kind,
      dependentName,
      medName,
      late,
      lang,
    );
    await this.notifyCaretakersOfDependent(dependentId, {
      title,
      body,
      priority: 'high',
      channelId: EXPO_ANDROID_CHANNELS.MEDICATION,
      data: { type: 'dose_taken', scheduleId, dependentId, late: late ? '1' : '0' },
    });
  }

  async notifyDoseMissed(
    dependentId: string,
    dependentName: string,
    medName: string,
    scheduleId: string,
    inventoryType?: string | null,
    lang: NotificationLang = 'pl',
  ): Promise<void> {
    const kind = activityKindFromInventoryType(inventoryType);
    const { title, body } = buildMissedCaretakerNotification(
      kind,
      dependentName,
      medName,
      lang,
    );
    await this.notifyCaretakersOfDependent(dependentId, {
      title,
      body,
      priority: 'high',
      channelId: EXPO_ANDROID_CHANNELS.MEDICATION,
      data: { type: 'dose_missed_caretaker', scheduleId, dependentId },
    });
  }

  /** Push do seniora — pominięta dawka / aktywność. */
  async sendDoseMissedReminder(
    fcmToken: string | null | undefined,
    params: {
      medication: string;
      scheduleId: string;
      email?: string;
      inventoryType?: string | null;
      lang?: NotificationLang;
    },
  ): Promise<void> {
    if (!fcmToken || !Expo.isExpoPushToken(fcmToken)) return;

    const kind = activityKindFromInventoryType(params.inventoryType);
    const lang = params.lang ?? 'pl';
    const { title, body } = buildMissedSeniorNotification(kind, params.medication, lang);

    await this.sendToTokens([fcmToken], {
      title,
      body,
      sound: 'default',
      priority: 'high',
      channelId: EXPO_ANDROID_CHANNELS.MEDICATION,
      data: { type: 'dose_missed', scheduleId: params.scheduleId },
    });
    if (params.email) {
      this.logger.log(`Wysłano powiadomienie o pominiętej aktywności do ${params.email}`);
    }
  }

  /** Sprawdza zapas leku i wysyła alerty (niski zapas / brak tabletek). */
  async processInventoryAlerts(inventoryId: string): Promise<void> {
    const inventory = await this.prisma.inventory.findUnique({
      where: { id: inventoryId },
      include: {
        schedules: true,
        user: {
          select: { id: true, name: true, email: true, role: true, fcmToken: true },
        },
      },
    });
    if (!inventory?.user) return;
    if (!isMedicationInventory(inventory.type)) return;

    const { daysLeft, pillsLeft } = calculateInventoryDepletion(inventory);
    if (daysLeft >= 999 && pillsLeft > 0) return;

    const owner = inventory.user;
    const medName = inventory.name.trim() || 'lek';
    const ownerName = this.formatUserName(owner);
    const dependentId = owner.id;

    const caretakers = await this.getCaretakerPushTokens(dependentId);
    const hasCaretakers = caretakers.some((c) => !!c.expoToken);

    if (
      daysLeft <= 7 &&
      daysLeft > 0 &&
      pillsLeft > 0 &&
      !inventory.lowStockAlertSent
    ) {
      const body = `${medName} — zapas wystarczy na ok. ${daysLeft} dni. Uzupełnij opakowanie.`;

      if (owner.role === 'DEPENDENT' && hasCaretakers) {
        await this.notifyCaretakersOfDependent(dependentId, {
          title: 'Koniec zapasu leku',
          body: `${ownerName}: ${body}`,
          priority: 'high',
          channelId: EXPO_ANDROID_CHANNELS.INVENTORY,
          data: {
            type: 'inventory_low',
            dependentId,
            inventoryId,
            daysLeft: String(daysLeft),
          },
        });
      }

      if (owner.role === 'HYBRID' || (owner.role === 'DEPENDENT' && !hasCaretakers)) {
        await this.sendInventoryLowStockToUser(owner.fcmToken, {
          medication: medName,
          daysLeft,
          inventoryId,
          email: owner.email,
        });
      }

      await this.prisma.inventory.update({
        where: { id: inventoryId },
        data: { lowStockAlertSent: true },
      });
      this.logger.log(
        `Alert niskiego zapasu: ${medName} (${daysLeft} dni) użytkownik ${owner.email}`,
      );
    }

    if (pillsLeft <= 0 && !inventory.emptyAlertSent) {
      const body = `${medName} — tabletki się skończyły. Kup nowe opakowanie.`;

      if (owner.role === 'DEPENDENT' && hasCaretakers) {
        await this.notifyCaretakersOfDependent(dependentId, {
          title: 'Brak leku w apteczce',
          body: `${ownerName}: ${body}`,
          priority: 'high',
          channelId: EXPO_ANDROID_CHANNELS.INVENTORY,
          data: {
            type: 'inventory_empty',
            dependentId,
            inventoryId,
          },
        });
      }

      if (owner.role === 'HYBRID' || (owner.role === 'DEPENDENT' && !hasCaretakers)) {
        await this.sendInventoryEmptyToUser(owner.fcmToken, {
          medication: medName,
          inventoryId,
          email: owner.email,
        });
      }

      await this.prisma.inventory.update({
        where: { id: inventoryId },
        data: { emptyAlertSent: true },
      });
      this.logger.log(
        `Alert pustego zapasu: ${medName} użytkownik ${owner.email}`,
      );
    }
  }

  async sendInventoryLowStockToUser(
    fcmToken: string | null | undefined,
    params: {
      medication: string;
      daysLeft: number;
      inventoryId: string;
      email?: string;
    },
  ): Promise<void> {
    if (!fcmToken || !Expo.isExpoPushToken(fcmToken)) return;

    await this.sendToTokens([fcmToken], {
      title: 'Koniec zapasu leku',
      body: `${params.medication} — zapas wystarczy na ok. ${params.daysLeft} dni. Uzupełnij opakowanie.`,
      sound: 'default',
      priority: 'high',
      channelId: EXPO_ANDROID_CHANNELS.INVENTORY,
      data: {
        type: 'inventory_low',
        inventoryId: params.inventoryId,
        daysLeft: String(params.daysLeft),
      },
    });
    if (params.email) {
      this.logger.log(`Wysłano alert niskiego zapasu do ${params.email}`);
    }
  }

  async sendInventoryEmptyToUser(
    fcmToken: string | null | undefined,
    params: { medication: string; inventoryId: string; email?: string },
  ): Promise<void> {
    if (!fcmToken || !Expo.isExpoPushToken(fcmToken)) return;

    await this.sendToTokens([fcmToken], {
      title: 'Brak leku w apteczce',
      body: `${params.medication} — tabletki się skończyły. Kup nowe opakowanie.`,
      sound: 'default',
      priority: 'high',
      channelId: EXPO_ANDROID_CHANNELS.INVENTORY,
      data: {
        type: 'inventory_empty',
        inventoryId: params.inventoryId,
      },
    });
    if (params.email) {
      this.logger.log(`Wysłano alert pustego zapasu do ${params.email}`);
    }
  }

  /**
   * Informuje seniora/hybrydę o zmianie danych (np. lek dodany przez opiekuna),
   * aby aplikacja mogła natychmiast odświeżyć widoki.
   */
  async notifyDependentDataChanged(
    dependentId: string,
    payload?: {
      entity?: 'inventory' | 'schedule';
      action?: 'created' | 'updated' | 'deleted';
      entityId?: string;
    },
  ): Promise<void> {
    const dependent = await this.prisma.user.findUnique({
      where: { id: dependentId },
      select: { fcmToken: true, email: true },
    });
    const token = dependent?.fcmToken;
    if (!token || !Expo.isExpoPushToken(token)) return;

    await this.sendToTokens([token], {
      title: 'Zaktualizowano plan aktywności',
      body: 'Wykryto zmiany. Odświeżamy dane.',
      sound: null,
      priority: 'high',
      channelId: EXPO_ANDROID_CHANNELS.MEDICATION,
      data: {
        type: 'data_changed',
        dependentId,
        entity: payload?.entity ?? '',
        action: payload?.action ?? '',
        entityId: payload?.entityId ?? '',
      },
    });

    if (dependent?.email) {
      this.logger.log(`Wysłano data_changed do ${dependent.email}`);
    }
  }

  private moodLabelPl(mood: string): string {    switch (mood) {
      case 'happy':
        return 'dobrze';
      case 'neutral':
        return 'średnio';
      case 'sad':
        return 'źle';
      default:
        return mood;
    }
  }

  async notifyMood(
    dependentId: string,
    dependentName: string,
    mood: string,
  ): Promise<void> {
    const label = this.moodLabelPl(mood);
    await this.notifyCaretakersOfDependent(dependentId, {
      title: 'Samopoczucie',
      body: `${dependentName} czuje się ${label}`,
      priority: 'high',
      sound: 'default',
      channelId: EXPO_ANDROID_CHANNELS.MOOD,
      data: { type: 'mood_update', mood, dependentId },
    });    this.logger.log(`Powiadomienie o humorze: ${dependentName} → ${label}`);
  }

  async notifySos(
    dependentId: string,
    dependentName: string,
    note?: string | null,
  ): Promise<void> {
    const body = note?.trim()
      ? `${dependentName} wysłał(a) SOS: ${note.trim()}`
      : `${dependentName} nacisnął(a) przycisk SOS!`;
    const title = 'SOS!';

    const recipients = await this.getCaretakerPushTokens(dependentId);
    let fcmSent = 0;
    let expoSent = 0;

    for (const { caretakerId, nativeToken, expoToken } of recipients) {
      let fcmSentForCaretaker = false;

      if (nativeToken && this.firebaseSos.isEnabled()) {
        const result = await this.firebaseSos.sendSosAlarm({
          token: nativeToken,
          title,
          body,
          dependentId,
          dependentName,
        });
        if (result.invalidToken) {
          await this.prisma.user.update({
            where: { id: caretakerId },
            data: { nativePushToken: null },
          });
          this.logger.warn(
            `Wyczyszczono wygasły nativePushToken opiekuna ${caretakerId}`,
          );
        }
        if (result.sent) {
          fcmSentForCaretaker = true;
          fcmSent += 1;
        }
      }

      // Po udanym FCM nie wysyłaj Expo — data-only Expo dawało puste powiadomienie w szufladzie.
      if (expoToken && !fcmSentForCaretaker) {
        await this.sendToTokens([expoToken], {
          title,
          body,
          sound: 'default',
          interruptionLevel: 'time-sensitive',
          priority: 'high',
          channelId: SOS_ANDROID_CHANNEL_ID,
          data: {
            type: 'sos',
            title,
            dependentId,
            dependentName,
            body,
            screen: 'sos-alarm',
          },
        });
        expoSent += 1;
      }
    }

    this.logger.log(
      `SOS: FCM/Notifee=${fcmSent}, Expo=${expoSent} opiekun(ów)`,
    );
  }
}
