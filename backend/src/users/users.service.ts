import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async createSosLog(userId: string, note?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });
    if (!user) {
      throw new NotFoundException('Użytkownik nie istnieje');
    }

    const log = await this.prisma.sosLog.create({
      data: {
        userId,
        note: note?.trim() || null,
        source: 'APP_SENIOR',
      },
    });

    await this.notifications.notifySos(
      userId,
      this.notifications.formatUserName(user),
      note,
    );

    return log;
  }

  async listSosLogs(userId: string, from: Date, to: Date) {
    return this.prisma.sosLog.findMany({
      where: {
        userId,
        createdAt: {
          gte: from,
          lt: to,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createHealthMetricLog(
    userId: string,
    body: {
      type: string;
      measuredAt?: string;
      value?: number;
      unit?: string;
      systolic?: number;
      diastolic?: number;
      pulse?: number;
    },
  ) {
    const type = String(body?.type || '').trim();
    if (!type) throw new BadRequestException('Missing metric type');

    const measuredAt = body?.measuredAt ? new Date(body.measuredAt) : new Date();
    if (Number.isNaN(measuredAt.getTime())) {
      throw new BadRequestException('Invalid measuredAt');
    }

    return this.prisma.healthMetricLog.create({
      data: {
        userId,
        type,
        measuredAt,
        value: typeof body.value === 'number' ? body.value : null,
        unit: body.unit ? String(body.unit).trim() : null,
        systolic: typeof body.systolic === 'number' ? body.systolic : null,
        diastolic: typeof body.diastolic === 'number' ? body.diastolic : null,
        pulse: typeof body.pulse === 'number' ? body.pulse : null,
        source: 'APP_SENIOR',
      },
    });
  }

  async listHealthMetricLogs(
    userId: string,
    from: Date,
    to: Date,
    type?: string,
  ) {
    const where: any = {
      userId,
      measuredAt: { gte: from, lt: to },
    };
    if (type) where.type = String(type);

    return this.prisma.healthMetricLog.findMany({
      where,
      orderBy: { measuredAt: 'asc' },
    });
  }

  private readonly moodTimePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

  private normalizeMoodCheckTimes(value: unknown): string[] {
    if (!Array.isArray(value)) {
      throw new BadRequestException('moodCheckTimes must be an array of HH:MM strings');
    }
    const unique = [
      ...new Set(
        value
          .map(v => String(v).trim())
          .filter(v => this.moodTimePattern.test(v)),
      ),
    ].sort();
    if (unique.length === 0) {
      throw new BadRequestException('moodCheckTimes must contain at least one valid time');
    }
    return [unique[0]];
  }

  private readonly settingsSelect = {
    moodEnabled: true,
    moodCheckTimes: true,
    vitalsEntryEnabled: true,
    highContrast: true,
    colorBlindFriendly: true,
    appLanguage: true,
    medicationSoundChoice: true,
  } as const;

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        fcmToken: true,
        ...this.settingsSelect,
      },
    });
    if (!user) {
      throw new NotFoundException('Użytkownik nie istnieje');
    }

    let isPairedWithCaretaker = false;
    if (user.role === 'DEPENDENT') {
      const connection = await this.prisma.connection.findFirst({
        where: { dependentId: userId, isPaired: true },
        select: { id: true },
      });
      isPairedWithCaretaker = !!connection;
    }

    const { fcmToken, ...profile } = user;
    return {
      ...profile,
      isPairedWithCaretaker,
      hasPushToken: !!fcmToken?.trim(),
    };
  }

  private async assertCaretakerOwnsDependent(caretakerId: string, dependentId: string) {
    const connection = await this.prisma.connection.findFirst({
      where: { caretakerId, dependentId, isPaired: true },
    });
    if (!connection) {
      throw new ForbiddenException('Brak uprawnień do tego podopiecznego');
    }
  }

  async updateRole(userId: string, role: Role) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, email: true, role: true }
    });
  }

  async generatePin(caretakerId: string) {
    // Usunięcie starych, niesparowanych połączeń dla tego opiekuna
    await this.prisma.connection.deleteMany({
      where: {
        caretakerId,
        isPaired: false
      }
    });

    // Generowanie 6-cyfrowego kodu
    const pin = Math.floor(100000 + Math.random() * 900000).toString();

    const connection = await this.prisma.connection.create({
      data: {
        caretakerId,
        pin,
        isPaired: false
      }
    });

    return { pin };
  }

  async pairWithPin(dependentId: string, pin: string) {
    const dependent = await this.prisma.user.findUnique({
      where: { id: dependentId }
    });

    if (!dependent || dependent.role !== 'DEPENDENT') {
      throw new NotFoundException('Only dependents can use a pairing PIN');
    }

    const connection = await this.prisma.connection.findUnique({
      where: { pin }
    });

    if (!connection || connection.isPaired) {
      throw new NotFoundException('Invalid or expired PIN');
    }

    return this.prisma.connection.update({
      where: { id: connection.id },
      data: {
        dependentId: dependent.id,
        isPaired: true,
        pin: null // Clear the pin after successful pairing
      }
    });
  }

  async getDependents(caretakerId: string) {
    const connections = await this.prisma.connection.findMany({
      where: {
        caretakerId,
        isPaired: true
      },
      include: {
        dependent: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            lastMood: true,
            lastMoodAt: true,
            ...this.settingsSelect,
          }
        }
      }
    });
    
    return connections.map(conn => conn.dependent);
  }

  async updateMood(userId: string, mood: string) {
    const normalized = mood?.trim()?.toLowerCase();
    if (!['happy', 'neutral', 'sad'].includes(normalized)) {
      throw new BadRequestException('Nieprawidłowa wartość nastroju');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });
    if (!user) {
      throw new NotFoundException('Użytkownik nie istnieje');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        lastMood: normalized,
        lastMoodAt: new Date()
      },
      select: { id: true, lastMood: true, lastMoodAt: true }
    });

    await this.prisma.moodLog.create({
      data: {
        userId,
        mood: normalized,
        source: 'APP_SENIOR',
      },
    });

    await this.notifications.notifyMood(
      userId,
      this.notifications.formatUserName(user),
      normalized,
    );

    return updated;
  }

  async updateFcmToken(userId: string, fcmToken: string, nativePushToken?: string) {
    const data: { fcmToken: string; nativePushToken?: string | null } = { fcmToken };
    if (nativePushToken !== undefined) {
      data.nativePushToken = nativePushToken?.trim() || null;
    }
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, email: true },
    });
  }

  /** Imię / forma zwrotu - m.in. przy łączeniu kont i na liście podopiecznych. */
  async updateDisplayName(userId: string, name: string) {
    const trimmed = (name ?? '').trim();
    if (trimmed.length < 2) {
      throw new BadRequestException('Imię musi mieć co najmniej 2 znaki');
    }
    if (trimmed.length > 80) {
      throw new BadRequestException('Imię może mieć co najwyżej 80 znaków');
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { name: trimmed },
      select: { id: true, email: true, name: true, role: true },
    });
  }

  private normalizeSettingsPatch(body: Record<string, unknown>) {
    const data: Record<string, boolean | string | string[]> = {};
    if (typeof body.moodEnabled === 'boolean') data.moodEnabled = body.moodEnabled;
    if (body.moodCheckTimes !== undefined) {
      data.moodCheckTimes = this.normalizeMoodCheckTimes(body.moodCheckTimes);
    }
    if (typeof body.vitalsEntryEnabled === 'boolean') data.vitalsEntryEnabled = body.vitalsEntryEnabled;
    if (typeof body.highContrast === 'boolean') data.highContrast = body.highContrast;
    if (typeof body.colorBlindFriendly === 'boolean') data.colorBlindFriendly = body.colorBlindFriendly;
    if (typeof body.appLanguage === 'string') {
      const lang = body.appLanguage.trim().toLowerCase();
      if (lang === 'pl' || lang === 'en') data.appLanguage = lang;
    }
    if (typeof body.medicationSoundChoice === 'string') {
      const sound = body.medicationSoundChoice.trim();
      if (['default', 'gentle', 'strong'].includes(sound)) {
        data.medicationSoundChoice = sound;
      }
    }
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Brak poprawnych pól ustawień');
    }
    return data;
  }

  async updateSettings(userId: string, body: Record<string, unknown>) {
    const data = this.normalizeSettingsPatch(body);
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, ...this.settingsSelect },
    });
  }

  async updateDependentSettingsByCaretaker(
    caretakerId: string,
    dependentId: string,
    body: Record<string, unknown>,
  ) {
    await this.assertCaretakerOwnsDependent(caretakerId, dependentId);
    const dependent = await this.prisma.user.findUnique({
      where: { id: dependentId },
      select: { id: true, role: true },
    });
    if (!dependent || dependent.role !== Role.DEPENDENT) {
      throw new NotFoundException('Podopieczny nie istnieje');
    }
    return this.updateSettings(dependentId, body);
  }

  async getMoodHistory(userId: string, from: Date, to: Date) {
    const logs = await this.prisma.moodLog.findMany({
      where: {
        userId,
        createdAt: {
          gte: from,
          lt: to,
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const histogram = logs.reduce<Record<string, number>>((acc, log) => {
      const key = log.mood || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return {
      range: { from: from.toISOString(), to: to.toISOString() },
      items: logs,
      histogram,
    };
  }
}
