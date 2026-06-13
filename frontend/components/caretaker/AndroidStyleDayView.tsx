import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { format, isToday, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from 'expo-router';
import { Theme } from '../../constants/theme';
import { TREATMENT_VISUAL, type TreatmentType } from '../../constants/treatmentVisuals';
import type { ScheduleItem } from '../../context/MedsContext';
import { getScheduleTreatmentId } from '../../context/MedsContext';
import { scheduleAppliesToDate, timeToMinutes } from '../../utils/scheduleHelpers';
import type { CalendarDepletionAlert } from './AndroidStyleMonthCalendar';

const HOUR_HEIGHT = 56;
const HOURS = 24;
const TIME_GUTTER = 52;
const EVENT_DURATION_MIN = 48;

type Props = {
  dateStr: string;
  onBack: () => void;
  schedules: ScheduleItem[];
  treatments: { id: string; name: string; type?: TreatmentType }[];
  depletionAlerts: CalendarDepletionAlert[];
  labelForSchedule: (sch: ScheduleItem) => string;
  onEventPress?: (sch: ScheduleItem) => void;
  onSlotPress?: (hour: number) => void;
};

function hourLabel(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`;
}

export function AndroidStyleDayView({
  dateStr,
  onBack,
  schedules,
  treatments,
  depletionAlerts,
  labelForSchedule,
  onEventPress,
  onSlotPress,
}: Props) {
  const { t } = useTranslation();
  const [activeSlotHour, setActiveSlotHour] = useState<number | null>(null);
  const day = parseISO(dateStr);
  const monthNames = t('calendar.monthNames', { returnObjects: true }) as string[];
  const monthTitle = monthNames[day.getMonth()] ?? format(day, 'MMMM');

  const weekdayShort = t(`calendar.weekdayShort.${day.getDay() === 0 ? 7 : day.getDay()}`);
  const dayHeader = `${weekdayShort} ${format(day, 'd')}`;

  const daySchedules = useMemo(
    () =>
      schedules
        .filter(s => scheduleAppliesToDate(s, dateStr))
        .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time)),
    [schedules, dateStr],
  );

  const dayAlerts = useMemo(
    () => depletionAlerts.filter(a => a.date === dateStr),
    [depletionAlerts, dateStr],
  );

  const timelineHeight = HOURS * HOUR_HEIGHT;
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      return () => setActiveSlotHour(null);
    }, []),
  );

  useEffect(() => {
    const d = parseISO(dateStr);
    if (!isToday(d)) return;
    const y = Math.max(0, d.getHours() * HOUR_HEIGHT - HOUR_HEIGHT);
    const t = setTimeout(() => scrollRef.current?.scrollTo({ y, animated: false }), 50);
    return () => clearTimeout(t);
  }, [dateStr]);

  const positionedEvents = useMemo(() => {
    const byTime = new Map<string, ScheduleItem[]>();
    for (const sch of daySchedules) {
      const list = byTime.get(sch.time) ?? [];
      list.push(sch);
      byTime.set(sch.time, list);
    }

    const result: {
      sch: ScheduleItem;
      top: number;
      height: number;
      accent: string;
      label: string;
      columnIndex: number;
      columnCount: number;
    }[] = [];

    byTime.forEach(group => {
      const startMin = timeToMinutes(group[0].time);
      const top = (startMin / 60) * HOUR_HEIGHT;
      const height = Math.max((EVENT_DURATION_MIN / 60) * HOUR_HEIGHT, 40);
      const columnCount = group.length;
      group.forEach((sch, columnIndex) => {
        const tid = getScheduleTreatmentId(sch);
        const treatmentType = treatments.find(tr => tr.id === tid)?.type;
        const accent =
          treatmentType && TREATMENT_VISUAL[treatmentType]
            ? TREATMENT_VISUAL[treatmentType].accent
            : Theme.colors.primaryLimeDark;
        result.push({
          sch,
          top,
          height,
          accent,
          label: labelForSchedule(sch),
          columnIndex,
          columnCount,
        });
      });
    });

    return result;
  }, [daySchedules, treatments, labelForSchedule]);

  return (
    <View style={styles.root}>
      <View style={styles.toolbar}>
        <Pressable
          onPress={onBack}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <MaterialIcons name="arrow-back" size={28} color={Theme.colors.textDark} />
        </Pressable>
        <View style={styles.monthTitleWrap}>
          <Text style={styles.monthTitle}>{monthTitle}</Text>
        </View>
        <View style={styles.toolbarSpacer} />
      </View>

      <View style={styles.dayHeaderRow}>
        <View style={styles.dayHeaderGutter}>
          <Text style={styles.dayHeaderText}>{dayHeader}</Text>
        </View>
        <View style={styles.dayHeaderLine} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator
      >
        {dayAlerts.length > 0 && (
          <View style={styles.allDayRow}>
            <View style={styles.timeGutter}>
              <Text style={styles.allDayLabel}>{t('calendar.allDay')}</Text>
            </View>
            <View style={styles.allDayEvents}>
              {dayAlerts.map((alert, i) => (
                <View key={`alert-${i}`} style={[styles.allDayChip, styles.allDayChipAlert]}>
                  <Text style={styles.allDayChipText} numberOfLines={1} ellipsizeMode="tail">
                    {typeof alert.pillsLeft === 'number'
                      ? `${alert.inventoryItemName} · ${alert.pillsLeft}`
                      : t('caretaker.calendar.alertDepletionWithName', {
                          name: alert.inventoryItemName,
                        })}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={[styles.timeline, { height: timelineHeight }]}>
          {Array.from({ length: HOURS }, (_, hour) => (
            <Pressable
              key={hour}
              disabled={!onSlotPress}
              onPress={() => onSlotPress?.(hour)}
              onPressIn={() => setActiveSlotHour(hour)}
              onPressOut={() => setActiveSlotHour(prev => (prev === hour ? null : prev))}
              onHoverIn={() => setActiveSlotHour(hour)}
              onHoverOut={() => setActiveSlotHour(prev => (prev === hour ? null : prev))}
              style={({ pressed, hovered }) => [
                styles.hourRow,
                { top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT },
                (hovered || pressed) && onSlotPress ? styles.hourRowActive : null,
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('schedule.add.slotA11y', { time: hourLabel(hour) })}
            >
              <Text style={styles.hourLabel}>{hourLabel(hour)}</Text>
              <View style={styles.hourLine} />
              {onSlotPress && activeSlotHour === hour ? (
                <View style={styles.slotAddBtn}>
                  <MaterialIcons name="add" size={18} color={Theme.colors.primaryLimeDark} />
                </View>
              ) : null}
            </Pressable>
          ))}

          <View style={[styles.eventsLayer, { height: timelineHeight }]} pointerEvents="box-none">
            {positionedEvents.map(({ sch, top, height, accent, label, columnIndex, columnCount }) => {
              const gap = 2;
              const widthPct = 100 / columnCount;
              const leftPct = columnIndex * widthPct;
              return (
              <Pressable
                key={sch.id}
                style={[
                  styles.timedEvent,
                  {
                    top,
                    height,
                    backgroundColor: accent,
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                    paddingRight: columnIndex < columnCount - 1 ? gap : 4,
                    paddingLeft: columnIndex > 0 ? gap : 4,
                  },
                ]}
                onPress={() => onEventPress?.(sch)}
                disabled={!onEventPress}
              >
                <Text style={styles.timedEventText} numberOfLines={1} ellipsizeMode="tail">
                  {label}
                </Text>
                <Text style={styles.timedEventTime} numberOfLines={1}>
                  {sch.time}
                </Text>
              </Pressable>
            );
            })}
          </View>
        </View>
      </ScrollView>
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
    paddingHorizontal: Theme.spacing.xs,
    paddingVertical: Theme.spacing.s,
    backgroundColor: Theme.colors.calendarCanvas,
  },
  backBtn: {
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: 22,
    fontWeight: '500',
    color: Theme.colors.textDark,
  },
  toolbarSpacer: {
    width: 48,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: Theme.spacing.s,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Theme.colors.border,
    backgroundColor: Theme.colors.calendarCanvas,
  },
  dayHeaderGutter: {
    width: TIME_GUTTER,
    paddingLeft: Theme.spacing.s,
  },
  dayHeaderText: {
    fontSize: Theme.typography.caption,
    fontWeight: '700',
    color: Theme.colors.textDark,
  },
  dayHeaderLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Theme.colors.border,
    marginRight: Theme.spacing.m,
  },
  scroll: {
    flex: 1,
  },
  allDayRow: {
    flexDirection: 'row',
    minHeight: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Theme.colors.border,
    backgroundColor: Theme.colors.calendarCell,
    marginBottom: Theme.spacing.xs,
  },
  timeGutter: {
    width: TIME_GUTTER,
    justifyContent: 'center',
    paddingLeft: Theme.spacing.s,
  },
  allDayLabel: {
    fontSize: 10,
    color: Theme.colors.textLight,
    fontWeight: '600',
  },
  allDayEvents: {
    flex: 1,
    paddingVertical: 6,
    paddingRight: Theme.spacing.s,
    gap: 4,
  },
  allDayChip: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: Theme.colors.primaryLimeDark,
  },
  allDayChipAlert: {
    backgroundColor: Theme.colors.accentOrange,
  },
  allDayChipText: {
    fontSize: Theme.typography.small,
    fontWeight: '600',
    color: Theme.colors.surfaceWhite,
  },
  timeline: {
    position: 'relative',
    backgroundColor: Theme.colors.calendarCell,
    marginHorizontal: Theme.spacing.xs,
    borderRadius: 8,
    overflow: 'hidden',
    width: '100%',
    alignSelf: 'stretch',
  },
  hourRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  hourRowActive: {
    backgroundColor: 'rgba(69, 104, 130, 0.06)',
  },
  slotAddBtn: {
    position: 'absolute',
    right: Theme.spacing.s,
    top: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Theme.colors.surfaceWhite,
    borderWidth: 1,
    borderColor: Theme.colors.primaryLimeDark,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  hourLabel: {
    width: TIME_GUTTER,
    paddingLeft: Theme.spacing.s,
    paddingTop: 2,
    fontSize: 10,
    color: Theme.colors.textLight,
    fontWeight: '500',
  },
  hourLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Theme.colors.border,
    marginTop: 8,
  },
  eventsLayer: {
    position: 'absolute',
    left: TIME_GUTTER,
    right: Theme.spacing.s,
    top: 0,
  },
  timedEvent: {
    position: 'absolute',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  timedEventText: {
    fontSize: Theme.typography.small,
    fontWeight: '700',
    color: Theme.colors.surfaceWhite,
  },
  timedEventTime: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 1,
  },
});
