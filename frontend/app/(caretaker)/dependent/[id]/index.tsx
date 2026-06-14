import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Theme } from '../../../../constants/theme';
import { TREATMENT_VISUAL } from '../../../../constants/treatmentVisuals';
import { useLocalSearchParams, useFocusEffect, useGlobalSearchParams, useSegments } from 'expo-router';
import { pickDependentUserId } from '../../../../utils/resolveMedsTargetUserId';
import { format } from 'date-fns';
import { useOnCalendarDayChange, useTickingNow } from '../../../../hooks/useTickingNow';
import { getScheduleTreatmentId, useMeds } from '../../../../context/MedsContext';
import type { ScheduleItem } from '../../../../context/MedsContext';
import { scheduleAppliesToDate, timeToMinutes } from '../../../../utils/scheduleHelpers';
import { usersAPI, scheduleAPI } from '../../../../services/api';
import { useTranslation } from 'react-i18next';
import { DependentProfileHeader } from '../../../../components/caretaker/DependentProfileHeader';
import { DependentTodayHeroCard } from '../../../../components/caretaker/DependentTodayHeroCard';
import {
  resolveTodayScheduleUiKind,
  todayStatsBucketFromKind,
} from '../../../../utils/todayScheduleStatus';
import { findDoseLogForScheduleOnDate } from '../../../../utils/doseLogDay';

interface DependentInfo {
  id: string;
  email?: string;
  name?: string | null;
}

const AVATAR_PALETTE = [
  { solid: Theme.colors.primaryLimeDark, soft: 'rgba(69, 104, 130, 0.14)' },
  { solid: Theme.colors.accentOrange, soft: 'rgba(233, 164, 61, 0.2)' },
  { solid: '#5B8FA8', soft: 'rgba(91, 143, 168, 0.16)' },
  { solid: '#6B8E6B', soft: 'rgba(107, 142, 107, 0.16)' },
] as const;

function getInitials(nameOrEmail: string) {
  const trimmed = nameOrEmail.trim();
  if (!trimmed) return '??';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return trimmed.substring(0, 2).toUpperCase();
}

function accentIndexFromId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i)) % 997;
  return hash % AVATAR_PALETTE.length;
}

export default function DependentTodayDashboard() {
  const { t } = useTranslation();
  const localParams = useLocalSearchParams<{ id?: string }>();
  const globalParams = useGlobalSearchParams<{ id?: string }>();
  const segments = useSegments();

  const { schedules, treatments, depletionAlerts, targetUserId, refetchFromServer } = useMeds();

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
  const { now, todayStr } = useTickingNow({ tickMs: 60_000 });

  const [logs, setLogs] = useState<any[]>([]);

  const fetchDependent = useCallback(async () => {
    if (!dependentId) return;
    try {
      const all = (await usersAPI.getDependents()) as DependentInfo[];
      const found = all?.find?.(d => String(d.id) === String(dependentId));
      if (found) setDependent(found);
      const todayLogs = await scheduleAPI.getTodayLogs(dependentId, todayStr);
      setLogs(todayLogs);
    } catch (e) {
      console.warn('Nie udało się pobrać danych podopiecznego', e);
    }
  }, [dependentId, todayStr]);

  useFocusEffect(
    useCallback(() => {
      void fetchDependent();
      const pollId = setInterval(() => void fetchDependent(), 10_000);
      return () => clearInterval(pollId);
    }, [fetchDependent]),
  );

  useOnCalendarDayChange(
    todayStr,
    useCallback(() => {
      void refetchFromServer();
      void fetchDependent();
    }, [fetchDependent, refetchFromServer]),
  );

  const todayLabel = format(now, 'd.MM.yyyy');

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

  const displayName = dependent?.name?.trim() || dependent?.email || t('caretaker.dependentFallbackName');
  const accent = AVATAR_PALETTE[accentIndexFromId(dependentId ?? displayName)];

  const headerSubtitle = todayLabel;

  const todayDoseStats = useMemo(() => {
    let taken = 0;
    let late = 0;
    let missed = 0;
    let pending = 0;
    for (const sch of todaysSchedules) {
      const log = findDoseLogForScheduleOnDate(logs, sch.id, todayStr);
      const isNext = nextSchedule?.id === sch.id;
      const kind = resolveTodayScheduleUiKind(log, timeToMinutes(sch.time), currentMinutes, isNext);
      const bucket = todayStatsBucketFromKind(kind);
      if (bucket === 'taken') taken += 1;
      else if (bucket === 'late') late += 1;
      else if (bucket === 'missed') missed += 1;
      else pending += 1;
    }
    return { taken, late, missed, pending, total: todaysSchedules.length };
  }, [todaysSchedules, logs, currentMinutes, nextSchedule?.id]);

  const greetingLine = useMemo(() => {
    const hour = now.getHours();
    if (hour < 12) return t('dependent.greetingMorning');
    if (hour < 18) return t('dependent.greetingAfternoon');
    return t('dependent.greetingEvening');
  }, [now, t]);

  const countdownLabel = useMemo(() => {
    if (!nextSchedule) return null;
    const diff = timeToMinutes(nextSchedule.time) - currentMinutes;
    if (diff <= 0 || diff <= 5) return null;
    if (diff < 60) return t('caretaker.today.inMinutes', { count: diff });
    const hours = Math.round(diff / 60);
    return t('caretaker.today.inHours', { count: hours });
  }, [nextSchedule, currentMinutes, t]);

  const moodSubtitle = useMemo(() => {
    // @ts-expect-error - lastMood z API
    if (!dependent?.lastMood || !dependent?.lastMoodAt) return null;
    // @ts-expect-error
    const date = new Date(dependent.lastMoodAt);
    const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    return t('caretaker.moodAt', { time: timeStr });
  }, [dependent, t]);

  const getStatusDisplay = (sch: ScheduleItem, minutes: number, isNext: boolean) => {
    const log = findDoseLogForScheduleOnDate(logs, sch.id, todayStr);
    const kind = resolveTodayScheduleUiKind(log, minutes, currentMinutes, isNext);
    switch (kind) {
      case 'taken':
        return { label: t('schedule.status.taken'), pill: styles.statusPillSuccess, textColor: Theme.colors.success };
      case 'late':
        return { label: t('schedule.status.late'), pill: styles.statusPillLate, textColor: Theme.colors.accentOrange };
      case 'missed':
        return { label: t('schedule.status.skipped'), pill: styles.statusPillMissed, textColor: '#C23D3D' };
      case 'now':
        return { label: t('schedule.status.now'), pill: styles.statusPillNext, textColor: Theme.colors.surfaceWhite };
      case 'next':
        return { label: t('schedule.status.next'), pill: styles.statusPillUpcoming, textColor: Theme.colors.textDark };
      default:
        return { label: t('schedule.status.planned'), pill: styles.statusPillUpcoming, textColor: Theme.colors.textDark };
    }
  };

  const nextVis = useMemo(() => {
    if (!nextSchedule) return null;
    const tType = typeFor(nextSchedule);
    return tType ? TREATMENT_VISUAL[tType] : null;
  }, [nextSchedule, treatments]);

  const statLabelKey = (key: string) => {
    if (key === 'taken') return t('caretaker.today.statTaken');
    if (key === 'late') return t('caretaker.today.statLate');
    if (key === 'missed') return t('caretaker.today.statMissed');
    return t('caretaker.today.statPending');
  };

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={['#E3EEF5', Theme.colors.surfaceGrey, Theme.colors.background]}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.decorOrb, { backgroundColor: accent.soft }]} />

      <DependentProfileHeader
        title={displayName}
        subtitle={headerSubtitle}
        showSettings
        dependentId={dependentId ?? undefined}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: Theme.spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <DependentTodayHeroCard
          initials={getInitials(displayName)}
          greeting={greetingLine}
          accent={accent}
          // @ts-expect-error - lastMood z API
          mood={dependent?.lastMood}
          moodSubtitle={moodSubtitle}
          stats={todayDoseStats}
          statLabel={statLabelKey}
          overviewLabel={t('caretaker.today.dayOverview')}
          emptyDayLabel={t('caretaker.today.empty')}
        />

        <View style={styles.sectionHead}>
          <MaterialIcons name="upcoming" size={20} color={Theme.colors.primaryLimeDark} />
          <Text style={styles.sectionTitle}>{t('caretaker.today.nextActivitySection')}</Text>
        </View>

        {nextSchedule ? (
          <LinearGradient
            colors={[Theme.colors.surfaceWarmHighlight, Theme.colors.surfaceWhite]}
            style={[styles.nextCard, { borderColor: accent.solid }]}
          >
            <View style={styles.nextTop}>
              <View style={[styles.nextPill, { backgroundColor: accent.soft }]}>
                <Text style={[styles.nextPillText, { color: accent.solid }]}>{t('caretaker.today.nextBadge')}</Text>
              </View>
              {countdownLabel ? (
                <View style={styles.countdownChip}>
                  <MaterialIcons name="timer" size={16} color={Theme.colors.primaryLimeDark} />
                  <Text style={styles.countdownText}>{countdownLabel}</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.nextBody}>
              <Text style={styles.nextTime}>{nextSchedule.time}</Text>
              <View style={styles.nextDetails}>
                <Text style={styles.nextLabel} numberOfLines={2}>
                  {labelFor(nextSchedule)}
                </Text>
              </View>
              {nextVis ? (
                <View style={[styles.nextIcon, { backgroundColor: nextVis.accent + '22' }]}>
                  <MaterialIcons name={nextVis.icon} size={28} color={nextVis.accent} />
                </View>
              ) : (
                <View style={[styles.nextIcon, { backgroundColor: Theme.colors.primaryLime }]}>
                  <MaterialIcons name="medication" size={28} color={Theme.colors.primaryLimeDark} />
                </View>
              )}
            </View>
          </LinearGradient>
        ) : (
          <LinearGradient
            colors={[Theme.colors.badgeSuccessBackground, Theme.colors.surfaceWhite]}
            style={styles.allDoneCard}
          >
            <View style={styles.allDoneIcon}>
              <MaterialIcons name="check-circle" size={32} color={Theme.colors.success} />
            </View>
            <View style={styles.allDoneText}>
              <Text style={styles.allDoneTitle}>{t('caretaker.today.allDone')}</Text>
              <Text style={styles.allDoneHint}>{t('caretaker.today.allDoneHint')}</Text>
            </View>
          </LinearGradient>
        )}

        {todaysDepletion.length > 0 ? (
          <>
            <View style={styles.sectionHead}>
              <MaterialIcons name="warning-amber" size={20} color={Theme.colors.accentOrange} />
              <Text style={styles.sectionTitle}>{t('caretaker.alerts.title')}</Text>
            </View>
            <View style={styles.cardList}>
              {todaysDepletion.map((alert, idx) => (
                <View key={`alert-${idx}`} style={styles.alertCard}>
                  <View style={styles.alertIconWrap}>
                    <MaterialIcons name="inventory-2" size={22} color={Theme.colors.accentOrange} />
                  </View>
                  <Text style={styles.alertText} numberOfLines={2}>
                    {t('caretaker.calendar.alertDepletionWithName', { name: alert.inventoryItemName })}
                  </Text>
                  <Text style={styles.alertStockMargin}>{alert.pillsLeft}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        <View style={styles.sectionHead}>
          <MaterialIcons name="view-agenda" size={20} color={Theme.colors.primaryLimeDark} />
          <Text style={styles.sectionTitle}>{t('caretaker.today.plan')}</Text>
        </View>

        {todaysSchedules.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialIcons name="event-available" size={28} color={Theme.colors.textLight} />
            <Text style={styles.emptyText}>{t('caretaker.today.empty')}</Text>
          </View>
        ) : (
          <View style={styles.cardList}>
            {todaysSchedules.map(sch => {
              const label = labelFor(sch);
              const tType = typeFor(sch);
              const vis = tType ? TREATMENT_VISUAL[tType] : null;
              const minutes = timeToMinutes(sch.time);
              const isNext = nextSchedule?.id === sch.id;
              const display = getStatusDisplay(sch, minutes, isNext);
              const log = logs.find(l => l.scheduleId === sch.id);
              const isTaken = log?.status === 'TAKEN';

              return (
                <View key={sch.id} style={[styles.planCard, isNext && styles.planCardNext]}>
                  <Text style={[styles.planTime, isNext && styles.planTimeNext]}>{sch.time}</Text>
                  {vis ? (
                    <View style={[styles.planIcon, { backgroundColor: vis.accent + '22' }]}>
                      <MaterialIcons name={vis.icon} size={24} color={vis.accent} />
                    </View>
                  ) : (
                    <View style={[styles.planIcon, { backgroundColor: Theme.colors.primaryLime }]}>
                      <MaterialIcons name="medication" size={24} color={Theme.colors.primaryLimeDark} />
                    </View>
                  )}
                  <View style={styles.planBody}>
                    <Text style={[styles.planLabel, isTaken && styles.planLabelDone]} numberOfLines={2}>
                      {label}
                    </Text>
                  </View>
                  <View style={[styles.statusPill, display.pill]}>
                    <Text style={[styles.statusPillText, { color: display.textColor }]}>{display.label}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  decorOrb: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    top: 48,
    right: -48,
    opacity: 0.65,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Theme.spacing.l,
    paddingTop: Theme.spacing.s,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.s,
    marginTop: Theme.spacing.l,
    marginBottom: Theme.spacing.m,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Theme.colors.textDark,
    letterSpacing: -0.2,
  },
  nextCard: {
    borderRadius: Theme.borderRadius.xlarge,
    padding: Theme.spacing.l,
    borderWidth: 2,
    overflow: 'hidden',
    shadowColor: Theme.colors.shadowNeutral,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  nextTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.m,
  },
  nextPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Theme.borderRadius.round,
  },
  nextPillText: {
    fontSize: Theme.typography.small,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  countdownChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Theme.borderRadius.round,
    backgroundColor: Theme.colors.surfaceWhite,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  countdownText: {
    fontSize: Theme.typography.small,
    fontWeight: '700',
    color: Theme.colors.primaryLimeDark,
  },
  nextBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.m,
  },
  nextTime: {
    fontSize: 40,
    fontWeight: '900',
    color: Theme.colors.textDark,
    fontVariant: ['tabular-nums'],
    lineHeight: 44,
    minWidth: 100,
  },
  nextDetails: {
    flex: 1,
    minWidth: 0,
  },
  nextLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: Theme.colors.textDark,
    lineHeight: 24,
  },
  nextIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  allDoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.m,
    borderRadius: Theme.borderRadius.xlarge,
    padding: Theme.spacing.l,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    overflow: 'hidden',
  },
  allDoneIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Theme.colors.surfaceWhite,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  allDoneText: {
    flex: 1,
    minWidth: 0,
  },
  allDoneTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Theme.colors.textDark,
  },
  allDoneHint: {
    marginTop: 4,
    fontSize: Theme.typography.caption,
    color: Theme.colors.textLight,
    lineHeight: 20,
    flexShrink: 1,
  },
  cardList: {
    gap: Theme.spacing.s,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceWhite,
    borderRadius: Theme.borderRadius.large,
    paddingVertical: 16,
    paddingHorizontal: Theme.spacing.m,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    gap: Theme.spacing.m,
    shadowColor: Theme.colors.shadowNeutral,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  planCardNext: {
    borderColor: Theme.colors.primaryLimeDark,
    borderWidth: 2,
    backgroundColor: Theme.colors.surfaceWarmHighlight,
  },
  planTime: {
    width: 52,
    fontSize: 16,
    fontWeight: '800',
    color: Theme.colors.textLight,
    fontVariant: ['tabular-nums'],
  },
  planTimeNext: {
    color: Theme.colors.primaryLimeDark,
  },
  planIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planBody: {
    flex: 1,
    minWidth: 0,
  },
  planLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: Theme.colors.textDark,
    lineHeight: 22,
  },
  planLabelDone: {
    color: Theme.colors.textLight,
    textDecorationLine: 'line-through',
  },
  emptyCard: {
    alignItems: 'center',
    padding: Theme.spacing.xl,
    backgroundColor: Theme.colors.surfaceWhite,
    borderRadius: Theme.borderRadius.large,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    gap: Theme.spacing.s,
  },
  emptyText: {
    fontSize: Theme.typography.body,
    color: Theme.colors.textLight,
    textAlign: 'center',
    lineHeight: 22,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.m,
    backgroundColor: Theme.colors.surfaceWhite,
    borderRadius: Theme.borderRadius.large,
    padding: Theme.spacing.m,
    borderWidth: 1.5,
    borderColor: 'rgba(233, 164, 61, 0.4)',
  },
  alertIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Theme.colors.badgeWarningBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertText: {
    flex: 1,
    fontSize: Theme.typography.body,
    fontWeight: '600',
    color: Theme.colors.accentOrange,
    lineHeight: 22,
  },
  alertStockMargin: {
    fontSize: 20,
    fontWeight: '900',
    color: Theme.colors.accentOrange,
    minWidth: 32,
    textAlign: 'center',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    maxWidth: 96,
  },
  statusPillText: {
    fontSize: Theme.typography.small,
    fontWeight: '700',
    textAlign: 'center',
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
});
