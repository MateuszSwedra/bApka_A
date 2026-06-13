import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
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

function useDateLocale() {
  const { i18n } = useTranslation();
  return i18n.language?.startsWith('pl') ? pl : enUS;
}

function HeatmapCell({ status, size, label }: { status: DayStatus; size: number; label?: string }) {
  const bg = getDayStatusColor(status);
  const isEmpty = status === 'empty';
  return (
    <View style={styles.cellWrap}>
      <View
        style={[
          styles.cell,
          {
            width: size,
            height: size,
            backgroundColor: bg,
            borderWidth: isEmpty ? 1 : 0,
            borderColor: Theme.colors.border,
          },
        ]}
      />
      {label ? <Text style={styles.cellLabel}>{label}</Text> : null}
    </View>
  );
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

export function DisciplineHeatmap({ daily, range, fromIso, toIso }: Props) {
  const { t } = useTranslation();
  const locale = useDateLocale();

  const days = useMemo(
    () => fillDailyGaps(daily, fromIso, toIso),
    [daily, fromIso, toIso],
  );

  const todayEntry = days[days.length - 1];

  if (range === 'today') {
    const status = todayEntry?.status ?? 'empty';
    return (
      <View style={styles.section}>
        <Text style={styles.title}>{t('caretaker.insights.disciplineCalendar')}</Text>
        <View style={styles.todayWrap}>
          <HeatmapCell status={status} size={72} />
          <View style={styles.todayTextCol}>
            <Text style={styles.todayStatus}>
              {t(`caretaker.insights.dayStatus.${status}`)}
            </Text>
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

  if (range === 'week') {
    const cellSize = 36;
    return (
      <View style={styles.section}>
        <Text style={styles.title}>{t('caretaker.insights.disciplineCalendar')}</Text>
        <View style={styles.weekRow}>
          {days.map((day) => {
            const d = parseISO(`${day.date}T12:00:00`);
            const label = format(d, 'EEE', { locale }).slice(0, 2);
            return (
              <HeatmapCell
                key={day.date}
                status={day.status ?? 'empty'}
                size={cellSize}
                label={label}
              />
            );
          })}
        </View>
        <HeatmapLegend />
      </View>
    );
  }

  const cellSize = 14;
  const gap = 3;
  const cols = 7;
  const rows: DailyEntry[][] = [];
  for (let i = 0; i < days.length; i += cols) {
    rows.push(days.slice(i, i + cols));
  }

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{t('caretaker.insights.disciplineCalendar')}</Text>
      <View style={[styles.monthGrid, { gap }]}>
        {rows.map((row, ri) => (
          <View key={`row-${ri}`} style={[styles.monthRow, { gap }]}>
            {row.map((day) => (
              <View
                key={day.date}
                style={[
                  styles.cell,
                  {
                    width: cellSize,
                    height: cellSize,
                    backgroundColor: getDayStatusColor(day.status ?? 'empty'),
                    borderWidth: day.status === 'empty' ? 1 : 0,
                    borderColor: Theme.colors.border,
                  },
                ]}
              />
            ))}
          </View>
        ))}
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
    marginBottom: Theme.spacing.s,
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
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.s,
    padding: Theme.spacing.s,
    backgroundColor: Theme.colors.calendarCanvas,
    borderRadius: Theme.borderRadius.medium,
  },
  cellWrap: {
    alignItems: 'center',
    gap: 4,
  },
  cell: {
    borderRadius: 4,
  },
  cellLabel: {
    fontSize: 10,
    color: Theme.colors.textLight,
    fontWeight: '600',
  },
  monthGrid: {
    marginBottom: Theme.spacing.s,
    padding: Theme.spacing.s,
    backgroundColor: Theme.colors.calendarCanvas,
    borderRadius: Theme.borderRadius.medium,
  },
  monthRow: {
    flexDirection: 'row',
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
