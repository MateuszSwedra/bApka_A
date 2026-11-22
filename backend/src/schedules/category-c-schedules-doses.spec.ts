

jest.mock('@prisma/client', () => ({
  Role: {
    DEPENDENT: 'DEPENDENT',
    CARETAKER: 'CARETAKER',
    HYBRID: 'HYBRID',
  },
  PrismaClient: class PrismaClient {},
}));

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SchedulesService } from './schedules.service';
import { scheduleAppliesToDate, type ScheduleForApply } from './schedule-applies';
import {
  classifyDayStatus,
  computeAdherencePercent,
  enrichDailyEntry,
} from './dose-stats.helpers';
import { buildDoseStatsPayload } from './dose-stats.build';
import { formatLocalYmd, getLocalDayRange } from '../common/app-timezone';
import { normalizeHm } from '../common/normalize-hm';
import { DOSE_CONFIRMATION_WINDOW_MINUTES } from '../common/dose-windows';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AccessControlService } from '../common/access-control.service';
import { createPrismaMock, PrismaMock } from '../../test/helpers/prisma.mock';

const TZ = 'Europe/Warsaw';


function frontendScheduleAppliesToDate(
  s: {
    type: string;
    startDate?: string | null;
    endDate?: string | null;
    daysOfWeek?: number[];
  },
  dateStr: string,
): boolean {
  const scheduleType = String(s.type).toUpperCase();
  if (scheduleType === 'ONCE') {
    return (s.startDate?.trim().slice(0, 10) || undefined) === dateStr;
  }
  const startDate = s.startDate?.trim().slice(0, 10) || '1970-01-01';
  if (dateStr.localeCompare(startDate) < 0) return false;

  const [y, m, d] = dateStr.split('-').map(Number);
  const day = new Date(y, m - 1, d).getDay();
  const dow = day === 0 ? 7 : day;
  const days = s.daysOfWeek ?? [];
  const everyDay =
    days.length === 0 &&
    (scheduleType === 'TEMPORARY' || scheduleType === 'DAILY' || scheduleType === 'REGULAR');
  if (!everyDay && !days.includes(dow)) return false;

  if (scheduleType === 'TEMPORARY' && s.endDate?.trim()) {
    return dateStr.localeCompare(s.endDate.trim().slice(0, 10)) <= 0;
  }
  return true;
}

describe('Category C - schedules, dose window, adherence', () => {
  const prevTz = process.env.APP_TIMEZONE;

  beforeAll(() => {
    process.env.APP_TIMEZONE = TZ;
  });

  afterAll(() => {
    if (prevTz === undefined) delete process.env.APP_TIMEZONE;
    else process.env.APP_TIMEZONE = prevTz;
  });



  describe('C-01 ONCE only on startDate', () => {
    const once: ScheduleForApply = {
      id: 's-once',
      type: 'ONCE',
      startDate: '2026-06-15',
    };

    it('applies only on the start date', () => {
      expect(scheduleAppliesToDate(once, '2026-06-15', TZ)).toBe(true);
      expect(scheduleAppliesToDate(once, '2026-06-14', TZ)).toBe(false);
      expect(scheduleAppliesToDate(once, '2026-06-16', TZ)).toBe(false);
    });
  });

  describe('C-02 REGULAR with daysOfWeek', () => {

    const regular: ScheduleForApply = {
      id: 's-reg',
      type: 'REGULAR',
      startDate: '2026-01-01',
      daysOfWeek: [1, 3, 5],
    };

    it('applies on listed weekdays only', () => {
      expect(scheduleAppliesToDate(regular, '2026-06-15', TZ)).toBe(true); // Mon
      expect(scheduleAppliesToDate(regular, '2026-06-16', TZ)).toBe(false); // Tue
      expect(scheduleAppliesToDate(regular, '2026-06-17', TZ)).toBe(true); // Wed
    });
  });

  describe('C-03 TEMPORARY date range', () => {
    const temporary: ScheduleForApply = {
      id: 's-tmp',
      type: 'TEMPORARY',
      startDate: '2026-06-10',
      endDate: '2026-06-12',
      daysOfWeek: [],
    };

    it('applies inside range and rejects outside', () => {
      expect(scheduleAppliesToDate(temporary, '2026-06-09', TZ)).toBe(false);
      expect(scheduleAppliesToDate(temporary, '2026-06-10', TZ)).toBe(true);
      expect(scheduleAppliesToDate(temporary, '2026-06-12', TZ)).toBe(true);
      expect(scheduleAppliesToDate(temporary, '2026-06-13', TZ)).toBe(false);
    });
  });

  describe('C-04 BE/FE scheduleApplies contract [K]', () => {
    const cases: Array<{
      label: string;
      schedule: ScheduleForApply;
      date: string;
    }> = [
      {
        label: 'ONCE hit',
        schedule: { id: '1', type: 'ONCE', startDate: '2026-06-15' },
        date: '2026-06-15',
      },
      {
        label: 'ONCE miss',
        schedule: { id: '1', type: 'ONCE', startDate: '2026-06-15' },
        date: '2026-06-16',
      },
      {
        label: 'REGULAR Mon',
        schedule: {
          id: '2',
          type: 'REGULAR',
          startDate: '2026-01-01',
          daysOfWeek: [1, 3, 5],
        },
        date: '2026-06-15',
      },
      {
        label: 'REGULAR Tue excluded',
        schedule: {
          id: '2',
          type: 'REGULAR',
          startDate: '2026-01-01',
          daysOfWeek: [1, 3, 5],
        },
        date: '2026-06-16',
      },
      {
        label: 'TEMPORARY in range',
        schedule: {
          id: '3',
          type: 'TEMPORARY',
          startDate: '2026-06-10',
          endDate: '2026-06-12',
          daysOfWeek: [],
        },
        date: '2026-06-11',
      },
      {
        label: 'TEMPORARY after end',
        schedule: {
          id: '3',
          type: 'TEMPORARY',
          startDate: '2026-06-10',
          endDate: '2026-06-12',
          daysOfWeek: [],
        },
        date: '2026-06-13',
      },
      {
        label: 'DAILY every day empty daysOfWeek',
        schedule: {
          id: '4',
          type: 'DAILY',
          startDate: '2026-06-01',
          daysOfWeek: [],
        },
        date: '2026-06-15',
      },
    ];

    it.each(cases)('$label: backend matches frontend-equivalent', ({ schedule, date }) => {
      const be = scheduleAppliesToDate(schedule, date, TZ);
      const fe = frontendScheduleAppliesToDate(schedule, date);
      expect(be).toBe(fe);
    });
  });


  describe('SchedulesService markDose / CRUD', () => {
    let prisma: PrismaMock;
    let service: SchedulesService;
    const notifications = {
      formatUserName: jest.fn().mockReturnValue('Daniel'),
      formatMedName: jest.fn().mockReturnValue('Szymon'),
      notifyDoseTaken: jest.fn(),
      notifyDoseMissed: jest.fn(),
      notifyDependentDataChanged: jest.fn(),
      processInventoryAlerts: jest.fn(),
    };
    const access = {
      assertCanAccessUser: jest.fn().mockResolvedValue(undefined),
      assertCanAccessSchedule: jest.fn().mockResolvedValue({ userId: 'dep-1' }),
      assertCanAccessInventory: jest.fn().mockResolvedValue({ userId: 'dep-1' }),
    };

    beforeEach(async () => {
      jest.clearAllMocks();
      jest.useRealTimers();
      prisma = createPrismaMock();
      access.assertCanAccessUser.mockResolvedValue(undefined);
      access.assertCanAccessSchedule.mockResolvedValue({ userId: 'dep-1' });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SchedulesService,
          { provide: PrismaService, useValue: prisma },
          { provide: NotificationsService, useValue: notifications },
          { provide: AccessControlService, useValue: access },
        ],
      }).compile();
      service = module.get(SchedulesService);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    describe('C-05 TAKEN inside confirmation window [K]', () => {
      it('marks TAKEN when confirming at scheduled time', async () => {
        const scheduled = new Date();
        scheduled.setHours(14, 0, 0, 0);
        jest.useFakeTimers();
        jest.setSystemTime(scheduled);

        prisma.doseLog.findFirst.mockResolvedValue({
          id: 'log-1',
          scheduledAt: scheduled,
          status: 'PENDING',
        });
        prisma.schedule.findUnique.mockResolvedValue({
          id: 'sched-1',
          time: '14:00',
          user: { id: 'dep-1', name: 'Daniel', email: 'daniel@test.pl' },
          inventory: null,
        });
        prisma.doseLog.update.mockResolvedValue({ id: 'log-1', status: 'TAKEN' });

        await service.markDose('dep-1', 'sched-1', 'TAKEN');
        expect(prisma.doseLog.update).toHaveBeenCalledWith({
          where: { id: 'log-1' },
          data: expect.objectContaining({
            status: 'TAKEN',
            source: 'APP_SENIOR',
          }),
        });
      });
    });

    describe('C-06 LATE after confirmation window [K]', () => {
      it('marks LATE when confirming after window', async () => {
        const scheduled = new Date();
        scheduled.setHours(8, 0, 0, 0);
        const afterWindow = new Date(
          scheduled.getTime() + (DOSE_CONFIRMATION_WINDOW_MINUTES + 1) * 60 * 1000,
        );
        jest.useFakeTimers();
        jest.setSystemTime(afterWindow);

        prisma.doseLog.findFirst.mockResolvedValue({
          id: 'log-1',
          scheduledAt: scheduled,
          status: 'PENDING',
        });
        prisma.schedule.findUnique.mockResolvedValue({
          id: 'sched-1',
          time: '08:00',
          user: { id: 'dep-1', name: 'Daniel', email: 'daniel@test.pl' },
          inventory: null,
        });
        prisma.doseLog.update.mockResolvedValue({ id: 'log-1', status: 'LATE' });

        await service.markDose('dep-1', 'sched-1', 'TAKEN');
        expect(prisma.doseLog.update).toHaveBeenCalledWith({
          where: { id: 'log-1' },
          data: expect.objectContaining({ status: 'LATE' }),
        });
      });
    });

    describe('C-07 MISSED from API', () => {
      it('creates MISSED log without inventory decrement', async () => {
        prisma.doseLog.findFirst.mockResolvedValue(null);
        prisma.schedule.findUnique.mockResolvedValue({
          id: 'sched-1',
          time: '08:00',
          user: { id: 'dep-1', name: 'Daniel', email: 'daniel@test.pl' },
          inventory: { name: 'Szymon', type: 'MEDICATION' },
        });
        prisma.doseLog.create.mockResolvedValue({ id: 'log-new', status: 'MISSED' });

        await service.markDose('dep-1', 'sched-1', 'MISSED');
        expect(prisma.doseLog.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            scheduleId: 'sched-1',
            status: 'MISSED',
            source: 'APP_SENIOR',
          }),
        });
        expect(prisma.inventory.update).not.toHaveBeenCalled();
        expect(notifications.notifyDoseMissed).toHaveBeenCalled();
      });
    });

    describe('C-08 update existing PENDING log', () => {
      it('updates existing log instead of creating a duplicate', async () => {
        const now = new Date();
        const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        prisma.doseLog.findFirst.mockResolvedValue({
          id: 'log-1',
          scheduledAt: now,
          status: 'PENDING',
        });
        prisma.schedule.findUnique.mockResolvedValue({
          id: 'sched-1',
          time,
          user: { id: 'dep-1', name: 'Daniel', email: 'daniel@test.pl' },
          inventory: null,
        });
        prisma.doseLog.update.mockResolvedValue({ id: 'log-1', status: 'TAKEN' });

        await service.markDose('dep-1', 'sched-1', 'TAKEN');
        expect(prisma.doseLog.update).toHaveBeenCalled();
        expect(prisma.doseLog.create).not.toHaveBeenCalled();
      });
    });

    describe('C-09 create log when none exists', () => {
      it('creates log when no dose log for today', async () => {
        prisma.doseLog.findFirst.mockResolvedValue(null);
        prisma.schedule.findUnique.mockResolvedValue({
          id: 'sched-1',
          time: '08:00',
          user: { id: 'dep-1', name: 'Daniel', email: 'daniel@test.pl' },
          inventory: null,
        });
        prisma.doseLog.create.mockResolvedValue({ id: 'log-new' });

        await service.markDose('dep-1', 'sched-1', 'MISSED');
        expect(prisma.doseLog.create).toHaveBeenCalled();
        expect(prisma.doseLog.update).not.toHaveBeenCalled();
      });
    });

    describe('C-15 create schedule + access', () => {
      it('creates with defaults when access allowed', async () => {
        access.assertCanAccessUser.mockResolvedValue(undefined);
        prisma.schedule.create.mockResolvedValue({ id: 's1' });

        await service.create('care-1', 'dep-1', { time: '08:00', medication: 'Szymon' });
        expect(access.assertCanAccessUser).toHaveBeenCalledWith('care-1', 'dep-1');
        expect(prisma.schedule.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            userId: 'dep-1',
            dosage: '1',
            type: 'DAILY',
          }),
        });
      });

      it('rejects create when access denied', async () => {
        access.assertCanAccessUser.mockRejectedValue(new ForbiddenException());
        await expect(
          service.create('stranger', 'dep-1', { time: '08:00' }),
        ).rejects.toThrow(ForbiddenException);
        expect(prisma.schedule.create).not.toHaveBeenCalled();
      });
    });

    describe('C-16 remove cascades dose logs', () => {
      it('deletes dose logs before schedule', async () => {
        access.assertCanAccessSchedule.mockResolvedValue({ userId: 'dep-1' });
        prisma.doseLog.deleteMany.mockResolvedValue({ count: 2 });
        prisma.schedule.delete.mockResolvedValue({ id: 's1' });
        prisma.schedule.findUnique.mockResolvedValue({ userId: 'dep-1' });

        await service.remove('dep-1', 's1');
        expect(prisma.doseLog.deleteMany).toHaveBeenCalledWith({
          where: { scheduleId: 's1' },
        });
        expect(prisma.schedule.delete).toHaveBeenCalledWith({ where: { id: 's1' } });
      });
    });
  });


  describe('C-10 Europe/Warsaw day bounds [K]', () => {
    it('formatLocalYmd and getLocalDayRange cover a Warsaw calendar day', () => {
      // 2026-06-15 22:30 UTC = 2026-06-16 00:30 Warsaw (CEST)
      const warsawMorning = new Date('2026-06-15T22:30:00.000Z');
      expect(formatLocalYmd(warsawMorning, TZ)).toBe('2026-06-16');

      const { start, end } = getLocalDayRange('2026-06-16', TZ);
      expect(start.toISOString()).toBe('2026-06-15T22:00:00.000Z');
      expect(end.toISOString()).toBe('2026-06-16T22:00:00.000Z');
      expect(warsawMorning.getTime()).toBeGreaterThanOrEqual(start.getTime());
      expect(warsawMorning.getTime()).toBeLessThan(end.getTime());
    });
  });

  describe('C-11 normalizeHm', () => {
    it('pads single-digit hour and rejects invalid values', () => {
      expect(normalizeHm('8:00')).toBe('08:00');
      expect(normalizeHm('08:00')).toBe('08:00');
      expect(normalizeHm('25:00')).toBeNull();
      expect(normalizeHm('nope')).toBeNull();
    });
  });



  describe('C-12 adherence percent', () => {
    it('returns 0 when nothing planned and rounds ratio', () => {
      expect(computeAdherencePercent(0, 0)).toBe(0);
      expect(computeAdherencePercent(1, 3)).toBe(33);
      expect(computeAdherencePercent(2, 4)).toBe(50);
    });
  });

  describe('C-13 classifyDayStatus', () => {
    it('classifies perfect, late, missed, pending, empty', () => {
      expect(classifyDayStatus({ taken: 2, late: 0, missed: 0, pending: 0 })).toBe('perfect');
      expect(classifyDayStatus({ taken: 1, late: 1, missed: 0, pending: 0 })).toBe('late');
      expect(classifyDayStatus({ taken: 1, late: 0, missed: 1, pending: 0 })).toBe('missed');
      expect(classifyDayStatus({ taken: 0, late: 0, missed: 0, pending: 1 })).toBe('pending');
      expect(classifyDayStatus({ taken: 0, late: 0, missed: 0, pending: 0 })).toBe('empty');
    });

    it('enrichDailyEntry adds totals and status', () => {
      const enriched = enrichDailyEntry({
        date: '2026-06-15',
        taken: 1,
        late: 0,
        missed: 1,
        pending: 0,
        takenOnTime: 1,
        takenTotal: 1,
      });
      expect(enriched.totalPlanned).toBe(2);
      expect(enriched.adherencePercent).toBe(50);
      expect(enriched.status).toBe('missed');
    });
  });

  describe('C-14 missing slot after deadline counts as MISSED [K]', () => {
    it('counts past slots without logs as missed', () => {
      const from = new Date('2026-06-10T00:00:00.000Z');
      const to = new Date('2026-06-13T23:59:59.999Z');
      const now = new Date('2026-06-13T20:00:00.000Z');

      const result = buildDoseStatsPayload({
        schedules: [
          {
            id: 'sched-1',
            type: 'DAILY',
            startDate: '2026-01-01',
            daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
            time: '08:00',
            medication: 'Szymon',
          },
        ],
        logs: [],
        from,
        to,
        now,
      });

      expect(result.counts.missed).toBeGreaterThan(0);
      expect(result.daily.some((d) => d.status === 'missed')).toBe(true);
    });

    it('keeps future/near slots as pending when still inside window', () => {
      const from = new Date('2026-06-13T00:00:00.000Z');
      const to = new Date('2026-06-13T23:59:59.999Z');
      const now = new Date('2026-06-13T18:00:00.000Z'); // 20:00 Warsaw (CEST)

      const result = buildDoseStatsPayload({
        schedules: [
          {
            id: 'sched-late',
            type: 'DAILY',
            startDate: '2026-01-01',
            daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
            time: '22:00',
            medication: 'Night',
          },
        ],
        logs: [],
        from,
        to,
        now,
      });

      expect(result.counts.pending).toBeGreaterThan(0);
      expect(result.counts.missed).toBe(0);
    });
  });
});
