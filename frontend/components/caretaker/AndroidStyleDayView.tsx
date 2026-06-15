import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions,
  type ViewStyle,
  type LayoutChangeEvent,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { format, isToday } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from 'expo-router';
import { Theme } from '../../constants/theme';
import { TREATMENT_VISUAL, type TreatmentType } from '../../constants/treatmentVisuals';
import type { ScheduleItem } from '../../context/MedsContext';
import { getScheduleTreatmentId } from '../../context/MedsContext';
import { scheduleAppliesToDate, timeToMinutes } from '../../utils/scheduleHelpers';
import {
  isCalendarHourSlotInPast,
  isScheduleItemInPast,
  isCalendarDayInPast,
} from '../../utils/scheduleDateHelpers';
import { parseYmdLocal } from '../../utils/ymdDate';
import type { CalendarDepletionAlert } from './AndroidStyleMonthCalendar';
import { useCaretakerTourLock } from '../../context/CaretakerTourLockContext';

const HOUR_HEIGHT = 64;
const HOURS = 24;
const TIME_GUTTER = 56;
const EVENT_COL_PAD = 4;
const EVENT_COL_RIGHT = 12;
const EVENT_GAP = 4;
const EVENT_DURATION_MIN = 60;
const MIN_EVENT_HEIGHT = 52;

type Props = {
  dateStr: string;
  onBack: () => void;
  schedules: ScheduleItem[];
  treatments: { id: string; name: string; type?: TreatmentType }[];
  depletionAlerts: CalendarDepletionAlert[];
  labelForSchedule: (sch: ScheduleItem) => string;
  onEventPress?: (sch: ScheduleItem) => void;
  onSlotPress?: (hour: number) => void;
  scrollRef?: React.RefObject<ScrollView | null>;
  timelineContentRef?: React.RefObject<View | null>;
  tourTargetScheduleId?: string | null;
  tourFallbackHour?: number;
  wrapTourTarget?: (node: React.ReactElement, wrapStyle: ViewStyle) => React.ReactElement;
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
  scrollRef: scrollRefProp,
  timelineContentRef: timelineContentRefProp,
  tourTargetScheduleId,
  tourFallbackHour = 9,
  wrapTourTarget,
}: Props) {
  const { t } = useTranslation();
  const tourLock = useCaretakerTourLock();
  const { width: windowWidth } = useWindowDimensions();
  const scrollBottomPadding = Theme.spacing.xl;
  const [activeSlotHour, setActiveSlotHour] = useState<number | null>(null);
  const [timelineWidth, setTimelineWidth] = useState(0);

  const day = parseYmdLocal(dateStr);
  const monthNames = t('calendar.monthNames', { returnObjects: true }) as string[];
  const monthTitle = monthNames[day.getMonth()] ?? format(day, 'MMMM');
  const weekdayShort = t(`calendar.weekdayShort.${day.getDay() === 0 ? 7 : day.getDay()}`);
  const dayHeader = `${weekdayShort} ${format(day, 'd')}`;
  const dayIsToday = isToday(day);
  const dayIsPast = isCalendarDayInPast(dateStr);

  const daySchedules = useMemo(
    () =>
      schedules
        .filter(s => scheduleAppliesToDate(s, dateStr))
        .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time)),
    [schedules, dateStr],
  );

  const resolveTreatment = useCallback(
    (sch: ScheduleItem) => {
      const tid = getScheduleTreatmentId(sch);
      return (
        treatments.find(tr => tr.id === tid) ??
        (sch.customName ? treatments.find(tr => tr.name === sch.customName) : undefined)
      );
    },
    [treatments],
  );

  const dayAlerts = useMemo(
    () => depletionAlerts.filter(a => a.date === dateStr),
    [depletionAlerts, dateStr],
  );

  const timelineHeight = HOURS * HOUR_HEIGHT;
  const internalScrollRef = useRef<ScrollView>(null);
  const internalContentRef = useRef<View>(null);
  const scrollRef = scrollRefProp ?? internalScrollRef;
  const timelineContentRef = timelineContentRefProp ?? internalContentRef;

  const nowLineTop = useMemo(() => {
    if (!dayIsToday) return null;
    const now = new Date();
    return ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR_HEIGHT;
  }, [dayIsToday, dateStr]);

  const onTimelineLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setTimelineWidth(w);
  }, []);

  useFocusEffect(
    useCallback(() => {
      return () => setActiveSlotHour(null);
    }, []),
  );

  useEffect(() => {
    let y = 0;
    if (dayIsToday) {
      const now = new Date();
      y = Math.max(0, now.getHours() * HOUR_HEIGHT - HOUR_HEIGHT * 2);
    } else if (daySchedules.length > 0) {
      const firstMin = timeToMinutes(daySchedules[0].time);
      y = Math.max(0, (firstMin / 60) * HOUR_HEIGHT - HOUR_HEIGHT);
    }
    const timer = setTimeout(() => scrollRef.current?.scrollTo({ y, animated: false }), 80);
    return () => clearTimeout(timer);
  }, [dateStr, scrollRef, dayIsToday, daySchedules]);

  const effectiveTimelineWidth = timelineWidth > 0 ? timelineWidth : windowWidth - Theme.spacing.m;

  const positionedEvents = useMemo(() => {
    const byTime = new Map<string, ScheduleItem[]>();
    for (const sch of daySchedules) {
      const list = byTime.get(sch.time) ?? [];
      list.push(sch);
      byTime.set(sch.time, list);
    }

    const colLeft = TIME_GUTTER + EVENT_COL_PAD;
    const colWidth = Math.max(0, effectiveTimelineWidth - colLeft - EVENT_COL_RIGHT);

    const result: {
      sch: ScheduleItem;
      top: number;
      height: number;
      left: number;
      width: number;
      accent: string;
      label: string;
    }[] = [];

    byTime.forEach(group => {
      const startMin = timeToMinutes(group[0].time);
      const top = (startMin / 60) * HOUR_HEIGHT;
      const height = Math.max((EVENT_DURATION_MIN / 60) * HOUR_HEIGHT, MIN_EVENT_HEIGHT);
      const columnCount = group.length;
      const slotWidth =
        columnCount > 0 ? (colWidth - (columnCount - 1) * EVENT_GAP) / columnCount : colWidth;

      group.forEach((sch, columnIndex) => {
        const treatment = resolveTreatment(sch);
        const treatmentType = treatment?.type;
        const accent =
          treatmentType && TREATMENT_VISUAL[treatmentType]
            ? TREATMENT_VISUAL[treatmentType].accent
            : Theme.colors.primaryLimeDark;
        result.push({
          sch,
          top,
          height,
          left: colLeft + columnIndex * (slotWidth + EVENT_GAP),
          width: Math.max(slotWidth, 48),
          accent,
          label: labelForSchedule(sch),
        });
      });
    });

    return result;
  }, [daySchedules, labelForSchedule, resolveTreatment, effectiveTimelineWidth]);

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
        contentContainerStyle={{ paddingBottom: scrollBottomPadding }}
        showsVerticalScrollIndicator
        scrollEnabled={!tourLock?.locked}
        bounces={!tourLock?.locked}
      >
        <View ref={timelineContentRef} collapsable={false}>
          {dayAlerts.length > 0 ? (
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
          ) : null}

          <View
            style={[styles.timeline, { height: timelineHeight }]}
            onLayout={onTimelineLayout}
          >
            {/* Siatka godzin — tylko wizualna */}
            {Array.from({ length: HOURS }, (_, hour) => (
              <View
                key={`grid-${hour}`}
                pointerEvents="none"
                style={[styles.hourGridRow, { top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }]}
              >
                <Text style={styles.hourLabel}>{hourLabel(hour)}</Text>
                <View style={styles.hourLine} />
              </View>
            ))}

            {/* Strefy dotyku — dodawanie w pustym slocie */}
            {onSlotPress
              ? Array.from({ length: HOURS }, (_, hour) => {
                  const hourRowStyle: ViewStyle = {
                    top: hour * HOUR_HEIGHT,
                    height: HOUR_HEIGHT,
                  };
                  const slotPast = !dayIsPast && isCalendarHourSlotInPast(dateStr, hour);
                  const isTourSlot =
                    !tourTargetScheduleId && wrapTourTarget && hour === tourFallbackHour;

                  const slotNode = (
                    <Pressable
                      disabled={dayIsPast || slotPast}
                      onPress={() => {
                        if (dayIsPast || slotPast) return;
                        onSlotPress(hour);
                      }}
                      onPressIn={() => {
                        if (!dayIsPast && !slotPast) setActiveSlotHour(hour);
                      }}
                      onPressOut={() => setActiveSlotHour(prev => (prev === hour ? null : prev))}
                      style={({ pressed }) => [
                        styles.hourSlot,
                        hourRowStyle,
                        !dayIsPast && !slotPast && pressed ? styles.hourSlotActive : null,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={t('schedule.add.slotA11y', { time: hourLabel(hour) })}
                    >
                      {!dayIsPast && !slotPast && activeSlotHour === hour ? (
                        <View style={styles.slotAddBtn}>
                          <MaterialIcons name="add" size={18} color={Theme.colors.primaryLimeDark} />
                        </View>
                      ) : null}
                    </Pressable>
                  );

                  if (isTourSlot) {
                    return (
                      <React.Fragment key={`tour-hour-${hour}`}>
                        {wrapTourTarget(slotNode, {
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          ...hourRowStyle,
                        })}
                      </React.Fragment>
                    );
                  }

                  return <React.Fragment key={`slot-${hour}`}>{slotNode}</React.Fragment>;
                })
              : null}

            {/* Wskaźnik „teraz” */}
            {nowLineTop != null ? (
              <View
                pointerEvents="none"
                style={[styles.nowLine, { top: nowLineTop }]}
              >
                <View style={styles.nowDot} />
                <View style={styles.nowBar} />
              </View>
            ) : null}

            {/* Wydarzenia na osi czasu */}
            <View
              style={[styles.eventsLayer, { height: timelineHeight }]}
              pointerEvents="box-none"
            >
              {positionedEvents.map(({ sch, top, height, left, width, accent, label }) => {
                const eventPast = isScheduleItemInPast(dateStr, sch.time);
                const eventLayout: ViewStyle = {
                  top,
                  height,
                  left,
                  width,
                  backgroundColor: accent,
                };

                const eventNode = (
                  <Pressable
                    style={[
                      styles.timedEvent,
                      eventLayout,
                      eventPast && styles.timedEventPast,
                    ]}
                    onPress={() => {
                      if (eventPast) return;
                      onEventPress?.(sch);
                    }}
                    disabled={!onEventPress}
                  >
                    <Text style={styles.timedEventText} numberOfLines={2} ellipsizeMode="tail">
                      {label}
                    </Text>
                    <Text style={styles.timedEventTime} numberOfLines={1}>
                      {sch.time}
                    </Text>
                  </Pressable>
                );

                if (wrapTourTarget && tourTargetScheduleId === sch.id) {
                  return (
                    <React.Fragment key={sch.id}>
                      {wrapTourTarget(eventNode, {
                        position: 'absolute',
                        top,
                        height,
                        left,
                        width,
                      })}
                    </React.Fragment>
                  );
                }

                return <React.Fragment key={sch.id}>{eventNode}</React.Fragment>;
              })}
            </View>
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
    backgroundColor: Theme.colors.surfaceWhite,
    marginHorizontal: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.small,
    overflow: 'hidden',
  },
  hourGridRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  hourLabel: {
    width: TIME_GUTTER,
    paddingLeft: Theme.spacing.s,
    marginTop: -7,
    fontSize: 11,
    color: Theme.colors.textLight,
    fontWeight: '600',
  },
  hourLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Theme.colors.border,
    marginRight: Theme.spacing.s,
  },
  hourSlot: {
    position: 'absolute',
    left: TIME_GUTTER,
    right: 0,
    zIndex: 1,
  },
  hourSlotActive: {
    backgroundColor: 'rgba(69, 104, 130, 0.08)',
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
  },
  nowLine: {
    position: 'absolute',
    left: TIME_GUTTER - 5,
    right: Theme.spacing.s,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 3,
  },
  nowDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Theme.colors.accentOrange,
    marginRight: 2,
  },
  nowBar: {
    flex: 1,
    height: 2,
    backgroundColor: Theme.colors.accentOrange,
  },
  eventsLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 2,
    elevation: 2,
  },
  timedEvent: {
    position: 'absolute',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    justifyContent: 'flex-start',
    overflow: 'hidden',
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(255,255,255,0.5)',
    elevation: 3,
    shadowColor: Theme.colors.shadowNeutral,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  timedEventPast: {
    opacity: 0.55,
  },
  timedEventText: {
    fontSize: Theme.typography.small,
    fontWeight: '700',
    color: Theme.colors.surfaceWhite,
    lineHeight: 16,
  },
  timedEventTime: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
    fontWeight: '600',
  },
});
