import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useForegroundDataRefresh } from '../../hooks/useForegroundDataRefresh';
import { useSelfUserId } from '../../hooks/useSelfUserId';
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
import { useTabScreenScrollBottomPadding } from '../../utils/safeAreaInsets';
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
import { SeniorTourTarget } from '../senior/SeniorTourTarget';
import {
  CaretakerTourScrollProvider,
  CaretakerTourScrollView,
} from '../../context/CaretakerTourScrollContext';

const AVATAR_PALETTE_HC = [
  { solid: '#003366', soft: 'rgba(0, 51, 102, 0.14)' },
  { solid: '#994400', soft: 'rgba(153, 68, 0, 0.2)' },
] as const;

export default function HybridTodayScreen() {
  const { t } = useTranslation();
  const scrollBottomPadding = useTabScreenScrollBottomPadding();
  const { colors, colorBlindFriendly, highContrast, reload } = useDependentDisplay();
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

  const syncTodayScreen = useCallback(async () => {
    if (selfUserId) await refetchFromServer(selfUserId);
    else await refetchFromServer();
    await syncCompletionAndLogs();
    await reload();
    await fetchProfile();
  }, [selfUserId, refetchFromServer, syncCompletionAndLogs, reload, fetchProfile]);

  useForegroundDataRefresh({ onRefresh: syncTodayScreen });

  useOnCalendarDayChange(todayStr, useCallback(() => {
    void refetchFromServer();
    void syncCompletionAndLogs();
  }, [syncCompletionAndLogs, refetchFromServer]));

  const mainState = useMemo(
    () => computeDependentMainScheduleState(schedules, treatments, completedIds, now),
    [schedules, treatments, completedIds, now],
  );

  const displayName = profile?.name?.trim() || profile?.email || t('hybrid.nameFallback');
  const accent = (colorBlindFriendly || highContrast ? AVATAR_PALETTE_HC : [
    { solid: colors.primaryLimeDark, soft: 'rgba(69, 104, 130, 0.14)' },
    { solid: colors.accentOrange, soft: 'rgba(233, 164, 61, 0.2)' },
  ])[0];
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
    <CaretakerTourScrollProvider>
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.surfaceGrey, colors.background, colors.background]} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />
      <HybridProfileHeader title={displayName} subtitle={format(now, 'd.MM.yyyy')} showSettings />
      <CaretakerTourScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: scrollBottomPadding }]} showsVerticalScrollIndicator={false}>
        <SeniorTourTarget
          stepId="today-take-med"
          wrapStyle={styles.tourFullWidth}
        >
          <HybridTakeMedCard
            mainState={mainState}
            schedules={schedules}
            treatments={treatments}
            onPress={() => setMedConfirmVisible(true)}
            colors={colors}
            colorBlindFriendly={colorBlindFriendly}
            highContrast={highContrast}
          />
        </SeniorTourTarget>
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
        <SeniorTourTarget
          stepId="today-plan"
          wrapStyle={styles.tourFullWidth}
        >
        <View>
        <View style={styles.sectionHead}>
          <MaterialIcons name="view-agenda" size={20} color={colors.primaryLimeDark} />
          <Text style={[styles.sectionTitle, { color: colors.textDark }]}>{t('caretaker.today.plan')}</Text>
        </View>
        {todaysSchedules.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textLight }]}>{t('caretaker.today.empty')}</Text>
        ) : (
          todaysSchedules.map(sch => {
            const log = findDoseLogForScheduleOnDate(logs, sch.id, todayStr);
            const kind = resolveTodayScheduleUiKind(log, timeToMinutes(sch.time), currentMinutes, nextSchedule?.id === sch.id);
            const tid = getScheduleTreatmentId(sch);
            const tType = tid ? treatments.find(tr => tr.id === tid)?.type : undefined;
            const vis = tType ? TREATMENT_VISUAL[tType] : null;
            const iconColor = colorBlindFriendly || highContrast ? colors.primaryLimeDark : (vis?.accent ?? colors.primaryLimeDark);
            return (
              <View
                key={sch.id}
                style={[
                  styles.planCard,
                  {
                    backgroundColor: colors.surfaceWhite,
                    borderColor: colors.border,
                    borderWidth: nextSchedule?.id === sch.id ? 2 : 1,
                  },
                  nextSchedule?.id === sch.id && { borderColor: colors.primaryLimeDark },
                ]}
              >
                <Text style={[styles.planTime, { color: colors.textDark }]}>{sch.time}</Text>
                {vis ? <MaterialIcons name={vis.icon} size={22} color={iconColor} /> : <MaterialIcons name="medication" size={22} color={colors.primaryLimeDark} />}
                <Text style={[styles.planLabel, { color: colors.textDark }]}>{labelFor(sch)}</Text>
                <Text style={[styles.planStatus, { color: colors.textLight }]}>{t(`schedule.status.${kind === 'taken' ? 'taken' : kind === 'late' ? 'late' : kind === 'missed' ? 'skipped' : kind === 'now' ? 'now' : 'planned'}`)}</Text>
              </View>
            );
          })
        )}
        </View>
        </SeniorTourTarget>
        {depletionAlerts.filter(a => a.date === todayStr).map((alert, idx) => (
          <View key={idx} style={[styles.alertCard, { backgroundColor: colors.surfaceWhite, borderColor: colors.accentOrange }]}>
            <MaterialIcons name="warning-amber" size={22} color={colors.accentOrange} />
            <Text style={[styles.alertText, { color: colors.accentOrange }]}>{t('caretaker.calendar.alertDepletionWithName', { name: alert.inventoryItemName })}</Text>
            <Text style={[styles.alertStockMargin, { color: colors.accentOrange }]}>{alert.pillsLeft}</Text>
          </View>
        ))}
      </CaretakerTourScrollView>
      <SeniorConfirmModal visible={medConfirmVisible} title={t('dependent.home.confirmTitle')} message={medConfirmMessage} onConfirm={() => void confirmMed()} onCancel={() => setMedConfirmVisible(false)} confirmColor={colors.primaryLimeDark} />
      <VitalsMetricModal visible={vitalsModalVisible} type={vitalsModalType} colors={colors} onClose={() => setVitalsModalVisible(false)} />
    </View>
    </CaretakerTourScrollProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Theme.spacing.l, paddingTop: Theme.spacing.s },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.s, marginTop: Theme.spacing.l, marginBottom: Theme.spacing.m },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  planCard: { flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.s, borderRadius: Theme.borderRadius.large, padding: Theme.spacing.m, marginBottom: Theme.spacing.s },
  planTime: { width: 52, fontWeight: '800' },
  planLabel: { flex: 1, fontWeight: '700' },
  planStatus: { fontSize: Theme.typography.small, fontWeight: '700' },
  emptyText: { textAlign: 'center', padding: Theme.spacing.l },
  alertCard: { flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.s, padding: Theme.spacing.m, borderRadius: Theme.borderRadius.large, borderWidth: 1, marginTop: Theme.spacing.s },
  alertText: { flex: 1, fontWeight: '600' },
  alertStockMargin: { fontSize: 20, fontWeight: '900', minWidth: 32, textAlign: 'center' },
  tourFullWidth: { width: '100%' },
});
