import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../constants/theme';
import { TREATMENT_VISUAL, type TreatmentType } from '../../constants/treatmentVisuals';
import type { ScheduleItem } from '../../context/MedsContext';
import { getScheduleTreatmentId } from '../../context/MedsContext';
import { scheduleAppliesToDate } from '../../utils/scheduleHelpers';

export type CalendarDepletionAlert = { date: string; inventoryItemName: string };

type DayChip = {
  id: string;
  label: string;
  color: string;
  textColor: string;
  kind: 'schedule' | 'alert';
};

type Props = {
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  schedules: ScheduleItem[];
  treatments: { id: string; name: string; type?: TreatmentType }[];
  depletionAlerts: CalendarDepletionAlert[];
  labelForSchedule: (sch: ScheduleItem) => string;
};

const MAX_CHIPS = 2;
const WEEK_STARTS_ON = 1 as const;
const CELL_GAP = 3;
const CELL_RADIUS = 8;

function weekdayLabels(t: (key: string) => string): string[] {
  return ['1', '2', '3', '4', '5', '6', '7'].map(k => t(`calendar.weekdayShort.${k}`));
}

export function AndroidStyleMonthCalendar({
  selectedDate,
  onSelectDate,
  schedules,
  treatments,
  depletionAlerts,
  labelForSchedule,
}: Props) {
  const { t } = useTranslation();
  const [visibleMonth, setVisibleMonth] = useState(() =>
    startOfMonth(parseISO(selectedDate)),
  );
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);

  const monthNames = t('calendar.monthNames', { returnObjects: true }) as string[];
  const monthTitle = monthNames[visibleMonth.getMonth()] ?? format(visibleMonth, 'MMMM');

  const gridDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(visibleMonth), { weekStartsOn: WEEK_STARTS_ON });
    const end = endOfWeek(endOfMonth(visibleMonth), { weekStartsOn: WEEK_STARTS_ON });
    return eachDayOfInterval({ start, end });
  }, [visibleMonth]);

  const weeks = useMemo(() => {
    const rows: Date[][] = [];
    for (let i = 0; i < gridDays.length; i += 7) {
      rows.push(gridDays.slice(i, i + 7));
    }
    return rows;
  }, [gridDays]);

  const chipsByDate = useMemo(() => {
    const map = new Map<string, DayChip[]>();

    const push = (dateStr: string, chip: DayChip) => {
      const list = map.get(dateStr) ?? [];
      list.push(chip);
      map.set(dateStr, list);
    };

    depletionAlerts.forEach(alert => {
      push(alert.date, {
        id: `alert-${alert.date}-${alert.inventoryItemName}`,
        label: t('caretaker.calendar.alertDepletionWithName', {
          name: alert.inventoryItemName,
        }),
        color: Theme.colors.accentOrange,
        textColor: Theme.colors.surfaceWhite,
        kind: 'alert',
      });
    });

    const windowStart = gridDays[0];
    const windowEnd = gridDays[gridDays.length - 1];
    const windowDays = eachDayOfInterval({ start: windowStart, end: windowEnd });

    windowDays.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      schedules
        .filter(s => scheduleAppliesToDate(s, dateStr))
        .forEach(sch => {
          const tid = getScheduleTreatmentId(sch);
          const treatmentType = treatments.find(tr => tr.id === tid)?.type;
          const accent =
            treatmentType && TREATMENT_VISUAL[treatmentType]
              ? TREATMENT_VISUAL[treatmentType].accent
              : Theme.colors.primaryLimeDark;
          push(dateStr, {
            id: sch.id,
            label: labelForSchedule(sch),
            color: accent,
            textColor: Theme.colors.surfaceWhite,
            kind: 'schedule',
          });
        });
    });

    return map;
  }, [depletionAlerts, schedules, treatments, gridDays, labelForSchedule, t]);

  const selectedParsed = parseISO(selectedDate);
  const rowCount = weeks.length;
  const gridBodyMinHeight = Math.max(320, rowCount * 80);

  const goPrevMonth = () => setVisibleMonth(m => addMonths(m, -1));
  const goNextMonth = () => setVisibleMonth(m => addMonths(m, 1));

  const pickMonth = (monthIndex: number) => {
    const next = new Date(visibleMonth.getFullYear(), monthIndex, 1);
    setVisibleMonth(next);
    setMonthPickerOpen(false);
  };

  return (
    <View style={styles.root}>
      <View style={styles.toolbar}>
        <Pressable
          onPress={goPrevMonth}
          style={styles.navBtn}
          accessibilityRole="button"
          accessibilityLabel={t('calendar.prevMonth')}
        >
          <MaterialIcons name="chevron-left" size={28} color={Theme.colors.textDark} />
        </Pressable>

        <Pressable
          style={styles.monthTitleBtn}
          onPress={() => setMonthPickerOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t('calendar.pickMonth')}
        >
          <Text style={styles.monthTitle}>{monthTitle}</Text>
          <MaterialIcons name="arrow-drop-down" size={28} color={Theme.colors.textDark} />
        </Pressable>

        <Pressable
          onPress={goNextMonth}
          style={styles.navBtn}
          accessibilityRole="button"
          accessibilityLabel={t('calendar.nextMonth')}
        >
          <MaterialIcons name="chevron-right" size={28} color={Theme.colors.textDark} />
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {weekdayLabels(t).map(label => (
          <View key={label} style={styles.weekdayCell}>
            <Text style={styles.weekdayText}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.gridBody, { minHeight: gridBodyMinHeight }]}>
        {weeks.map((week, wi) => (
          <View key={wi} style={styles.weekRow}>
            {week.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const isSelected = isSameDay(day, selectedParsed);
              const isTodayDate = isToday(day);
              const chips = chipsByDate.get(dateStr) ?? [];
              const visibleChips = chips.slice(0, MAX_CHIPS);
              const extra = chips.length - visibleChips.length;

              return (
                <Pressable
                  key={dateStr}
                  style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                  onPress={() => onSelectDate(dateStr)}
                >
                  <View style={styles.dayNumberWrap}>
                    {isTodayDate ? (
                      <View style={styles.todayPill}>
                        <Text style={styles.todayPillText}>{format(day, 'd')}</Text>
                      </View>
                    ) : (
                      <Text style={[styles.dayNumber, isSelected && styles.dayNumberSelected]}>
                        {format(day, 'd')}
                      </Text>
                    )}
                  </View>

                  <View style={styles.chipColumn}>
                    {visibleChips.map(chip => (
                      <View
                        key={chip.id}
                        style={[styles.eventChip, { backgroundColor: chip.color }]}
                      >
                        <Text
                          style={[styles.eventChipText, { color: chip.textColor }]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {chip.label}
                        </Text>
                      </View>
                    ))}
                    {extra > 0 && (
                      <Text style={styles.moreEvents} numberOfLines={1}>
                        {t('calendar.moreEvents', { count: extra })}
                      </Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      <Modal visible={monthPickerOpen} transparent animationType="fade">
        <Pressable style={styles.pickerBackdrop} onPress={() => setMonthPickerOpen(false)}>
          <Pressable style={styles.pickerCard} onPress={e => e.stopPropagation()}>
            <Text style={styles.pickerTitle}>{visibleMonth.getFullYear()}</Text>
            <ScrollView style={styles.pickerScroll}>
              {monthNames.map((name, idx) => {
                const active = idx === visibleMonth.getMonth();
                return (
                  <Pressable
                    key={name}
                    style={[styles.pickerRow, active && styles.pickerRowActive]}
                    onPress={() => pickMonth(idx)}
                  >
                    <Text style={[styles.pickerRowText, active && styles.pickerRowTextActive]}>{name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable
              style={styles.todayBtn}
              onPress={() => {
                const now = new Date();
                setVisibleMonth(startOfMonth(now));
                onSelectDate(format(now, 'yyyy-MM-dd'));
                setMonthPickerOpen(false);
              }}
            >
              <Text style={styles.todayBtnText}>{t('calendar.today')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Theme.colors.calendarCanvas,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.s,
    paddingVertical: Theme.spacing.s,
    backgroundColor: Theme.colors.calendarCanvas,
  },
  navBtn: {
    padding: Theme.spacing.s,
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthTitleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    gap: 2,
  },
  monthTitle: {
    fontSize: 22,
    fontWeight: '500',
    color: Theme.colors.textDark,
  },
  weekdayRow: {
    flexDirection: 'row',
    paddingBottom: Theme.spacing.xs,
    backgroundColor: Theme.colors.calendarCanvas,
  },
  weekdayCell: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: Theme.typography.small,
    fontWeight: '600',
    color: Theme.colors.textLight,
    textTransform: 'uppercase',
  },
  gridBody: {
    flex: 1,
    backgroundColor: Theme.colors.calendarCanvas,
    paddingHorizontal: CELL_GAP,
    paddingBottom: CELL_GAP,
  },
  weekRow: {
    flex: 1,
    flexDirection: 'row',
    gap: CELL_GAP,
    marginBottom: CELL_GAP,
  },
  dayCell: {
    flex: 1,
    borderRadius: CELL_RADIUS,
    paddingHorizontal: 3,
    paddingTop: 4,
    paddingBottom: 3,
    minHeight: 72,
    backgroundColor: Theme.colors.calendarCell,
    overflow: 'hidden',
  },
  dayCellSelected: {
    borderWidth: 2,
    borderColor: Theme.colors.primaryLimeDark,
    paddingHorizontal: 1,
    paddingTop: 2,
  },
  dayNumberWrap: {
    alignItems: 'center',
    marginBottom: 3,
  },
  dayNumber: {
    fontSize: Theme.typography.caption,
    fontWeight: '500',
    color: Theme.colors.textDark,
    textAlign: 'center',
    minWidth: 28,
    paddingVertical: 2,
  },
  dayNumberSelected: {
    fontWeight: '700',
    color: Theme.colors.primaryLimeDark,
  },
  todayPill: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Theme.colors.primaryLime,
    borderWidth: 1,
    borderColor: Theme.colors.primaryLimeDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayPillText: {
    fontSize: Theme.typography.caption,
    fontWeight: '700',
    color: Theme.colors.textDark,
  },
  chipColumn: {
    flex: 1,
    gap: 2,
  },
  eventChip: {
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 3,
    justifyContent: 'center',
  },
  eventChipText: {
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 12,
  },
  moreEvents: {
    fontSize: 10,
    color: Theme.colors.textLight,
    paddingLeft: 2,
    fontWeight: '600',
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(27, 60, 83, 0.45)',
    justifyContent: 'center',
    padding: Theme.spacing.l,
  },
  pickerCard: {
    backgroundColor: Theme.colors.calendarCell,
    borderRadius: Theme.borderRadius.large,
    maxHeight: '70%',
    padding: Theme.spacing.m,
  },
  pickerRow: {
    paddingVertical: 12,
    paddingHorizontal: Theme.spacing.m,
    borderRadius: Theme.borderRadius.medium,
  },
  pickerRowActive: {
    backgroundColor: Theme.colors.primaryLime,
  },
  pickerRowText: {
    fontSize: Theme.typography.body,
    color: Theme.colors.textDark,
  },
  pickerRowTextActive: {
    fontWeight: '700',
    color: Theme.colors.primaryLimeDark,
  },
  todayBtn: {
    marginTop: Theme.spacing.m,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: Theme.spacing.l,
  },
  todayBtnText: {
    fontSize: Theme.typography.body,
    fontWeight: '700',
    color: Theme.colors.primaryLimeDark,
  },
  pickerTitle: {
    fontSize: Theme.typography.title,
    fontWeight: '700',
    color: Theme.colors.textDark,
    textAlign: 'center',
    marginBottom: Theme.spacing.m,
  },
  pickerScroll: {
    maxHeight: 320,
  },
});
