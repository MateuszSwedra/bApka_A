import React, { useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  eachDayOfInterval,
  endOfWeek,
  format,
  isToday,
  parseISO,
  startOfWeek,
} from 'date-fns';
import { pl, enUS } from 'date-fns/locale';
import { Theme } from '../../constants/theme';
import {
  DailyEntry,
  DayStatus,
  RangeKey,
  fillDailyGaps,
  getDayStatusColor,
} from '../../utils/doseStats';

type Props = {
  daily?: DailyEntry[];
  range: RangeKey;
  fromIso: string;
  toIso: string;
};

const LEGEND_STATUSES: DayStatus[] = ['perfect', 'late', 'missed', 'empty'];
const WEEK_STARTS_ON = 1 as const;
const CELL_GAP = 4;
const MIN_CELL = 40;

function useDateLocale() {
  const { i18n } = useTranslation();
  return i18n.language?.startsWith('pl') ? pl : enUS;
}

function weekdayLabels(t: (key: string) => string): string[] {
  return ['1', '2', '3', '4', '5', '6', '7'].map((k) => t(`calendar.weekdayShort.${k}`));
}

function HeatmapLegend() {
  const { t } = useTranslation();
  return (
    <View style={styles.legendRow}>
      {LEGEND_STATUSES.map((status) => (
        <View key={status} style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: getDayStatusColor(status) }]} />
          <Text style={styles.legendText}>{t(`caretaker.insights.heatmapLegend.${status}`)}</Text>
        </View>
      ))}
    </View>
  );
}

type CalendarDayProps = {
  date: Date;
  entry: DailyEntry;
  inRange: boolean;
  cellSize: number;
  compact?: boolean;
};

function CalendarDayCell({ date, entry, inRange, cellSize, compact }: CalendarDayProps) {
  const status = inRange ? (entry.status ?? 'empty') : 'empty';
  const bg = inRange ? getDayStatusColor(status) : Theme.colors.surfaceGrey;
  const dayNum = format(date, 'd');
  const today = isToday(date);

  return (
    <View
      style={[
        styles.dayCell,
        {
          width: cellSize,
          minHeight: compact ? cellSize : Math.max(cellSize, MIN_CELL),
          backgroundColor: bg,
          opacity: inRange ? 1 : 0.35,
        },
        status === 'empty' && inRange && styles.dayCellEmpty,
      ]}
    >
      {today && inRange ? (
        <View style={styles.todayPill}>
          <Text style={styles.todayPillText}>{dayNum}</Text>
        </View>
      ) : (
        <Text
          style={[
            styles.dayNumber,
            !inRange && styles.dayNumberMuted,
            status === 'missed' && inRange && styles.dayNumberOnDark,
            status === 'perfect' && inRange && styles.dayNumberOnDark,
            status === 'late' && inRange && styles.dayNumberOnDark,
          ]}
        >
          {dayNum}
        </Text>
      )}
    </View>
  );
}

function CalendarGrid({
  gridDays,
  daysByDate,
  rangeFrom,
  rangeTo,
  cellSize,
  compact,
}: {
  gridDays: Date[];
  daysByDate: Map<string, DailyEntry>;
  rangeFrom: Date;
  rangeTo: Date;
  cellSize: number;
  compact?: boolean;
}) {
  const weeks: Date[][] = [];
  for (let i = 0; i < gridDays.length; i += 7) {
    weeks.push(gridDays.slice(i, i + 7));
  }

  const rangeFromYmd = format(rangeFrom, 'yyyy-MM-dd');
  const rangeToYmd = format(rangeTo, 'yyyy-MM-dd');

  return (
    <View style={styles.gridBody}>
      {weeks.map((week, wi) => (
        <View key={`w-${wi}`} style={[styles.weekRow, { gap: CELL_GAP }]}>
          {week.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const inRange = key >= rangeFromYmd && key <= rangeToYmd;
            const entry = daysByDate.get(key) ?? {
              date: key,
              taken: 0,
              missed: 0,
              pending: 0,
              status: 'empty' as DayStatus,
            };
            return (
              <CalendarDayCell
                key={key}
                date={day}
                entry={entry}
                inRange={inRange}
                cellSize={cellSize}
                compact={compact}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

export function DisciplineHeatmap({ daily, range, fromIso, toIso }: Props) {
  const { t } = useTranslation();
  const locale = useDateLocale();
  const { width: windowWidth } = useWindowDimensions();

  const from = parseISO(fromIso);
  const to = parseISO(toIso);

  const days = useMemo(
    () => fillDailyGaps(daily, fromIso, toIso),
    [daily, fromIso, toIso],
  );

  const daysByDate = useMemo(() => {
    const map = new Map<string, DailyEntry>();
    for (const d of days) map.set(d.date, d);
    return map;
  }, [days]);

  const cardInnerWidth = Math.min(windowWidth - Theme.spacing.l * 2 - Theme.spacing.m * 2, 480);
  const cellSize = Math.floor((cardInnerWidth - CELL_GAP * 6) / 7);

  const todayEntry = days[days.length - 1];

  const monthTitle = useMemo(() => {
    if (range === 'today') return format(to, 'd MMMM yyyy', { locale });
    if (range === 'week') {
      return `${format(from, 'd MMM', { locale })} – ${format(to, 'd MMM yyyy', { locale })}`;
    }
    return `${format(from, 'd MMM', { locale })} – ${format(to, 'd MMM yyyy', { locale })}`;
  }, [from, to, locale, range]);

  if (range === 'today') {
    const status = todayEntry?.status ?? 'empty';
    const todayDate = to;
    return (
      <View style={styles.section}>
        <Text style={styles.title}>{t('caretaker.insights.disciplineCalendar')}</Text>
        <Text style={styles.periodLabel}>{monthTitle}</Text>
        <View style={styles.todayWrap}>
          <View
            style={[
              styles.todayCell,
              { backgroundColor: getDayStatusColor(status) },
              status === 'empty' && styles.dayCellEmpty,
            ]}
          >
            <Text style={[styles.todayCellDay, status !== 'empty' && status !== 'pending' && styles.dayNumberOnDark]}>
              {format(todayDate, 'd')}
            </Text>
            <Text style={[styles.todayCellWeekday, status !== 'empty' && status !== 'pending' && styles.dayNumberOnDark]}>
              {format(todayDate, 'EEEE', { locale })}
            </Text>
          </View>
          <View style={styles.todayTextCol}>
            <Text style={styles.todayStatus}>{t(`caretaker.insights.dayStatus.${status}`)}</Text>
            {todayEntry && todayEntry.status !== 'empty' ? (
              <Text style={styles.todayDetail}>
                {t('caretaker.insights.dayDetail', {
                  taken: todayEntry.taken,
                  total: todayEntry.totalPlanned ?? todayEntry.taken + todayEntry.missed + todayEntry.pending,
                })}
              </Text>
            ) : (
              <Text style={styles.todayDetail}>{t('caretaker.insights.heatmapLegend.empty')}</Text>
            )}
          </View>
        </View>
        <HeatmapLegend />
      </View>
    );
  }

  const gridStart = startOfWeek(from, { weekStartsOn: WEEK_STARTS_ON });
  const gridEnd = endOfWeek(to, { weekStartsOn: WEEK_STARTS_ON });
  const gridDays = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{t('caretaker.insights.disciplineCalendar')}</Text>
      <Text style={styles.periodLabel}>{monthTitle}</Text>

      <View style={styles.calendarCard}>
        <View style={styles.weekdayRow}>
          {weekdayLabels(t).map((label) => (
            <View key={label} style={[styles.weekdayCell, { width: cellSize }]}>
              <Text style={styles.weekdayText}>{label}</Text>
            </View>
          ))}
        </View>

        <CalendarGrid
          gridDays={gridDays}
          daysByDate={daysByDate}
          rangeFrom={from}
          rangeTo={to}
          cellSize={cellSize}
          compact={range === 'week'}
        />
      </View>

      <HeatmapLegend />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Theme.spacing.m,
  },
  title: {
    fontSize: Theme.typography.caption,
    fontWeight: '700',
    color: Theme.colors.textDark,
    marginBottom: 4,
  },
  periodLabel: {
    fontSize: Theme.typography.small,
    color: Theme.colors.textLight,
    marginBottom: Theme.spacing.s,
  },
  calendarCard: {
    backgroundColor: Theme.colors.calendarCanvas,
    borderRadius: Theme.borderRadius.medium,
    padding: Theme.spacing.s,
    marginBottom: Theme.spacing.s,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: CELL_GAP,
    gap: CELL_GAP,
  },
  weekdayCell: {
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.textLight,
    textTransform: 'uppercase',
  },
  gridBody: {
    gap: CELL_GAP,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCell: {
    borderRadius: 8,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  dayCellEmpty: {
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: Theme.colors.textDark,
  },
  dayNumberMuted: {
    color: Theme.colors.textLight,
  },
  dayNumberOnDark: {
    color: Theme.colors.surfaceWhite,
  },
  todayPill: {
    backgroundColor: Theme.colors.accentOrange,
    borderRadius: 999,
    minWidth: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  todayPillText: {
    fontSize: 13,
    fontWeight: '800',
    color: Theme.colors.surfaceWhite,
  },
  todayWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.m,
    marginBottom: Theme.spacing.s,
    padding: Theme.spacing.m,
    backgroundColor: Theme.colors.calendarCanvas,
    borderRadius: Theme.borderRadius.medium,
  },
  todayCell: {
    width: 88,
    height: 88,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  todayCellDay: {
    fontSize: 32,
    fontWeight: '800',
    color: Theme.colors.textDark,
  },
  todayCellWeekday: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.colors.textDark,
    textTransform: 'capitalize',
  },
  todayTextCol: {
    flex: 1,
  },
  todayStatus: {
    fontSize: Theme.typography.body,
    fontWeight: '700',
    color: Theme.colors.textDark,
  },
  todayDetail: {
    fontSize: Theme.typography.small,
    color: Theme.colors.textLight,
    marginTop: 4,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.s,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  legendText: {
    fontSize: 10,
    color: Theme.colors.textLight,
  },
});
