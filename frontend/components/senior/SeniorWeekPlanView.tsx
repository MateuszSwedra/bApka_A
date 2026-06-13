import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { format, isToday } from 'date-fns';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../constants/theme';
import { SeniorFlow } from '../../constants/seniorFlowStyles';
import type { SeniorSurfaceColors } from '../../context/DependentDisplayContext';
import type { ScheduleItem, Treatment } from '../../context/MedsContext';
import { getScheduleTreatmentId } from '../../context/MedsContext';
import { scheduleAppliesToDate } from '../../utils/scheduleHelpers';
import { TREATMENT_VISUAL } from '../../constants/treatmentVisuals';
import {
  daysInSeniorWeek,
  formatSeniorWeekRange,
  isoWeekdayFromDate,
  isCurrentSeniorWeek,
} from '../../utils/seniorWeekPlan';
import { seniorActivityNameForSchedule } from '../../utils/seniorActivityLabel';
import type { CalendarDepletionAlert } from '../caretaker/AndroidStyleMonthCalendar';

type Props = {
  weekAnchor: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onThisWeek: () => void;
  schedules: ScheduleItem[];
  treatments: Treatment[];
  depletionAlerts: CalendarDepletionAlert[];
  colors: SeniorSurfaceColors;
};

export function SeniorWeekPlanView({
  weekAnchor,
  onPrevWeek,
  onNextWeek,
  onThisWeek,
  schedules,
  treatments,
  depletionAlerts,
  colors,
}: Props) {
  const { t } = useTranslation();
  const weekDays = useMemo(() => daysInSeniorWeek(weekAnchor), [weekAnchor]);
  const weekRangeLabel = useMemo(() => formatSeniorWeekRange(weekAnchor), [weekAnchor]);
  const showThisWeek = !isCurrentSeniorWeek(weekAnchor);

  return (
    <View style={styles.root}>
      <View style={[styles.navRow, { borderColor: colors.border, backgroundColor: colors.surfaceWhite }]}>
        <Pressable
          onPress={onPrevWeek}
          style={[styles.navBtn, { borderColor: colors.border }]}
          accessibilityRole="button"
          accessibilityLabel={t('dependent.calendar.prevWeek')}
        >
          <MaterialIcons name="chevron-left" size={32} color={colors.textDark} />
        </Pressable>
        <View style={styles.navCenter}>
          <Text style={[styles.weekTitle, { color: colors.textDark }]}>
            {t('dependent.calendar.weekPlanTitle')}
          </Text>
          <Text style={[styles.weekRange, { color: colors.textLight }]}>{weekRangeLabel}</Text>
          {showThisWeek ? (
            <Pressable onPress={onThisWeek} accessibilityRole="button">
              <Text style={[styles.thisWeekLink, { color: colors.primaryLimeDark }]}>
                {t('dependent.calendar.thisWeek')}
              </Text>
            </Pressable>
          ) : null}
        </View>
        <Pressable
          onPress={onNextWeek}
          style={[styles.navBtn, { borderColor: colors.border }]}
          accessibilityRole="button"
          accessibilityLabel={t('dependent.calendar.nextWeek')}
        >
          <MaterialIcons name="chevron-right" size={32} color={colors.textDark} />
        </Pressable>
      </View>

      {weekDays.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const daySchedules = schedules
          .filter(s => scheduleAppliesToDate(s, dateStr))
          .sort((a, b) => a.time.localeCompare(b.time));
        const dayAlerts = depletionAlerts.filter(a => a.date === dateStr);
        const today = isToday(day);
        const weekdayKey = String(isoWeekdayFromDate(day));

        return (
          <View
            key={dateStr}
            style={[
              styles.dayCard,
              {
                backgroundColor: today ? colors.primaryLime + '55' : colors.surfaceWhite,
                borderColor: today ? colors.primaryLimeDark : colors.border,
              },
            ]}
          >
            <View style={styles.dayHeader}>
              <Text style={[styles.dayName, { color: colors.textDark }]}>
                {t(`calendar.weekdayShort.${weekdayKey}`)}
              </Text>
              <Text style={[styles.dayDate, { color: colors.textDark }]}>{format(day, 'd.MM')}</Text>
              {today ? (
                <View style={[styles.todayBadge, { backgroundColor: colors.primaryLimeDark }]}>
                  <Text style={[styles.todayBadgeText, { color: colors.surfaceWhite }]}>
                    {t('dependent.calendar.todayBadge')}
                  </Text>
                </View>
              ) : null}
            </View>

            {dayAlerts.map((alert, idx) => (
              <View
                key={`alert-${idx}`}
                style={[styles.alertRow, { borderColor: colors.accentOrange }]}
              >
                <MaterialIcons name="shopping-cart" size={24} color={colors.accentOrange} />
                <Text style={[styles.alertText, { color: colors.accentOrange }]}>
                  {t('dependent.calendar.alertBuyPack', { name: alert.inventoryItemName })}
                </Text>
              </View>
            ))}

            {daySchedules.length === 0 && dayAlerts.length === 0 ? (
              <Text style={[styles.emptyDay, { color: colors.textLight }]}>
                {t('dependent.calendar.emptyDay')}
              </Text>
            ) : (
              daySchedules.map(sch => {
                const tid = getScheduleTreatmentId(sch);
                const treatment = tid ? treatments.find(tr => tr.id === tid) : undefined;
                const icon =
                  treatment?.type && TREATMENT_VISUAL[treatment.type]
                    ? TREATMENT_VISUAL[treatment.type].icon
                    : ('event' as const);
                const name = seniorActivityNameForSchedule(sch, treatments);
                return (
                  <View
                    key={sch.id}
                    style={[
                      SeniorFlow.rowCard,
                      styles.activityRow,
                      { backgroundColor: colors.calendarCell ?? colors.surfaceGrey, borderColor: colors.border },
                    ]}
                  >
                    <View
                      style={[
                        SeniorFlow.timeBadge,
                        { backgroundColor: colors.surfaceWhite, borderColor: colors.border },
                      ]}
                    >
                      <Text style={[SeniorFlow.activityTime, { color: colors.textDark }]}>{sch.time}</Text>
                    </View>
                    <MaterialIcons name={icon} size={26} color={colors.primaryLimeDark} />
                    <Text style={[SeniorFlow.activityName, styles.activityName, { color: colors.textDark }]}>
                      {name}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: Theme.spacing.m,
    paddingBottom: Theme.spacing.m,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Theme.borderRadius.large,
    borderWidth: 1,
    padding: Theme.spacing.s,
    marginBottom: Theme.spacing.xs,
  },
  navBtn: {
    width: 48,
    height: 48,
    borderRadius: Theme.borderRadius.medium,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.s,
  },
  weekTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  weekRange: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  thisWeekLink: {
    marginTop: 6,
    fontSize: 17,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  dayCard: {
    borderRadius: Theme.borderRadius.large,
    borderWidth: 1.5,
    padding: Theme.spacing.m,
    gap: Theme.spacing.s,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.s,
    marginBottom: Theme.spacing.xs,
  },
  dayName: {
    fontSize: 24,
    fontWeight: '800',
  },
  dayDate: {
    fontSize: 22,
    fontWeight: '700',
  },
  todayBadge: {
    marginLeft: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.round,
  },
  todayBadgeText: {
    fontSize: 14,
    fontWeight: '800',
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.s,
    borderWidth: 1.5,
    borderRadius: Theme.borderRadius.medium,
    padding: Theme.spacing.s,
  },
  alertText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
  },
  emptyDay: {
    fontSize: 18,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  activityRow: {
    marginBottom: 0,
    paddingLeft: Theme.spacing.m,
  },
  activityName: {
    flex: 1,
  },
});
