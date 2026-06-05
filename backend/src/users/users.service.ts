import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async createSosLog(userId: string, note?: string) {
    return this.prisma.sosLog.create({
      data: {
        userId,
        note: note?.trim() || null,
        source: 'APP_SENIOR',
      },
    });
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

  private readonly settingsSelect = {
    moodEnabled: true,
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
        ...this.settingsSelect,
      },
    });
    if (!user) {
      throw new NotFoundException('Użytkownik nie istnieje');
    }
    return user;
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
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        lastMood: mood,
        lastMoodAt: new Date()
      },
      select: { id: true, lastMood: true, lastMoodAt: true }
    });

    await this.prisma.moodLog.create({
      data: {
        userId,
        mood,
        source: 'APP_SENIOR',
      },
    });

    return updated;
  }

  async updateFcmToken(userId: string, fcmToken: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { fcmToken },
      select: { id: true, email: true }
    });
  }

  /** Imię / forma zwrotu — m.in. przy łączeniu kont i na liście podopiecznych. */
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
    const data: Record<string, boolean | string> = {};
    if (typeof body.moodEnabled === 'boolean') data.moodEnabled = body.moodEnabled;
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
