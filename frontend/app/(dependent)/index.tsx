import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Theme } from '../../constants/theme';
import { SeniorFlow } from '../../constants/seniorFlowStyles';
import { SeniorScreenBackground } from '../../components/senior/SeniorScreenBackground';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { scheduleAPI, usersAPI } from '../../services/api';
import { useMeds, getScheduleTreatmentId } from '../../context/MedsContext';
import { useDependentDisplay } from '../../context/DependentDisplayContext';
import { format } from 'date-fns';
import { useOnCalendarDayChange, useTickingNow } from '../../hooks/useTickingNow';
import { timeToMinutes } from '../../utils/scheduleHelpers';
import {
  schedulesForDateSorted,
  computeDependentMainScheduleState,
  schedulesPastConfirmationWindow,
  canConfirmDoseAtTime,
} from '../../utils/dependentScheduleUi';
import {
  getCompletedScheduleIdsForDate,
  markScheduleCompletedForDate,
} from '../../services/seniorScheduleCompletion';
import { mergeDoseLogsIntoCompletionSets } from '../../utils/doseLogDay';
import { TREATMENT_VISUAL } from '../../constants/treatmentVisuals';
import { MoodIcon } from '../../components/mood/MoodIcon';
import type { MoodValue } from '../../constants/moodVisual';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

export default function DependentDashboard() {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors } = useDependentDisplay();
  const { treatments, schedules, inventory, refetchFromServer } = useMeds();
  const { now, todayStr, refresh } = useTickingNow({ tickMs: 15_000 });
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [missedIds, setMissedIds] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);

  const [moodPhase, setMoodPhase] = useState<'pick' | 'thanks' | 'hidden'>('pick');
  const [highlightMood, setHighlightMood] = useState(false);

  const syncTodayFromServer = useCallback(async () => {
    const localIds = await getCompletedScheduleIdsForDate(todayStr);
    const completed = new Set(localIds);
    const missed = new Set<string>();

    if (userId) {
      try {
        const logs = await scheduleAPI.getTodayLogs(userId, todayStr);
        if (Array.isArray(logs)) {
          mergeDoseLogsIntoCompletionSets(logs, todayStr, completed, missed);
        }
      } catch {
        /* lokalny stan wystarczy offline */
      }
    }

    setCompletedIds(completed);
    setMissedIds(missed);
  }, [todayStr, userId]);

  useOnCalendarDayChange(
    todayStr,
    useCallback(() => {
      setCompletedIds(new Set());
      setMissedIds(new Set());
      void refetchFromServer();
      void syncTodayFromServer();
    }, [refetchFromServer, syncTodayFromServer]),
  );

  const [moodEnabled, setMoodEnabled] = useState(true);
  const [displayName, setDisplayName] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      refresh();
      void refetchFromServer();
      void syncTodayFromServer();
      usersAPI.getMe().then(me => {
        if (!me) return;
        if (typeof me.moodEnabled === 'boolean') {
          setMoodEnabled(me.moodEnabled);
        }
        const name = typeof me.name === 'string' ? me.name.trim() : '';
        setDisplayName(name.length > 0 ? name : null);
        if (me.id) setUserId(String(me.id));
      }).catch(() => {});
    }, [refresh, refetchFromServer, syncTodayFromServer]),
  );

  useEffect(() => {
    void syncTodayFromServer();
  }, [syncTodayFromServer]);

  const pastDueSchedules = useMemo(
    () => schedulesPastConfirmationWindow(schedules, treatments, completedIds, now),
    [schedules, treatments, completedIds, now],
  );

  useEffect(() => {
    if (pastDueSchedules.length === 0) return;
    let cancelled = false;

    void (async () => {
      for (const { sch } of pastDueSchedules) {
        if (cancelled || completedIds.has(sch.id)) continue;
        try {
          await scheduleAPI.markMissed(sch.id);
          await markScheduleCompletedForDate(todayStr, sch.id);
        } catch (e) {
          console.warn('Could not auto-mark missed dose', e);
        }
      }
      if (!cancelled) void syncTodayFromServer();
    })();

    return () => {
      cancelled = true;
    };
  }, [pastDueSchedules, todayStr, syncTodayFromServer, completedIds]);

  const greetingLine = useMemo(() => {
    const hour = now.getHours();
    if (hour < 12) return t('dependent.greetingMorning');
    if (hour < 18) return t('dependent.greetingAfternoon');
    return t('dependent.greetingEvening');
  }, [now, t]);

  const seniorName = displayName ?? t('dependent.nameFallback');
  const todayLabel = useMemo(() => format(now, 'd.MM.yyyy'), [now]);

  const mainState = useMemo(
    () => computeDependentMainScheduleState(schedules, treatments, completedIds, now),
    [schedules, treatments, completedIds, now],
  );

  const todayRows = useMemo(
    () => schedulesForDateSorted(schedules, treatments, todayStr),
    [schedules, treatments, todayStr],
  );

  const dueActivityVisual = useMemo(() => {
    if (mainState.kind !== 'due') return null;
    const row = todayRows.find(r => r.sch.id === mainState.scheduleId);
    const tid = row ? getScheduleTreatmentId(row.sch) : undefined;
    const treatment = tid ? treatments.find(tr => tr.id === tid) : undefined;
    if (treatment?.type && TREATMENT_VISUAL[treatment.type]) {
      return TREATMENT_VISUAL[treatment.type];
    }
    return { icon: 'medication' as const, accent: Theme.colors.primaryLimeDark };
  }, [mainState, todayRows, treatments]);

  const clockText = format(now, 'HH:mm');
  const borderMain = colors.mainButtonBorderWidth ?? 0;
  const headerTop = Math.max(insets.top, Theme.spacing.m);

  const handleLogout = async () => {
    await logout();
    if (Platform.OS === 'web') {
      window.location.href = '/login';
    } else {
      router.replace('/login');
    }
  };

  const onMainAction = async () => {
    if (mainState.kind !== 'due') return;
    const row = todayRows.find(r => r.sch.id === mainState.scheduleId);
    const nowM = now.getHours() * 60 + now.getMinutes();
    if (!row || !canConfirmDoseAtTime(row.minutes, nowM)) {
      Alert.alert(t('common.error'), t('dependent.mainMissedHint'));
      void syncTodayFromServer();
      return;
    }
    try {
      await scheduleAPI.markTaken(mainState.scheduleId);
      await markScheduleCompletedForDate(todayStr, mainState.scheduleId);
      await syncTodayFromServer();
      setHighlightMood(true);
      setMoodPhase('pick');
    } catch {
      Alert.alert(t('common.error'), t('dependent.errorMarkTaken'));
    }
  };

  const onMoodPick = async (mood: string) => {
    setMoodPhase('thanks');
    try {
      await usersAPI.updateMood(mood);
    } catch (e) {
      console.warn('Could not save mood', e);
    }
    setTimeout(() => {
      setMoodPhase('hidden');
      setHighlightMood(false);
    }, 3500);
  };

  const onSos = () => {
    Alert.alert(t('dependent.sosTitle'), t('dependent.sosMessage'));
  };

  const renderHeroStatus = () => {
    if (mainState.kind === 'due') {
      return (
        <Pressable
          onPress={() => void onMainAction()}
          style={({ pressed }) => [
            styles.heroCta,
            {
              backgroundColor: colors.primaryLimeDark,
              borderColor: colors.textDark,
              borderWidth: Math.max(borderMain, 2),
            },
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
        >
          <View
            style={[
              styles.heroCtaIcon,
              dueActivityVisual
                ? { borderWidth: 2, borderColor: `${dueActivityVisual.accent}99` }
                : null,
            ]}
          >
            <MaterialIcons
              name={dueActivityVisual?.icon ?? 'medication'}
              size={36}
              color={colors.surfaceWhite}
            />
          </View>
          <Text style={[styles.heroCtaActivity, { color: colors.surfaceWhite }]} numberOfLines={3}>
            {mainState.name}
          </Text>
          <Text style={[styles.heroCtaAction, { color: colors.surfaceWhite }]}>
            {t('dependent.mainDueCta')}
          </Text>
        </Pressable>
      );
    }

    if (mainState.kind === 'missed') {
      return (
        <View style={[styles.heroStatusBox, styles.heroMissedBox, { borderColor: '#C23D3D', backgroundColor: 'rgba(194, 61, 61, 0.1)' }]}>
          <MaterialIcons name="event-busy" size={36} color="#C23D3D" />
          <Text style={[styles.heroStatusText, { color: colors.textDark }]}>{t('dependent.mainMissed')}</Text>
          <Text style={[styles.heroStatusHint, { color: colors.textLight }]}>{mainState.name}</Text>
          <Text style={[styles.heroMissedHint, { color: colors.textLight }]}>{t('dependent.mainMissedHint')}</Text>
        </View>
      );
    }

    if (mainState.kind === 'upcoming') {
      return (
        <View style={[styles.heroStatusBox, { backgroundColor: colors.calendarCell ?? colors.surfaceGrey, borderColor: colors.border }]}>
          <MaterialIcons name="schedule" size={32} color={colors.primaryLimeDark} />
          <Text style={[styles.heroStatusText, { color: colors.textDark }]}>
            {t('dependent.mainUpcoming', { time: mainState.nextTime })}
          </Text>
          <Text style={[styles.heroStatusHint, { color: colors.textLight }]}>{mainState.nextName}</Text>
        </View>
      );
    }

    if (mainState.kind === 'all_done') {
      return (
        <View style={[styles.heroStatusBox, { backgroundColor: colors.primaryLime, borderColor: colors.primaryLimeDark }]}>
          <MaterialIcons name="task-alt" size={36} color={colors.primaryLimeDark} />
          <Text style={[styles.heroStatusText, { color: colors.textDark }]}>{t('dependent.mainAllDone')}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.heroStatusBox, { backgroundColor: colors.calendarCell ?? colors.surfaceGrey, borderColor: colors.border }]}>
        <MaterialIcons name="event-available" size={32} color={colors.textLight} />
        <Text style={[styles.heroStatusText, { color: colors.textDark }]}>{t('dependent.mainEmpty')}</Text>
      </View>
    );
  };

  return (
    <SeniorScreenBackground colors={colors}>
      <View
        style={[
          SeniorFlow.headerStrip,
          { paddingTop: headerTop, backgroundColor: colors.surfaceWhite, borderBottomColor: colors.border },
        ]}
      >
        <View style={SeniorFlow.headerRow}>
          <View style={SeniorFlow.headerGreeting}>
            <Text style={[SeniorFlow.headerGreetingLine, { color: colors.textLight }]}>{greetingLine}</Text>
            <Text style={[SeniorFlow.headerName, { color: colors.textDark }]} numberOfLines={1}>
              {seniorName}
            </Text>
          </View>
          <View style={SeniorFlow.headerActions}>
            <Pressable
              onPress={() => router.push('/(dependent)/settings' as any)}
              style={[SeniorFlow.iconBtn, { backgroundColor: colors.calendarCell ?? colors.surfaceGrey, borderColor: colors.border }]}
              accessibilityLabel={t('dependent.settings.title')}
            >
              <MaterialIcons name="settings" size={28} color={colors.primaryLimeDark} />
            </Pressable>
            <Pressable
              onPress={handleLogout}
              style={[
                SeniorFlow.iconBtn,
                { backgroundColor: colors.surfaceWarmHighlight ?? colors.surfaceWhite, borderColor: colors.accentOrange },
              ]}
            >
              <MaterialIcons name="logout" size={28} color={colors.accentOrange} />
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={SeniorFlow.scroll} showsVerticalScrollIndicator={false}>
        <View
          style={[
            SeniorFlow.heroCard,
            { backgroundColor: colors.surfaceWhite, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.todayChip, { color: colors.primaryLimeDark, backgroundColor: colors.primaryLime + '99' }]}>
            {todayLabel}
          </Text>
          <Text style={[SeniorFlow.clock, { color: colors.textDark }]}>{clockText}</Text>
          <View style={[SeniorFlow.heroDivider, { backgroundColor: colors.border }]} />
          {renderHeroStatus()}
        </View>

        {moodEnabled && moodPhase !== 'hidden' && (
          <View
            style={[
              SeniorFlow.surfaceCard,
              {
                backgroundColor: colors.surfaceWhite,
                borderColor: highlightMood ? colors.accentOrange : colors.moodBorder ?? colors.border,
                borderWidth: highlightMood ? 3 : 1.5,
              },
            ]}
          >
            {moodPhase === 'pick' && (
              <>
                <Text style={[styles.moodTitle, { color: colors.textDark }]}>{t('dependent.moodTitle')}</Text>
                <View style={styles.moodRow}>
                  {(['sad', 'neutral', 'happy'] as const).map((mood: MoodValue) => (
                    <Pressable
                      key={mood}
                      onPress={() => onMoodPick(mood)}
                      style={({ pressed }) => [pressed && styles.pressed]}
                      accessibilityRole="button"
                    >
                      <MoodIcon mood={mood} size="lg" />
                    </Pressable>
                  ))}
                </View>
              </>
            )}
            {moodPhase === 'thanks' && (
              <Text style={[styles.moodThanks, { color: colors.textDark }]}>{t('dependent.moodThanks')}</Text>
            )}
          </View>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.sosCard,
            { backgroundColor: colors.accentOrange },
            pressed && styles.pressed,
          ]}
          onPress={onSos}
          accessibilityRole="button"
        >
          <MaterialIcons name="emergency" size={32} color={colors.surfaceWhite} />
          <Text style={[styles.sosText, { color: colors.surfaceWhite }]}>{t('dependent.sosTitle')}</Text>
        </Pressable>

        <Text style={[SeniorFlow.sectionLabel, { color: colors.textLight, marginTop: 0 }]}>
          {t('dependent.todayTitle')}
        </Text>
        {todayRows.length === 0 ? (
          <Text style={[styles.emptyLine, { color: colors.textLight }]}>{t('dependent.todayEmpty')}</Text>
        ) : (
          todayRows.map(({ sch, name }) => {
            const tid = getScheduleTreatmentId(sch);
            const treatment = tid ? treatments.find(x => x.id === tid) : undefined;
            const icon =
              treatment?.type && TREATMENT_VISUAL[treatment.type]
                ? TREATMENT_VISUAL[treatment.type].icon
                : ('event' as const);
            const done = completedIds.has(sch.id);
            const missed = missedIds.has(sch.id);
            const nowM = now.getHours() * 60 + now.getMinutes();
            const rowMinutes = timeToMinutes(sch.time);
            const canTake = !done && canConfirmDoseAtTime(rowMinutes, nowM);
            return (
              <View
                key={sch.id}
                style={[
                  SeniorFlow.rowCard,
                  {
                    backgroundColor: colors.surfaceWhite,
                    borderColor: missed ? '#C23D3D' : done ? colors.success : colors.border,
                    paddingLeft: Theme.spacing.m + 5,
                  },
                ]}
              >
                <View
                  style={[
                    SeniorFlow.rowAccent,
                    {
                      backgroundColor: missed ? '#C23D3D' : done ? colors.success : colors.primaryLimeDark,
                    },
                  ]}
                />
                <View
                  style={[
                    SeniorFlow.timeBadge,
                    { backgroundColor: colors.calendarCell ?? colors.surfaceGrey, borderColor: colors.border },
                  ]}
                >
                  <Text style={[SeniorFlow.activityTime, { color: colors.textDark }]}>{sch.time}</Text>
                </View>
                <MaterialIcons name={icon} size={28} color={colors.primaryLimeDark} />
                <View style={{ flex: 1 }}>
                  <Text style={[SeniorFlow.activityName, { color: colors.textDark }]}>{name}</Text>
                  {treatment?.description ? (
                    <Text style={[styles.activityDesc, { color: colors.textLight }]}>{treatment.description}</Text>
                  ) : null}
                </View>
                <MaterialIcons
                  name={missed ? 'cancel' : done ? 'check-circle' : canTake ? 'touch-app' : 'radio-button-unchecked'}
                  size={34}
                  color={missed ? '#C23D3D' : done ? colors.success : canTake ? colors.primaryLimeDark : colors.textLight}
                />
              </View>
            );
          })
        )}

        <Pressable
          onPress={() => router.push('/(dependent)/calendar' as any)}
          style={({ pressed }) => [
            SeniorFlow.linkCard,
            { backgroundColor: colors.surfaceWhite, borderColor: colors.primaryLimeDark },
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
        >
          <View style={[SeniorFlow.linkIconCircle, { backgroundColor: colors.primaryLime }]}>
            <MaterialIcons name="calendar-month" size={28} color={colors.primaryLimeDark} />
          </View>
          <Text style={[SeniorFlow.linkTitle, { color: colors.primaryLimeDark }]}>{t('dependent.calendarCta')}</Text>
          <MaterialIcons name="chevron-right" size={30} color={colors.primaryLimeDark} />
        </Pressable>

        <Text style={[SeniorFlow.sectionLabel, { color: colors.textLight }]}>{t('dependent.inventoryTitle')}</Text>
        {inventory.length === 0 ? (
          <Text style={[styles.emptyLine, { color: colors.textLight }]}>{t('dependent.inventoryEmpty')}</Text>
        ) : (
          inventory.map(item => (
            <View
              key={item.id}
              style={[
                SeniorFlow.rowCard,
                {
                  backgroundColor: colors.surfaceWhite,
                  borderColor: colors.border,
                  paddingLeft: Theme.spacing.m + 5,
                },
              ]}
            >
              <View style={[SeniorFlow.rowAccent, { backgroundColor: colors.accentOrange }]} />
              <MaterialIcons name="inventory-2" size={28} color={colors.primaryLimeDark} />
              <View style={{ flex: 1 }}>
                <Text style={[SeniorFlow.activityName, { color: colors.textDark }]}>{item.name}</Text>
                {Number(item.totalPills) > 0 && (
                  <Text style={[styles.stockCount, { color: colors.primaryLimeDark }]}>
                    {t('dependent.inventoryDoses', { count: item.totalPills })}
                  </Text>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SeniorScreenBackground>
  );
}

const styles = StyleSheet.create({
  todayChip: {
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.round,
    fontSize: Theme.typography.caption,
    fontWeight: '700',
    marginBottom: Theme.spacing.s,
    overflow: 'hidden',
  },
  heroCta: {
    width: '100%',
    borderRadius: Theme.borderRadius.large,
    padding: Theme.spacing.l,
    alignItems: 'center',
  },
  heroCtaIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.s,
  },
  heroCtaActivity: {
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  heroCtaAction: {
    marginTop: Theme.spacing.s,
    fontSize: Theme.typography.body,
    fontWeight: '700',
    textAlign: 'center',
    opacity: 0.92,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroStatusBox: {
    width: '100%',
    borderRadius: Theme.borderRadius.large,
    borderWidth: 1.5,
    padding: Theme.spacing.l,
    alignItems: 'center',
    gap: Theme.spacing.s,
  },
  heroStatusText: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 28,
  },
  heroStatusHint: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  heroMissedBox: {
    gap: Theme.spacing.s,
  },
  heroMissedHint: {
    fontSize: Theme.typography.caption,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Theme.spacing.s,
  },
  moodTitle: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: Theme.spacing.m,
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.s,
  },
  moodThanks: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  sosCard: {
    flexDirection: 'row',
    borderRadius: Theme.borderRadius.large,
    paddingVertical: Theme.spacing.m + 2,
    paddingHorizontal: Theme.spacing.l,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.m,
    gap: Theme.spacing.s,
    minHeight: 56,
  },
  sosText: {
    fontSize: 24,
    fontWeight: '800',
  },
  emptyLine: {
    fontSize: 20,
    lineHeight: 26,
    marginBottom: Theme.spacing.m,
  },
  activityDesc: {
    fontSize: 17,
    fontWeight: '600',
    marginTop: 4,
    lineHeight: 22,
  },
  stockCount: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
});
