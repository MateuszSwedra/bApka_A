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
import { Card } from '../../components/Card';
import { Theme } from '../../constants/theme';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { scheduleAPI, usersAPI } from '../../services/api';
import { useMeds, getScheduleTreatmentId } from '../../context/MedsContext';
import { useDependentDisplay } from '../../context/DependentDisplayContext';
import { format } from 'date-fns';
import { schedulesForDateSorted, computeDependentMainScheduleState } from '../../utils/dependentScheduleUi';
import {
  getCompletedScheduleIdsForDate,
  markScheduleCompletedForDate,
} from '../../services/seniorScheduleCompletion';
import { TREATMENT_VISUAL } from '../../constants/treatmentVisuals';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

export default function DependentDashboard() {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const { colors } = useDependentDisplay();
  const { treatments, schedules, inventory, refetchFromServer } = useMeds();
  const [now, setNow] = useState(() => new Date());
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const todayStr = format(now, 'yyyy-MM-dd');

  const [moodPhase, setMoodPhase] = useState<'pick' | 'thanks' | 'hidden'>('pick');
  const [highlightMood, setHighlightMood] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const loadCompleted = useCallback(async () => {
    const ids = await getCompletedScheduleIdsForDate(todayStr);
    setCompletedIds(new Set(ids));
  }, [todayStr]);

  useEffect(() => {
    void loadCompleted();
  }, [loadCompleted]);

  const [moodEnabled, setMoodEnabled] = useState(true);

  useFocusEffect(
    useCallback(() => {
      void refetchFromServer();
      void loadCompleted();
      usersAPI.getMe().then(me => {
        if (me && typeof me.moodEnabled === 'boolean') {
          setMoodEnabled(me.moodEnabled);
        }
      }).catch(() => {});
    }, [refetchFromServer, loadCompleted]),
  );

  const mainState = useMemo(
    () => computeDependentMainScheduleState(schedules, treatments, completedIds, now),
    [schedules, treatments, completedIds, now],
  );

  const todayRows = useMemo(
    () => schedulesForDateSorted(schedules, treatments, todayStr),
    [schedules, treatments, todayStr],
  );

  const clockText = format(now, 'HH:mm');

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
    try {
      await scheduleAPI.markTaken(mainState.scheduleId);
      await markScheduleCompletedForDate(todayStr, mainState.scheduleId);
      await loadCompleted();
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

  const borderMain = colors.mainButtonBorderWidth ?? 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceGrey }]}>
      <View style={[styles.header, { backgroundColor: colors.surfaceWhite, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerClock, { color: colors.textDark }]}>{clockText}</Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => router.push('/(dependent)/settings' as any)}
            style={[styles.iconBtn, { backgroundColor: colors.primaryLime }]}
          >
            <MaterialIcons name="settings" size={32} color={colors.primaryLimeDark} />
          </Pressable>
          <Pressable
            onPress={handleLogout}
            style={[styles.logoutBtn, { backgroundColor: colors.surfaceSoftOrange }]}
          >
            <MaterialIcons name="logout" size={32} color={colors.accentOrange} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {moodEnabled && moodPhase !== 'hidden' && (
          <View
            style={[
              styles.moodWrap,
              {
                backgroundColor: colors.surfaceWhite,
                borderColor: highlightMood ? colors.accentOrange : colors.moodBorder ?? colors.border,
                borderWidth: highlightMood ? 3 : colors.mainButtonBorderWidth ?? 1,
              },
            ]}
          >
            {moodPhase === 'pick' && (
              <>
                <Text style={[styles.moodTitle, { color: colors.textDark }]}>
                  {t('dependent.moodTitle')}
                </Text>
                <View style={styles.moodRow}>
                  <Pressable
                    onPress={() => onMoodPick('sad')}
                    style={({ pressed }) => [styles.moodFace, pressed && { opacity: 0.85 }]}
                  >
                    <Text style={styles.moodEmoji}>🙁</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onMoodPick('neutral')}
                    style={({ pressed }) => [styles.moodFace, pressed && { opacity: 0.85 }]}
                  >
                    <Text style={styles.moodEmoji}>😐</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onMoodPick('happy')}
                    style={({ pressed }) => [styles.moodFace, pressed && { opacity: 0.85 }]}
                  >
                    <Text style={styles.moodEmoji}>🙂</Text>
                  </Pressable>
                </View>
              </>
            )}
            {moodPhase === 'thanks' && (
              <Text style={[styles.moodThanks, { color: colors.textDark }]}>
                {t('dependent.moodThanks')}
              </Text>
            )}
          </View>
        )}

        <View style={styles.clockContainer}>
          <Text style={[styles.clock, { color: colors.textDark }]}>{clockText}</Text>
        </View>

        {mainState.kind === 'due' && (
          <Pressable
            onPress={() => void onMainAction()}
            style={({ pressed }) => [
              styles.mainActionCard,
              {
                backgroundColor: colors.primaryLimeDark,
                borderColor: colors.textDark,
                borderWidth: borderMain || 0,
              },
              pressed && styles.pressedCard,
            ]}
          >
            <View style={styles.mainActionIcon}>
              <MaterialIcons name="medication" size={64} color={colors.surfaceWhite} />
            </View>
            <Text style={[styles.mainActionText, { color: colors.surfaceWhite }]}>
              {t('dependent.mainDue')}
            </Text>
            <Text style={[styles.mainActionSub, { color: colors.surfaceWhite }]}>{mainState.name}</Text>
          </Pressable>
        )}

        {mainState.kind === 'upcoming' && (
          <View
            style={[
              styles.mainPassive,
              {
                backgroundColor: colors.border,
                borderColor: colors.textLight,
                borderWidth: borderMain || 1,
              },
            ]}
          >
            <MaterialIcons name="schedule" size={40} color={colors.textDark} />
            <Text style={[styles.mainPassiveText, { color: colors.textDark }]}>
              {t('dependent.mainUpcoming', { time: mainState.nextTime })}
            </Text>
            <Text style={[styles.mainPassiveHint, { color: colors.textDark }]}>{mainState.nextName}</Text>
          </View>
        )}

        {mainState.kind === 'empty' && (
          <View
            style={[
              styles.mainPassive,
              {
                backgroundColor: colors.border,
                borderColor: colors.textLight,
                borderWidth: borderMain || 1,
              },
            ]}
          >
            <MaterialIcons name="event-available" size={40} color={colors.textDark} />
            <Text style={[styles.mainPassiveText, { color: colors.textDark }]}>
              {t('dependent.mainEmpty')}
            </Text>
          </View>
        )}

        {mainState.kind === 'all_done' && (
          <View
            style={[
              styles.mainDone,
              {
                backgroundColor: colors.primaryLime,
                borderColor: colors.primaryLimeDark,
                borderWidth: borderMain || 2,
              },
            ]}
          >
            <MaterialIcons name="task-alt" size={44} color={colors.primaryLimeDark} />
            <Text style={[styles.mainDoneText, { color: colors.textDark }]}>
              {t('dependent.mainAllDone')}
            </Text>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.sosCard,
            { backgroundColor: colors.accentOrange },
            pressed && styles.pressedCard,
          ]}
          onPress={onSos}
        >
          <MaterialIcons name="emergency" size={36} color={colors.surfaceWhite} />
          <Text style={[styles.sosText, { color: colors.surfaceWhite }]}>{t('dependent.sosTitle')}</Text>
        </Pressable>

        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.textDark }]}>{t('dependent.todayTitle')}</Text>
        </View>
        {todayRows.length === 0 ? (
          <Text style={[styles.emptyLine, { color: colors.textLight }]}>{t('dependent.todayEmpty')}</Text>
        ) : (
          todayRows.map(({ sch, name }) => {
            const tid = getScheduleTreatmentId(sch);
            const t = tid ? treatments.find(x => x.id === tid) : undefined;
            const icon =
              t?.type && TREATMENT_VISUAL[t.type] ? TREATMENT_VISUAL[t.type].icon : ('event' as const);
            const done = completedIds.has(sch.id);
            return (
              <Card
                key={sch.id}
                style={{
                  ...styles.activityCard,
                  backgroundColor: colors.surfaceWhite,
                  borderColor: colors.border,
                }}
              >
                <View style={[styles.timeBadge, { backgroundColor: colors.surfaceGrey }]}>
                  <Text style={[styles.activityTime, { color: colors.textDark }]}>{sch.time}</Text>
                </View>
                <MaterialIcons name={icon} size={28} color={colors.primaryLimeDark} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.activityName, { color: colors.textDark }]}>
                    {name}
                  </Text>
                  {t?.description ? (
                    <Text style={{ fontSize: 16, color: colors.textDark, marginTop: 4 }}>
                      {t.description}
                    </Text>
                  ) : null}
                </View>
                <MaterialIcons
                  name={done ? 'check-circle' : 'radio-button-unchecked'}
                  size={32}
                  color={done ? colors.success : colors.textLight}
                />
              </Card>
            );
          })
        )}

        <Pressable
          onPress={() => router.push('/(dependent)/calendar' as any)}
          style={[
            styles.calendarCta,
            { backgroundColor: colors.primaryLimeDark, borderColor: colors.textDark },
          ]}
        >
          <MaterialIcons name="calendar-month" size={36} color={colors.surfaceWhite} />
          <Text style={[styles.calendarCtaText, { color: colors.surfaceWhite }]}>
            {t('dependent.calendarCta')}
          </Text>
        </Pressable>

        <Text style={[styles.sectionTitle, { color: colors.textDark, marginTop: Theme.spacing.l }]}>
          {t('dependent.inventoryTitle')}
        </Text>
        {inventory.length === 0 ? (
          <Text style={[styles.emptyLine, { color: colors.textLight }]}>{t('dependent.inventoryEmpty')}</Text>
        ) : (
          inventory.map(item => (
            <Card key={item.id} variant="grey" style={{ ...styles.stockCard, borderColor: colors.border }}>
              <Text style={[styles.stockName, { color: colors.textDark }]}>{item.name}</Text>
              {Number(item.totalPills) > 0 && (
                <Text style={[styles.stockCount, { color: colors.primaryLimeDark }]}>
                  {t('dependent.inventoryDoses', { count: item.totalPills })}
                </Text>
              )}
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.l,
    paddingTop: Theme.spacing.xxl,
    paddingBottom: Theme.spacing.m,
    borderBottomWidth: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.s,
  },
  iconBtn: {
    padding: Theme.spacing.s,
    borderRadius: Theme.borderRadius.round,
  },
  headerClock: {
    flex: 1,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  logoutBtn: {
    padding: Theme.spacing.s,
    borderRadius: Theme.borderRadius.round,
  },
  scrollContent: {
    padding: Theme.spacing.l,
    paddingBottom: Theme.spacing.xxl,
  },
  moodWrap: {
    borderRadius: Theme.borderRadius.large,
    padding: Theme.spacing.l,
    marginBottom: Theme.spacing.l,
  },
  moodTitle: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: Theme.spacing.m,
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  moodFace: {
    padding: Theme.spacing.m,
  },
  moodEmoji: {
    fontSize: 56,
  },
  moodThanks: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  clockContainer: {
    alignItems: 'center',
    marginBottom: Theme.spacing.m,
  },
  clock: {
    fontSize: 72,
    fontWeight: '900',
    letterSpacing: -2,
  },
  mainActionCard: {
    borderRadius: Theme.borderRadius.xlarge,
    padding: Theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    marginBottom: Theme.spacing.l,
  },
  mainActionIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.m,
  },
  mainActionText: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 32,
  },
  mainActionSub: {
    marginTop: Theme.spacing.m,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  mainPassive: {
    borderRadius: Theme.borderRadius.xlarge,
    padding: Theme.spacing.xl,
    alignItems: 'center',
    marginBottom: Theme.spacing.l,
    gap: Theme.spacing.s,
  },
  mainPassiveText: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 32,
  },
  mainPassiveHint: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  mainDone: {
    borderRadius: Theme.borderRadius.xlarge,
    padding: Theme.spacing.xl,
    alignItems: 'center',
    marginBottom: Theme.spacing.l,
    gap: Theme.spacing.m,
  },
  mainDoneText: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 32,
  },
  pressedCard: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  sosCard: {
    flexDirection: 'row',
    borderRadius: Theme.borderRadius.large,
    padding: Theme.spacing.l,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.xl,
    gap: Theme.spacing.s,
  },
  sosText: {
    fontSize: 26,
    fontWeight: 'bold',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.s,
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: '800',
  },
  emptyLine: {
    fontSize: 20,
    marginBottom: Theme.spacing.m,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.m,
    marginBottom: Theme.spacing.m,
    borderRadius: Theme.borderRadius.large,
    borderWidth: 1,
    gap: Theme.spacing.s,
  },
  timeBadge: {
    paddingHorizontal: Theme.spacing.s,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.small,
    minWidth: 72,
    alignItems: 'center',
  },
  activityTime: {
    fontSize: 20,
    fontWeight: '800',
  },
  activityName: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
  },
  calendarCta: {
    marginTop: Theme.spacing.m,
    marginBottom: Theme.spacing.l,
    borderRadius: Theme.borderRadius.large,
    paddingVertical: Theme.spacing.m,
    paddingHorizontal: Theme.spacing.l,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.m,
    borderWidth: 1,
  },
  calendarCtaText: {
    fontSize: 24,
    fontWeight: '900',
  },
  stockCard: {
    padding: Theme.spacing.m,
    marginBottom: Theme.spacing.s,
    borderWidth: 1,
    borderRadius: Theme.borderRadius.large,
  },
  stockName: {
    fontSize: 22,
    fontWeight: '800',
  },
  stockCount: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: Theme.spacing.xs,
  },
});
