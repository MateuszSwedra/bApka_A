import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { SchedulesService } from '../schedules/schedules.service';
import { DOSE_CONFIRMATION_WINDOW_MINUTES } from '../common/dose-windows';
import {
  formatLocalYmd,
  getAppTimezone,
  getLocalDayRange,
} from '../common/app-timezone';
import {
  randomClaimCode,
  randomPublicId,
  randomTokenHex,
  sha256Hex,
} from './iot-crypto';

const CLAIM_TTL_MS = 15 * 60 * 1000;

export type AuthenticatedDevice = {
  id: string;
  publicId: string;
  caretakerId: string;
  dependentUserId: string;
  name: string | null;
};

@Injectable()
export class IotService {
  constructor(
    private prisma: PrismaService,
    private users: UsersService,
    private schedules: SchedulesService,
  ) {}

  async prepareDevice(caretakerId: string, name?: string) {
    const caretaker = await this.prisma.user.findUnique({
      where: { id: caretakerId },
      select: { id: true, role: true },
    });
    if (!caretaker || caretaker.role !== Role.CARETAKER) {
      throw new ForbiddenException('Tylko opiekun może dodać urządzenie');
    }

    const publicId = await this.allocatePublicId();
    const claimToken = randomClaimCode(8);
    const claimTokenHash = sha256Hex(claimToken);
    const claimTokenExpiresAt = new Date(Date.now() + CLAIM_TTL_MS);
    const displayName = name?.trim() || `Urządzenie ${publicId}`;
    const email = `iot-${publicId.toLowerCase()}@device.bapka.local`;

    const result = await this.prisma.$transaction(async (tx) => {
      const dependent = await tx.user.create({
        data: {
          email,
          password: null,
          role: Role.DEPENDENT,
          roleSelected: true,
          name: displayName,
        },
        select: { id: true, name: true, email: true },
      });

      await tx.connection.create({
        data: {
          caretakerId,
          dependentId: dependent.id,
          isPaired: true,
          pin: null,
        },
      });

      const device = await tx.device.create({
        data: {
          publicId,
          name: displayName,
          caretakerId,
          dependentUserId: dependent.id,
          claimTokenHash,
          claimTokenExpiresAt,
          wifiConfigured: false,
        },
        select: {
          id: true,
          publicId: true,
          name: true,
          dependentUserId: true,
          claimTokenExpiresAt: true,
          createdAt: true,
        },
      });

      return { device, dependent };
    });

    return {
      deviceId: result.device.id,
      publicId: result.device.publicId,
      name: result.device.name,
      dependentUserId: result.device.dependentUserId,
      claimToken,
      claimExpiresAt: result.device.claimTokenExpiresAt,
      softApSsid: `bApka-${result.device.publicId}`,
    };
  }

  async claimDevice(claimToken: string, publicId?: string) {
    const token = claimToken?.trim().toUpperCase();
    if (!token) {
      throw new BadRequestException('Brak claimToken');
    }

    const claimTokenHash = sha256Hex(token);
    const device = await this.prisma.device.findFirst({
      where: {
        claimTokenHash,
        ...(publicId?.trim()
          ? { publicId: publicId.trim().toUpperCase() }
          : {}),
      },
    });

    if (!device) {
      throw new NotFoundException('Nieprawidłowy lub zużyty claim token');
    }
    if (device.secretHash) {
      throw new BadRequestException('Urządzenie już sparowane');
    }
    if (
      !device.claimTokenExpiresAt ||
      device.claimTokenExpiresAt.getTime() < Date.now()
    ) {
      throw new UnauthorizedException('Claim token wygasł — przygotuj ponownie');
    }

    const deviceSecret = randomTokenHex(32);
    const secretHash = sha256Hex(deviceSecret);
    const now = new Date();

    const updated = await this.prisma.device.update({
      where: { id: device.id },
      data: {
        secretHash,
        claimedAt: now,
        lastSeenAt: now,
        wifiConfigured: true,
        claimTokenHash: null,
        claimTokenExpiresAt: null,
      },
      select: {
        id: true,
        publicId: true,
        dependentUserId: true,
        name: true,
      },
    });

    return {
      deviceId: updated.id,
      publicId: updated.publicId,
      dependentUserId: updated.dependentUserId,
      name: updated.name,
      deviceSecret,
    };
  }

  async listDevices(caretakerId: string) {
    return this.prisma.device.findMany({
      where: { caretakerId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        publicId: true,
        name: true,
        dependentUserId: true,
        claimedAt: true,
        lastSeenAt: true,
        wifiConfigured: true,
        createdAt: true,
        dependent: {
          select: { id: true, name: true, email: true, lastMood: true },
        },
      },
    });
  }

  async deleteDevice(caretakerId: string, deviceId: string) {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
      select: { id: true, caretakerId: true, dependentUserId: true },
    });
    if (!device || device.caretakerId !== caretakerId) {
      throw new NotFoundException('Urządzenie nie istnieje');
    }

    await this.users.deleteDependentAccount(
      caretakerId,
      device.dependentUserId,
    );
    return { ok: true };
  }

  async findDeviceBySecret(
    secret: string,
  ): Promise<AuthenticatedDevice | null> {
    const secretHash = sha256Hex(secret.trim());
    const device = await this.prisma.device.findUnique({
      where: { secretHash },
      select: {
        id: true,
        publicId: true,
        caretakerId: true,
        dependentUserId: true,
        name: true,
      },
    });
    return device;
  }

  async touchLastSeen(deviceId: string) {
    await this.prisma.device.update({
      where: { id: deviceId },
      data: { lastSeenAt: new Date() },
    });
  }

  async getDeviceState(device: AuthenticatedDevice) {
    await this.touchLastSeen(device.id);

    const now = new Date();
    const tz = getAppTimezone();
    const todayYmd = formatLocalYmd(now, tz);
    const { start, end } = getLocalDayRange(todayYmd, tz);
    const windowMs = DOSE_CONFIRMATION_WINDOW_MINUTES * 60 * 1000;

    const [logs, dependent] = await Promise.all([
      this.prisma.doseLog.findMany({
        where: {
          schedule: { userId: device.dependentUserId },
          scheduledAt: { gte: start, lt: end },
        },
        include: {
          schedule: {
            select: {
              id: true,
              medication: true,
              dosage: true,
              time: true,
              inventory: { select: { name: true, type: true } },
            },
          },
        },
        orderBy: { scheduledAt: 'asc' },
      }),
      this.prisma.user.findUnique({
        where: { id: device.dependentUserId },
        select: {
          id: true,
          name: true,
          lastMood: true,
          lastMoodAt: true,
          moodEnabled: true,
        },
      }),
    ]);

    const doses = logs.map((log) => {
      const scheduledMs = log.scheduledAt.getTime();
      const inWindow =
        now.getTime() >= scheduledMs - windowMs &&
        now.getTime() <= scheduledMs + windowMs;
      const pending = log.status === 'PENDING';
      const shouldAlarm = pending && inWindow;
      return {
        logId: log.id,
        scheduleId: log.schedule.id,
        medication:
          log.schedule.inventory?.name?.trim() ||
          log.schedule.medication?.trim() ||
          'lek',
        dosage: log.schedule.dosage,
        time: log.schedule.time,
        status: log.status,
        scheduledAt: log.scheduledAt.toISOString(),
        shouldAlarm,
      };
    });

    const weekday = this.localWeekdayIndex(now, tz); // 0=Pn … 6=Nd

    return {
      serverTime: now.toISOString(),
      timeZone: tz,
      weekday,
      device: {
        id: device.id,
        publicId: device.publicId,
        name: device.name,
      },
      dependent: dependent
        ? {
            id: dependent.id,
            name: dependent.name,
            lastMood: dependent.lastMood,
            lastMoodAt: dependent.lastMoodAt,
            moodEnabled: dependent.moodEnabled,
          }
        : null,
      shouldAlarm: doses.some((d) => d.shouldAlarm),
      doses,
    };
  }

  async markDoseFromDevice(
    device: AuthenticatedDevice,
    scheduleId: string,
    status: 'TAKEN' | 'MISSED',
    clientEventId?: string,
  ) {
    return this.withIdempotency(device.id, clientEventId, 'MARK', async () => {
      await this.touchLastSeen(device.id);
      const log = await this.schedules.markDose(
        device.dependentUserId,
        scheduleId,
        status,
        'DEVICE_ESP32',
      );
      return { duplicate: false as const, log };
    });
  }

  async moodFromDevice(
    device: AuthenticatedDevice,
    mood: string,
    clientEventId?: string,
  ) {
    return this.withIdempotency(device.id, clientEventId, 'MOOD', async () => {
      await this.touchLastSeen(device.id);
      const result = await this.users.updateMood(
        device.dependentUserId,
        mood,
        'DEVICE_ESP32',
      );
      return { duplicate: false as const, mood: result };
    });
  }

  async sosFromDevice(
    device: AuthenticatedDevice,
    note?: string,
    clientEventId?: string,
  ) {
    return this.withIdempotency(device.id, clientEventId, 'SOS', async () => {
      await this.touchLastSeen(device.id);
      const log = await this.users.createSosLog(
        device.dependentUserId,
        note,
        'DEVICE_ESP32',
      );
      return { duplicate: false as const, log };
    });
  }

  private async withIdempotency<T>(
    deviceId: string,
    clientEventId: string | undefined,
    kind: string,
    fn: () => Promise<T>,
  ): Promise<T | { duplicate: true; kind: string; clientEventId: string }> {
    const id = clientEventId?.trim();
    if (!id) {
      return fn();
    }

    try {
      await this.prisma.deviceEvent.create({
        data: { deviceId, clientEventId: id, kind },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        return { duplicate: true, kind, clientEventId: id };
      }
      throw err;
    }

    return fn();
  }

  private async allocatePublicId(): Promise<string> {
    for (let attempt = 0; attempt < 12; attempt++) {
      const publicId = randomPublicId(4);
      const existing = await this.prisma.device.findUnique({
        where: { publicId },
        select: { id: true },
      });
      if (!existing) return publicId;
    }
    throw new BadRequestException('Nie udało się wygenerować publicId');
  }

  /** 0 = poniedziałek … 6 = niedziela (Europe/Warsaw). */
  private localWeekdayIndex(now: Date, timeZone: string): number {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
    });
    const short = fmt.format(now);
    const map: Record<string, number> = {
      Mon: 0,
      Tue: 1,
      Wed: 2,
      Thu: 3,
      Fri: 4,
      Sat: 5,
      Sun: 6,
    };
    return map[short] ?? 0;
  }
}
