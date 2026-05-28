import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Theme } from '../../../../constants/theme';
import { CaretakerFlowStyles as Flow } from '../../../../constants/caretakerFlowStyles';
import { TREATMENT_VISUAL } from '../../../../constants/treatmentVisuals';
import { useLocalSearchParams, useFocusEffect, useGlobalSearchParams, useSegments } from 'expo-router';
import { pickDependentUserId } from '../../../../utils/resolveMedsTargetUserId';
import { openAddMedForDependent } from '../../../../utils/caretakerNavigation';
import { format } from 'date-fns';
import { getScheduleTreatmentId, useMeds } from '../../../../context/MedsContext';
import type { ScheduleItem } from '../../../../context/MedsContext';
import { scheduleAppliesToDate, timeToMinutes } from '../../../../utils/scheduleHelpers';
import { usersAPI, scheduleAPI } from '../../../../services/api';
import { useTranslation } from 'react-i18next';
import { DependentProfileHeader } from '../../../../components/caretaker/DependentProfileHeader';
import { useFabBottomOffset } from '../../../../utils/useFabBottomOffset';

interface DependentInfo {
  id: string;
  email?: string;
  name?: string | null;
}

export default function DependentTodayDashboard() {
  const { t } = useTranslation();
  const fabBottomOffset = useFabBottomOffset({ aboveTabBar: true });
  const localParams = useLocalSearchParams<{ id?: string }>();
  const globalParams = useGlobalSearchParams<{ id?: string }>();
  const segments = useSegments();

  const { schedules, treatments, depletionAlerts, targetUserId } = useMeds();

  const dependentId = useMemo(
    () =>
      pickDependentUserId({
        localId: localParams.id,
        globalId: globalParams.id,
        segments: segments as string[],
        contextUserId: targetUserId,
      }),
    [localParams.id, globalParams.id, segments, targetUserId],
  );
  const [dependent, setDependent] = useState<DependentInfo | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const [logs, setLogs] = useState<any[]>([]);

  const fetchDependent = useCallback(async () => {
    if (!dependentId) return;
    try {
      const all = (await usersAPI.getDependents()) as DependentInfo[];
      const found = all?.find?.(d => String(d.id) === String(dependentId));
      if (found) setDependent(found);
      const todayLogs = await scheduleAPI.getTodayLogs(dependentId);
      setLogs(todayLogs);
    } catch (e) {
      console.warn('Nie udało się pobrać danych podopiecznego', e);
    }
  }, [dependentId]);

  useFocusEffect(
    useCallback(() => {
      void fetchDependent();
    }, [fetchDependent]),
  );

  const todayStr = format(now, 'yyyy-MM-dd');

  const todaysSchedules = useMemo(() => {
    return [...schedules]
      .filter(s => scheduleAppliesToDate(s, todayStr))
      .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
  }, [schedules, todayStr]);

  const todaysDepletion = useMemo(
    () => depletionAlerts.filter(a => a.date === todayStr),
    [depletionAlerts, todayStr],
  );

  const labelFor = (sch: ScheduleItem) => {
    if (sch.customName) return sch.customName;
    const tid = getScheduleTreatmentId(sch);
    if (tid) return treatments.find(tr => tr.id === tid)?.name ?? t('schedule.activityFallback');
    return t('schedule.activityFallback');
  };

  const typeFor = (sch: ScheduleItem) => {
    const tid = getScheduleTreatmentId(sch);
    return treatments.find(tr => tr.id === tid)?.type;
  };

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const nextSchedule = useMemo(
    () => todaysSchedules.find(s => timeToMinutes(s.time) >= currentMinutes),
    [todaysSchedules, currentMinutes],
  );

  const greeting = dependent?.name?.trim() || dependent?.email || t('caretaker.dependentFallbackName');

  const renderMood = () => {
    // @ts-expect-error — lastMood z API
    if (!dependent?.lastMood || !dependent?.lastMoodAt) return null;
    // @ts-expect-error
    const moodEmoji = dependent.lastMood === 'happy' ? '🙂' : dependent.lastMood === 'neutral' ? '😐' : '🙁';
    // @ts-expect-error
    const date = new Date(dependent.lastMoodAt);
    const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    return (
      <View style={styles.moodChip}>
        <Text style={styles.moodEmoji}>{moodEmoji}</Text>
        <Text style={styles.moodTime}>{t('caretaker.moodAt', { time: timeStr })}</Text>
      </View>
    );
  };

  const handleAdd = () => {
    if (!dependentId) return;
    openAddMedForDependent(dependentId);
  };

  const getStatusDisplay = (sch: ScheduleItem, minutes: number, isNext: boolean) => {
    const log = logs.find(l => l.scheduleId === sch.id);
    if (log) {
      if (log.status === 'TAKEN')
        return { label: t('schedule.status.taken'), pill: styles.statusPillSuccess, textColor: Theme.colors.success };
      if (log.status === 'LATE')
        return { label: t('schedule.status.late'), pill: styles.statusPillLate, textColor: Theme.colors.accentOrange };
      if (log.status === 'MISSED')
        return { label: t('schedule.status.skipped'), pill: styles.statusPillMissed, textColor: Theme.colors.accentOrange };
    }
    const diff = minutes - currentMinutes;
    if (Math.abs(diff) <= 5)
      return { label: t('schedule.status.now'), pill: styles.statusPillNext, textColor: Theme.colors.surfaceWhite };
    if (diff < -5)
      return { label: t('schedule.status.past'), pill: styles.statusPillPast, textColor: Theme.colors.textLight };
    if (isNext)
      return { label: t('schedule.status.next'), pill: styles.statusPillUpcoming, textColor: Theme.colors.textDark };
    return { label: t('schedule.status.planned'), pill: styles.statusPillUpcoming, textColor: Theme.colors.textDark };
  };

  return (
    <View style={Flow.screen}>
      <DependentProfileHeader />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: fabBottomOffset + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.greeting}>{greeting}</Text>
        {renderMood()}

        <Text style={Flow.sectionLabel}>{t('caretaker.today.nextActivitySection')}</Text>
        {nextSchedule ? (
          <View style={[Flow.cardRow, Flow.cardRowHighlight]}>
            <View style={[Flow.iconCircle, { backgroundColor: Theme.colors.primaryLime }]}>
              <MaterialIcons name="schedule" size={26} color={Theme.colors.primaryLimeDark} />
            </View>
            <View style={Flow.rowText}>
              <Text style={styles.heroTime}>{nextSchedule.time}</Text>
              <Text style={Flow.rowSubtitle} numberOfLines={2}>
                {labelFor(nextSchedule)}
              </Text>
            </View>
          </View>
        ) : (
          <View style={Flow.cardRow}>
            <View style={[Flow.iconCircle, { backgroundColor: Theme.colors.badgeSuccessBackground }]}>
              <MaterialIcons name="check-circle" size={26} color={Theme.colors.success} />
            </View>
            <View style={Flow.rowText}>
              <Text style={Flow.rowTitle}>{t('caretaker.today.allDone')}</Text>
              <Text style={Flow.rowSubtitle}>{t('caretaker.today.allDoneHint')}</Text>
            </View>
          </View>
        )}

        <Text style={Flow.sectionLabel}>{t('caretaker.device.synced')}</Text>
        <View style={Flow.cardRow}>
          <View style={[Flow.iconCircle, { backgroundColor: Theme.colors.badgeSuccessBackground }]}>
            <MaterialIcons name="phonelink" size={24} color={Theme.colors.success} />
          </View>
          <View style={Flow.rowText}>
            <Text style={Flow.rowTitle}>{t('caretaker.device.statusOk')}</Text>
            <Text style={Flow.rowSubtitle}>{t('caretaker.device.synced')}</Text>
          </View>
          <MaterialIcons name="check-circle" size={28} color={Theme.colors.success} />
        </View>

        {todaysDepletion.length > 0 && (
          <>
            <Text style={Flow.sectionLabel}>{t('caretaker.alerts.title')}</Text>
            <View style={Flow.list}>
              {todaysDepletion.map((alert, idx) => (
                <View key={`alert-${idx}`} style={[Flow.cardRow, Flow.cardRowAlert]}>
                  <View style={[Flow.iconCircle, { backgroundColor: Theme.colors.badgeWarningBackground }]}>
                    <MaterialIcons name="inventory-2" size={24} color={Theme.colors.accentOrange} />
                  </View>
                  <Text style={[Flow.rowTitle, styles.alertRowTitle]} numberOfLines={2}>
                    {t('caretaker.calendar.alertDepletionWithName', { name: alert.inventoryItemName })}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={Flow.sectionLabel}>{t('caretaker.today.plan')}</Text>
        {todaysSchedules.length === 0 ? (
          <View style={Flow.cardRow}>
            <View style={[Flow.iconCircle, { backgroundColor: Theme.colors.surfaceGrey }]}>
              <MaterialIcons name="event-busy" size={24} color={Theme.colors.textLight} />
            </View>
            <Text style={Flow.rowSubtitle}>{t('caretaker.today.empty')}</Text>
          </View>
        ) : (
          <View style={Flow.list}>
            {todaysSchedules.map(sch => {
              const label = labelFor(sch);
              const tType = typeFor(sch);
              const vis = tType ? TREATMENT_VISUAL[tType] : null;
              const minutes = timeToMinutes(sch.time);
              const isNext = nextSchedule?.id === sch.id;
              const display = getStatusDisplay(sch, minutes, isNext);

              return (
                <View
                  key={sch.id}
                  style={[Flow.cardRow, isNext && Flow.cardRowHighlight]}
                >
                  {vis ? (
                    <View style={[Flow.iconCircle, { backgroundColor: vis.accent + '22' }]}>
                      <MaterialIcons name={vis.icon} size={24} color={vis.accent} />
                    </View>
                  ) : (
                    <View style={[Flow.iconCircle, { backgroundColor: Theme.colors.primaryLime }]}>
                      <MaterialIcons name="medication" size={24} color={Theme.colors.primaryLimeDark} />
                    </View>
                  )}
                  <View style={Flow.rowText}>
                    <Text style={Flow.rowTitle}>{label}</Text>
                    <Text style={Flow.rowSubtitle}>{sch.time}</Text>
                  </View>
                  <View style={[Flow.statusPill, display.pill]}>
                    <Text style={[Flow.statusPillText, { color: display.textColor }]}>{display.label}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Pressable
        style={({ pressed }) => [styles.fab, { bottom: fabBottomOffset }, pressed && styles.fabPressed]}
        onPress={handleAdd}
        accessibilityLabel={t('schedule.add.pickActivityTitle')}
      >
        <MaterialIcons name="add" size={32} color={Theme.colors.textDark} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Theme.spacing.l,
    paddingTop: Theme.spacing.m,
  },
  greeting: {
    fontSize: Theme.typography.title,
    fontWeight: '800',
    color: Theme.colors.textDark,
    marginBottom: Theme.spacing.s,
  },
  moodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: Theme.spacing.m,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.round,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.calendarCell,
  },
  moodEmoji: {
    fontSize: 22,
  },
  moodTime: {
    fontSize: Theme.typography.caption,
    color: Theme.colors.textDark,
    marginLeft: 8,
    fontWeight: '700',
  },
  heroTime: {
    fontSize: Theme.typography.largeTitle,
    fontWeight: '900',
    color: Theme.colors.textDark,
    lineHeight: 36,
  },
  alertRowTitle: {
    color: Theme.colors.accentOrange,
    flex: 1,
  },
  statusPillPast: {
    backgroundColor: Theme.colors.surfaceGrey,
  },
  statusPillUpcoming: {
    backgroundColor: Theme.colors.primaryLime,
  },
  statusPillNext: {
    backgroundColor: Theme.colors.primaryLimeDark,
  },
  statusPillSuccess: {
    backgroundColor: Theme.colors.badgeSuccessBackground,
    borderColor: Theme.colors.success,
    borderWidth: 1,
  },
  statusPillLate: {
    backgroundColor: Theme.colors.surfaceSoftOrange,
    borderColor: Theme.colors.accentOrange,
    borderWidth: 1,
  },
  statusPillMissed: {
    backgroundColor: Theme.colors.badgeWarningBackground,
    borderColor: Theme.colors.accentOrange,
    borderWidth: 1,
  },
  fab: {
    position: 'absolute',
    right: Theme.spacing.xl,
    backgroundColor: Theme.colors.primaryLime,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Theme.colors.primaryLimeDark,
    shadowColor: Theme.colors.shadowNeutral,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabPressed: {
    transform: [{ scale: 0.95 }],
  },
});
