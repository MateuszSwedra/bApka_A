import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/theme';
import { addDays, format } from 'date-fns';
import { pl, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { useMeds, getScheduleTreatmentId } from '../../context/MedsContext';
import type { ScheduleItem, Treatment } from '../../context/MedsContext';
import { scheduleAppliesToDate } from '../../utils/scheduleHelpers';
import { TREATMENT_VISUAL } from '../../constants/treatmentVisuals';
import { useDependentDisplay } from '../../context/DependentDisplayContext';
import type { AppLanguage } from '../../i18n/resolveLanguage';

const DAYS_AHEAD = 60;

function labelForSchedule(sch: ScheduleItem, treatments: Treatment[], fallback: string) {
  if (sch.customName) return sch.customName;
  const tid = getScheduleTreatmentId(sch);
  if (tid) return treatments.find(t => t.id === tid)?.name ?? fallback;
  return fallback;
}

export default function DependentCalendarScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useDependentDisplay();
  const dateLocale = (i18n.language as AppLanguage) === 'en' ? enUS : pl;

  const doseLabel = (sch: ScheduleItem) => {
    if (!sch.dosage || sch.dosage === '1') return t('dependent.calendar.doseOne');
    return t('dependent.calendar.dosePieces', { count: sch.dosage });
  };
  const { depletionAlerts, schedules, treatments } = useMeds();
  const [expandedDate, setExpandedDate] = useState<string | null>(format(new Date(), 'yyyy-MM-dd'));

  const dayList = useMemo(() => {
    const start = new Date();
    return Array.from({ length: DAYS_AHEAD }, (_, i) => {
      const d = addDays(start, i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const daySchedules = schedules
        .filter(s => scheduleAppliesToDate(s, dateStr))
        .sort((a, b) => a.time.localeCompare(b.time));
      const alerts = depletionAlerts.filter(a => a.date === dateStr);
      return { dateStr, date: d, daySchedules, alerts };
    });
  }, [schedules, depletionAlerts]);

  const toggleDay = (dateStr: string) => {
    setExpandedDate(prev => (prev === dateStr ? null : dateStr));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surfaceWhite, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={32} color={colors.textDark} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textDark }]}>
          {t('dependent.calendar.screenTitle')}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {dayList.map(({ dateStr, date, daySchedules, alerts }) => {
          const expanded = expandedDate === dateStr;
          const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');
          const dayLabel = format(date, 'EEEE, d MMMM', { locale: dateLocale });
          const count = daySchedules.length;

          return (
            <View key={dateStr} style={styles.dayBlock}>
              <Pressable
                onPress={() => toggleDay(dateStr)}
                style={({ pressed }) => [
                  styles.dayHeader,
                  {
                    backgroundColor: isToday ? colors.primaryLime : colors.surfaceWhite,
                    borderColor: isToday ? colors.primaryLimeDark : colors.border,
                  },
                  pressed && { opacity: 0.9 },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.dayTitle, { color: colors.textDark }]}>
                    {isToday
                      ? t('dependent.calendar.todayPrefix', { day: dayLabel })
                      : dayLabel}
                  </Text>
                  <Text style={[styles.dayMeta, { color: colors.textLight }]}>
                    {count === 0
                      ? t('dependent.calendar.noMeds')
                      : t('dependent.calendar.items', { count })}
                  </Text>
                </View>
                <MaterialIcons
                  name={expanded ? 'expand-less' : 'expand-more'}
                  size={32}
                  color={colors.textDark}
                />
              </Pressable>

              {expanded && (
                <View style={[styles.dayBody, { backgroundColor: colors.surfaceGrey, borderColor: colors.border }]}>
                  {alerts.map((alert, idx) => (
                    <View
                      key={`alert-${idx}`}
                      style={[styles.alertRow, { borderColor: colors.accentOrange }]}
                    >
                      <MaterialIcons name="warning" size={24} color="#D32F2F" />
                      <Text style={styles.alertText}>
                        {t('dependent.calendar.alertDepletion', { name: alert.inventoryItemName })}
                      </Text>
                    </View>
                  ))}

                  {daySchedules.length === 0 && alerts.length === 0 ? (
                    <Text style={[styles.emptyDay, { color: colors.textLight }]}>
                      {t('dependent.calendar.emptyDay')}
                    </Text>
                  ) : (
                    daySchedules.map(sch => {
                      const name = labelForSchedule(
                        sch,
                        treatments,
                        t('dependent.calendar.activityFallback'),
                      );
                      const tid = getScheduleTreatmentId(sch);
                      const tType = tid ? treatments.find(t => t.id === tid)?.type : undefined;
                      const icon =
                        tType && TREATMENT_VISUAL[tType]
                          ? TREATMENT_VISUAL[tType].icon
                          : ('medication' as const);

                      return (
                        <View
                          key={sch.id}
                          style={[styles.planRow, { backgroundColor: colors.surfaceWhite, borderColor: colors.border }]}
                        >
                          <View style={[styles.timeBadge, { backgroundColor: colors.primaryLime }]}>
                            <Text style={[styles.timeText, { color: colors.textDark }]}>{sch.time}</Text>
                          </View>
                          <MaterialIcons name={icon} size={28} color={colors.primaryLimeDark} />
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.medName, { color: colors.textDark }]}>{name}</Text>
                            <Text style={[styles.medDose, { color: colors.textLight }]}>{doseLabel(sch)}</Text>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.l,
    paddingTop: Theme.spacing.xxl,
    paddingBottom: Theme.spacing.m,
    borderBottomWidth: 2,
  },
  backBtn: {
    padding: Theme.spacing.xs,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: Theme.spacing.m,
    paddingBottom: 100,
    gap: Theme.spacing.s,
  },
  dayBlock: {
    marginBottom: Theme.spacing.s,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.m,
    borderRadius: Theme.borderRadius.large,
    borderWidth: 2,
  },
  dayTitle: {
    fontSize: 20,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  dayMeta: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 2,
  },
  dayBody: {
    marginTop: Theme.spacing.xs,
    padding: Theme.spacing.m,
    borderRadius: Theme.borderRadius.large,
    borderWidth: 1,
    gap: Theme.spacing.s,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.m,
    borderRadius: Theme.borderRadius.medium,
    borderWidth: 1,
    gap: Theme.spacing.s,
  },
  timeBadge: {
    paddingHorizontal: Theme.spacing.s,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.small,
    minWidth: 68,
    alignItems: 'center',
  },
  timeText: {
    fontSize: 18,
    fontWeight: '800',
  },
  medName: {
    fontSize: 20,
    fontWeight: '800',
  },
  medDose: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 2,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.s,
    padding: Theme.spacing.m,
    borderRadius: Theme.borderRadius.medium,
    borderWidth: 2,
    backgroundColor: 'rgba(211, 47, 47, 0.08)',
  },
  alertText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#D32F2F',
  },
  emptyDay: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: Theme.spacing.m,
  },
});
