import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../constants/theme';
import { useMeds, getScheduleTreatmentId } from '../../context/MedsContext';
import type { ScheduleItem } from '../../context/MedsContext';
import { scheduleAPI, usersAPI } from '../../services/api';
import { useTickingNow, useOnCalendarDayChange } from '../../hooks/useTickingNow';
import { scheduleAppliesToDate, timeToMinutes } from '../../utils/scheduleHelpers';
import { TREATMENT_VISUAL } from '../../constants/treatmentVisuals';
import { HybridProfileHeader } from './HybridProfileHeader';
import { HybridTakeMedCard } from './HybridTakeMedCard';
import { DependentTodayHeroCard } from '../caretaker/DependentTodayHeroCard';
import { useSelfUserId } from '../../hooks/useSelfUserId';
import { computeDependentMainScheduleState } from '../../utils/dependentScheduleUi';
import {
  getCompletedScheduleIdsForDate,
  markScheduleCompletedForDate,
} from '../../services/seniorScheduleCompletion';
import { SeniorConfirmModal } from '../SeniorConfirmModal';
import { VitalsMetricModal } from '../senior/VitalsMetricModal';
import { treatmentTypeForSchedule } from '../../utils/scheduleTreatmentType';
import { applySeniorProfileSettings } from '../../services/seniorProfileSync';
import { useDependentDisplay } from '../../context/DependentDisplayContext';
import {
  resolveTodayScheduleUiKind,
  todayStatsBucketFromKind,
} from '../../utils/todayScheduleStatus';
import { findDoseLogForScheduleOnDate, mergeDoseLogsIntoCompletionSets } from '../../utils/doseLogDay';

const AVATAR_PALETTE = [
  { solid: Theme.colors.primaryLimeDark, soft: 'rgba(69, 104, 130, 0.14)' },
  { solid: Theme.colors.accentOrange, soft: 'rgba(233, 164, 61, 0.2)' },
] as const;

export default function HybridTodayScreen() {
  const { t } = useTranslation();
  const { colors, reload } = useDependentDisplay();
  const selfUserId = useSelfUserId();
  const { schedules, treatments, depletionAlerts, refetchFromServer } = useMeds();
  const { now, todayStr } = useTickingNow({ tickMs: 60_000 });

  const [profile, setProfile] = useState<{ name?: string; email?: string; vitalsEntryEnabled?: boolean } | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [medConfirmVisible, setMedConfirmVisible] = useState(false);
  const [vitalsModalVisible, setVitalsModalVisible] = useState(false);
  const [vitalsModalType, setVitalsModalType] = useState<'BP' | 'GLUCOSE'>('BP');

  const vitalsEntryEnabled = profile?.vitalsEntryEnabled ?? false;

  const syncCompletionAndLogs = useCallback(async () => {
    const ids = await getCompletedScheduleIdsForDate(todayStr);
    const completed = new Set(ids);
    const missed = new Set<string>();
    if (!selfUserId) {
      setCompletedIds(completed);
      return;
    }
    try {
      const todayLogs = await scheduleAPI.getTodayLogs(selfUserId, todayStr);
      setLogs(todayLogs);
      mergeDoseLogsIntoCompletionSets(todayLogs, todayStr, completed, missed);
    } catch {
      /* ignore */
    }
    setCompletedIds(completed);
  }, [selfUserId, todayStr]);

  const fetchProfile = useCallback(async () => {
    if (!selfUserId) return;
    try {
      const me = await usersAPI.getMe();
      setProfile(me);
      void applySeniorProfileSettings(me ?? {});
    } catch {
      /* ignore */
    }
  }, [selfUserId]);

  useFocusEffect(
    useCallback(() => {
      void refetchFromServer();
      void syncCompletionAndLogs();
      void reload();
      void fetchProfile();
      const pollId = setInterval(() => void syncCompletionAndLogs(), 30_000);
      return () => clearInterval(pollId);
    }, [refetchFromServer, syncCompletionAndLogs, reload, fetchProfile]),
  );

  useOnCalendarDayChange(todayStr, useCallback(() => {
    void refetchFromServer();
    void syncCompletionAndLogs();
  }, [syncCompletionAndLogs, refetchFromServer]));

  const mainState = useMemo(
    () => computeDependentMainScheduleState(schedules, treatments, completedIds, now),
    [schedules, treatments, completedIds, now],
  );

  const displayName = profile?.name?.trim() || profile?.email || t('hybrid.nameFallback');
  const accent = AVATAR_PALETTE[0];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const todaysSchedules = useMemo(
    () => [...schedules].filter(s => scheduleAppliesToDate(s, todayStr)).sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time)),
    [schedules, todayStr],
  );

  const nextSchedule = useMemo(
    () => todaysSchedules.find(s => timeToMinutes(s.time) >= currentMinutes),
    [todaysSchedules, currentMinutes],
  );

  const todayDoseStats = useMemo(() => {
    let taken = 0, late = 0, missed = 0, pending = 0;
    for (const sch of todaysSchedules) {
      const log = findDoseLogForScheduleOnDate(logs, sch.id, todayStr);
      const bucket = todayStatsBucketFromKind(resolveTodayScheduleUiKind(log, timeToMinutes(sch.time), currentMinutes, nextSchedule?.id === sch.id));
      if (bucket === 'taken') taken += 1;
      else if (bucket === 'late') late += 1;
      else if (bucket === 'missed') missed += 1;
      else pending += 1;
    }
    return { taken, late, missed, pending, total: todaysSchedules.length };
  }, [todaysSchedules, logs, currentMinutes, nextSchedule?.id, todayStr]);

  const labelFor = (sch: ScheduleItem) => {
    if (sch.customName) return sch.customName;
    const tid = getScheduleTreatmentId(sch);
    return tid ? treatments.find(tr => tr.id === tid)?.name ?? t('schedule.activityFallback') : t('schedule.activityFallback');
  };

  const maybeShowVitals = (scheduleId: string) => {
    if (!vitalsEntryEnabled) return;
    const activityType = treatmentTypeForSchedule(scheduleId, schedules, treatments);
    if (activityType === 'BLOOD_PRESSURE') { setVitalsModalType('BP'); setVitalsModalVisible(true); }
    else if (activityType === 'BLOOD_SUGAR') { setVitalsModalType('GLUCOSE'); setVitalsModalVisible(true); }
  };

  const confirmMed = async () => {
    if (mainState.kind !== 'due' && mainState.kind !== 'missed') return;
    const scheduleId = mainState.scheduleId;
    setMedConfirmVisible(false);
    try {
      await scheduleAPI.markTaken(scheduleId);
      await markScheduleCompletedForDate(todayStr, scheduleId);
      await refetchFromServer();
      await syncCompletionAndLogs();
      maybeShowVitals(scheduleId);
    } catch {
      Alert.alert(t('common.error'), t('dependent.errorMarkTaken'));
    }
  };

  const medConfirmMessage =
    mainState.kind === 'due' || mainState.kind === 'missed'
      ? t('dependent.home.confirmMed', { name: mainState.name, dose: mainState.dose })
      : t('dependent.home.confirmMedGeneric');

  const greetingLine = useMemo(() => {
    const hour = now.getHours();
    if (hour < 12) return t('dependent.greetingMorning');
    if (hour < 18) return t('dependent.greetingAfternoon');
    return t('dependent.greetingEvening');
  }, [now, t]);

  return (
    <View style={styles.screen}>
      <LinearGradient colors={['#E3EEF5', Theme.colors.surfaceGrey, Theme.colors.background]} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />
      <HybridProfileHeader title={displayName} subtitle={format(now, 'd.MM.yyyy')} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <HybridTakeMedCard
          mainState={mainState}
          schedules={schedules}
          treatments={treatments}
          onPress={() => setMedConfirmVisible(true)}
        />
        <DependentTodayHeroCard
          initials={displayName.substring(0, 2).toUpperCase()}
          greeting={greetingLine}
          accent={accent}
          stats={todayDoseStats}
          statLabel={(key: string) => {
            if (key === 'taken') return t('caretaker.today.statTaken');
            if (key === 'late') return t('caretaker.today.statLate');
            if (key === 'missed') return t('caretaker.today.statMissed');
            return t('caretaker.today.statPending');
          }}
          overviewLabel={t('caretaker.today.dayOverview')}
          emptyDayLabel={t('caretaker.today.empty')}
        />
        <View style={styles.sectionHead}>
          <MaterialIcons name="view-agenda" size={20} color={Theme.colors.primaryLimeDark} />
          <Text style={styles.sectionTitle}>{t('caretaker.today.plan')}</Text>
        </View>
        {todaysSchedules.length === 0 ? (
          <Text style={styles.emptyText}>{t('caretaker.today.empty')}</Text>
        ) : (
          todaysSchedules.map(sch => {
            const log = findDoseLogForScheduleOnDate(logs, sch.id, todayStr);
            const kind = resolveTodayScheduleUiKind(log, timeToMinutes(sch.time), currentMinutes, nextSchedule?.id === sch.id);
            const tid = getScheduleTreatmentId(sch);
            const tType = tid ? treatments.find(tr => tr.id === tid)?.type : undefined;
            const vis = tType ? TREATMENT_VISUAL[tType] : null;
            return (
              <View key={sch.id} style={[styles.planCard, nextSchedule?.id === sch.id && styles.planCardNext]}>
                <Text style={styles.planTime}>{sch.time}</Text>
                {vis ? <MaterialIcons name={vis.icon} size={22} color={vis.accent} /> : <MaterialIcons name="medication" size={22} color={Theme.colors.primaryLimeDark} />}
                <Text style={styles.planLabel}>{labelFor(sch)}</Text>
                <Text style={styles.planStatus}>{t(`schedule.status.${kind === 'taken' ? 'taken' : kind === 'late' ? 'late' : kind === 'missed' ? 'skipped' : kind === 'now' ? 'now' : 'planned'}`)}</Text>
              </View>
            );
          })
        )}
        {depletionAlerts.filter(a => a.date === todayStr).map((alert, idx) => (
          <View key={idx} style={styles.alertCard}>
            <MaterialIcons name="warning-amber" size={22} color={Theme.colors.accentOrange} />
            <Text style={styles.alertText}>{t('caretaker.calendar.alertDepletionWithName', { name: alert.inventoryItemName })}</Text>
            <Text style={styles.alertStockMargin}>{alert.pillsLeft}</Text>
          </View>
        ))}
      </ScrollView>
      <SeniorConfirmModal visible={medConfirmVisible} title={t('dependent.home.confirmTitle')} message={medConfirmMessage} onConfirm={() => void confirmMed()} onCancel={() => setMedConfirmVisible(false)} confirmColor={Theme.colors.primaryLimeDark} />
      <VitalsMetricModal visible={vitalsModalVisible} type={vitalsModalType} colors={colors} onClose={() => setVitalsModalVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Theme.colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Theme.spacing.l, paddingTop: Theme.spacing.s, paddingBottom: Theme.spacing.xl },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.s, marginTop: Theme.spacing.l, marginBottom: Theme.spacing.m },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Theme.colors.textDark },
  planCard: { flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.s, backgroundColor: Theme.colors.surfaceWhite, borderRadius: Theme.borderRadius.large, padding: Theme.spacing.m, marginBottom: Theme.spacing.s, borderWidth: 1, borderColor: Theme.colors.border },
  planCardNext: { borderColor: Theme.colors.primaryLimeDark, borderWidth: 2 },
  planTime: { width: 52, fontWeight: '800', color: Theme.colors.textDark },
  planLabel: { flex: 1, fontWeight: '700', color: Theme.colors.textDark },
  planStatus: { fontSize: Theme.typography.small, fontWeight: '700', color: Theme.colors.textLight },
  emptyText: { textAlign: 'center', color: Theme.colors.textLight, padding: Theme.spacing.l },
  alertCard: { flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.s, padding: Theme.spacing.m, backgroundColor: Theme.colors.surfaceWhite, borderRadius: Theme.borderRadius.large, borderWidth: 1, borderColor: 'rgba(233,164,61,0.4)', marginTop: Theme.spacing.s },
  alertText: { flex: 1, color: Theme.colors.accentOrange, fontWeight: '600' },
  alertStockMargin: { fontSize: 20, fontWeight: '900', color: Theme.colors.accentOrange, minWidth: 32, textAlign: 'center' },
});
