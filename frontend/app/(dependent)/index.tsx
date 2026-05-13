<<<<<<< HEAD
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { Theme } from '../../constants/theme';
import { router } from 'expo-router';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { format, isBefore, isSameDay } from 'date-fns';
import { useMeds } from '../../context/MedsContext';

export default function DependentDashboard() {
  const [moodState, setMoodState] = useState<'ask' | 'thank' | 'hidden'>('ask');
  const [currentTime, setCurrentTime] = useState(format(new Date(), 'HH:mm'));
=======
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
import { scheduleAPI } from '../../services/api';
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

export default function DependentDashboard() {
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

  useFocusEffect(
    useCallback(() => {
      void refetchFromServer();
      void loadCompleted();
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
>>>>>>> 9d58b9ae387549f7767c97bdc0516e0e4371b185

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(format(new Date(), 'HH:mm'));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const handleMoodSelect = () => {
    setMoodState('thank');
    setTimeout(() => setMoodState('hidden'), 2500);
  };

<<<<<<< HEAD
  const { schedules, treatments, inventory } = useMeds();
  const [takenIds, setTakenIds] = useState<Set<string>>(new Set());

  const getIsoDay = (date: Date) => {
    const d = date.getDay();
    return d === 0 ? 7 : d;
  };

  const todaySchedules = schedules.filter(sch => {
    if (sch.type === 'ONCE') {
      return sch.startDate === format(new Date(), 'yyyy-MM-dd');
    }
    const now = new Date();
    const currentIsoDay = getIsoDay(now);
    if (!sch.daysOfWeek.includes(currentIsoDay)) return false;
    
    const isAfterOrOnStart = !isBefore(now, new Date(sch.startDate)) || isSameDay(now, new Date(sch.startDate));
    let isBeforeOrOnEnd = true;
    if (sch.type === 'TEMPORARY' && sch.endDate) {
      isBeforeOrOnEnd = !isBefore(new Date(sch.endDate), now) || isSameDay(now, new Date(sch.endDate));
    }
    return isAfterOrOnStart && isBeforeOrOnEnd;
  });

  const activities = todaySchedules.map(sch => {
    const treatment = treatments.find(t => t.id === sch.treatmentId || t.id === sch.inventoryId);
    return {
      id: sch.id,
      time: sch.time,
      name: treatment?.name || sch.customName || 'Nieznana aktywność',
      taken: takenIds.has(sch.id),
    };
  }).sort((a, b) => a.time.localeCompare(b.time));

  const medsLeft = inventory.map(inv => ({
    id: inv.id,
    name: inv.name,
    amount: inv.totalPills,
    unit: 'szt.'
  }));

  const nextActivity = activities.find(a => !a.taken);
  
  let buttonState: 'active' | 'inactive' | 'done' = 'done';
  if (nextActivity) {
    if (nextActivity.time <= currentTime) {
      buttonState = 'active';
    } else {
      buttonState = 'inactive';
    }
  }

  const handleMainAction = () => {
    if (buttonState === 'active' && nextActivity) {
      setTakenIds(prev => new Set(prev).add(nextActivity.id));
    }
  };

  const handleSOS = () => {
    Alert.alert("SOS", "Kliknięto guzik SOS. (Powiadomienie dla opiekuna w przygotowaniu)");
=======
  const onMainAction = async () => {
    if (mainState.kind !== 'due') return;
    try {
      await scheduleAPI.markTaken(mainState.scheduleId);
      await markScheduleCompletedForDate(todayStr, mainState.scheduleId);
      await loadCompleted();
      setHighlightMood(true);
      setMoodPhase('pick');
    } catch {
      Alert.alert('Error', 'Could not record this on the server. Please try again.');
    }
  };

  const onMoodPick = () => {
    setMoodPhase('thanks');
    setTimeout(() => {
      setMoodPhase('hidden');
      setHighlightMood(false);
    }, 3500);
>>>>>>> 9d58b9ae387549f7767c97bdc0516e0e4371b185
  };

  const onSos = () => {
    Alert.alert(
      'SOS',
      'You tapped the SOS button. No notification was sent to your carer in this version.',
    );
  };

  const borderMain = colors.mainButtonBorderWidth ?? 0;

  return (
<<<<<<< HEAD
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Panel Seniora</Text>
        <Pressable onPress={() => router.push('/(dependent)/settings')} style={styles.iconBtn}>
          <MaterialIcons name="settings" size={36} color={Theme.colors.primaryLimeDark} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* 1. Mood Button */}
        {moodState !== 'hidden' && (
          <View style={styles.moodContainer}>
            {moodState === 'ask' ? (
              <>
                <Text style={styles.moodTitle}>Jak się dzisiaj czujesz?</Text>
                <View style={styles.moodEmojis}>
                  <Pressable onPress={handleMoodSelect} style={styles.emojiBtn}>
                    <FontAwesome5 name="smile" size={48} color={Theme.colors.success} />
                  </Pressable>
                  <Pressable onPress={handleMoodSelect} style={styles.emojiBtn}>
                    <FontAwesome5 name="meh" size={48} color={Theme.colors.accentOrange} />
                  </Pressable>
                  <Pressable onPress={handleMoodSelect} style={styles.emojiBtn}>
                    <FontAwesome5 name="frown" size={48} color="#D32F2F" />
                  </Pressable>
                </View>
              </>
            ) : (
              <Text style={styles.moodThanks}>Dziękuję za informacje!</Text>
=======
    <View style={[styles.container, { backgroundColor: colors.surfaceGrey }]}>
      <View style={[styles.header, { backgroundColor: colors.surfaceWhite, borderBottomColor: colors.border }]}>
        <View style={styles.greeting}>
          <Text style={[styles.greetingText, { color: colors.textLight }]}>Good day,</Text>
          <Text style={[styles.nameText, { color: colors.textDark }]}>dear senior</Text>
        </View>
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
        {moodPhase !== 'hidden' && (
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
                  How do you feel today?
                </Text>
                <View style={styles.moodRow}>
                  <Pressable
                    onPress={onMoodPick}
                    style={({ pressed }) => [styles.moodFace, pressed && { opacity: 0.85 }]}
                  >
                    <Text style={styles.moodEmoji}>🙁</Text>
                  </Pressable>
                  <Pressable
                    onPress={onMoodPick}
                    style={({ pressed }) => [styles.moodFace, pressed && { opacity: 0.85 }]}
                  >
                    <Text style={styles.moodEmoji}>😐</Text>
                  </Pressable>
                  <Pressable
                    onPress={onMoodPick}
                    style={({ pressed }) => [styles.moodFace, pressed && { opacity: 0.85 }]}
                  >
                    <Text style={styles.moodEmoji}>🙂</Text>
                  </Pressable>
                </View>
              </>
            )}
            {moodPhase === 'thanks' && (
              <Text style={[styles.moodThanks, { color: colors.textDark }]}>
                Thank you for letting us know.
              </Text>
>>>>>>> 9d58b9ae387549f7767c97bdc0516e0e4371b185
            )}
          </View>
        )}

<<<<<<< HEAD
        {/* 2. Main Button */}
        <View style={styles.mainButtonWrapper}>
          {buttonState === 'active' && nextActivity && (
            <Pressable style={[styles.mainBtn, styles.mainBtnActive]} onPress={handleMainAction}>
              <MaterialIcons name="touch-app" size={64} color={Theme.colors.surfaceWhite} />
              <Text style={styles.mainBtnText}>Weź lek lub zrób ćwiczenia</Text>
              <Text style={styles.mainBtnSubText}>{nextActivity.name}</Text>
            </Pressable>
          )}

          {buttonState === 'inactive' && nextActivity && (
            <View style={[styles.mainBtn, styles.mainBtnInactive]}>
              <MaterialIcons name="schedule" size={64} color={Theme.colors.textDark} />
              <Text style={[styles.mainBtnText, { color: Theme.colors.textDark }]}>
                Kolejna aktywność za: {nextActivity.time}
              </Text>
            </View>
          )}

          {buttonState === 'done' && (
            <View style={[styles.mainBtn, styles.mainBtnDone]}>
              <MaterialIcons name="done-all" size={64} color={Theme.colors.surfaceWhite} />
              <Text style={styles.mainBtnText}>Koniec aktywności na dzisiaj</Text>
            </View>
          )}
        </View>

        {/* 3. SOS Button */}
        <Pressable style={styles.sosBtn} onPress={handleSOS}>
          <MaterialIcons name="warning" size={40} color={Theme.colors.surfaceWhite} />
          <Text style={styles.sosText}>SOS</Text>
        </Pressable>

        {/* 4. Activities List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dzisiejsze aktywności</Text>
          {activities.map((item) => (
            <View key={item.id} style={[styles.activityItem, item.taken && styles.activityItemTaken]}>
              <Text style={styles.activityTime}>{item.time}</Text>
              <Text style={styles.activityName}>{item.name}</Text>
              <MaterialIcons
                name={item.taken ? "check-circle" : "radio-button-unchecked"}
                size={32}
                color={item.taken ? Theme.colors.success : Theme.colors.textDark}
              />
            </View>
          ))}
        </View>

        {/* 5. Calendar Button */}
        <Pressable style={styles.calendarBtn} onPress={() => router.push('/(dependent)/calendar')}>
          <MaterialIcons name="calendar-month" size={36} color={Theme.colors.textDark} />
          <Text style={styles.calendarBtnText}>Kalendarz (kolejne dni)</Text>
        </Pressable>

        {/* 6. Remaining Medications List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pozostało leków</Text>
          {medsLeft.map((med) => (
            <View key={med.id} style={styles.medItem}>
              <Text style={styles.medName}>{med.name}</Text>
              <Text style={styles.medAmount}>{med.amount} {med.unit}</Text>
            </View>
          ))}
        </View>

=======
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
              Take your medicine or do your exercises — it is time from your calendar.
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
              Next medicine or activity at: {mainState.nextTime}
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
              {"No activity is required by your carer's calendar right now."}
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
              That is all for today — no more planned activities.
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
          <Text style={[styles.sosText, { color: colors.surfaceWhite }]}>SOS</Text>
        </Pressable>

        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.textDark }]}>{"Today's activities"}</Text>
        </View>
        {todayRows.length === 0 ? (
          <Text style={[styles.emptyLine, { color: colors.textLight }]}>Nothing scheduled for today.</Text>
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
                <Text style={[styles.activityName, { color: colors.textDark }]}>{name}</Text>
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
            Open calendar — other days
          </Text>
        </Pressable>

        <Text style={[styles.sectionTitle, { color: colors.textDark, marginTop: Theme.spacing.l }]}>
          Medicine left at home
        </Text>
        {inventory.length === 0 ? (
          <Text style={[styles.emptyLine, { color: colors.textLight }]}>No packs were added yet.</Text>
        ) : (
          inventory.map(item => (
            <Card key={item.id} variant="grey" style={{ ...styles.stockCard, borderColor: colors.border }}>
              <Text style={[styles.stockName, { color: colors.textDark }]}>{item.name}</Text>
              <Text style={[styles.stockCount, { color: colors.primaryLimeDark }]}>
                {item.totalPills} dose(s) left
              </Text>
            </Card>
          ))
        )}
>>>>>>> 9d58b9ae387549f7767c97bdc0516e0e4371b185
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
  headerTitle: {
    fontSize: Theme.typography.largeTitle,
    fontWeight: 'bold',
    color: Theme.colors.textDark,
  },
  iconBtn: {
<<<<<<< HEAD
    padding: Theme.spacing.xs,
=======
    padding: Theme.spacing.s,
    borderRadius: Theme.borderRadius.round,
  },
  greeting: {
    flex: 1,
  },
  greetingText: {
    fontSize: 22,
  },
  nameText: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  logoutBtn: {
    padding: Theme.spacing.s,
    borderRadius: Theme.borderRadius.round,
>>>>>>> 9d58b9ae387549f7767c97bdc0516e0e4371b185
  },
  scrollContent: {
    padding: Theme.spacing.m,
    paddingBottom: Theme.spacing.xxl,
  },
<<<<<<< HEAD
  moodContainer: {
    backgroundColor: Theme.colors.surfaceWhite,
    borderRadius: Theme.borderRadius.large,
    padding: Theme.spacing.l,
    marginBottom: Theme.spacing.l,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  moodTitle: {
    fontSize: Theme.typography.title,
    fontWeight: 'bold',
    marginBottom: Theme.spacing.m,
    color: Theme.colors.textDark,
  },
  moodEmojis: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  emojiBtn: {
    padding: Theme.spacing.s,
  },
  moodThanks: {
    fontSize: Theme.typography.title,
    fontWeight: 'bold',
    color: Theme.colors.success,
    paddingVertical: Theme.spacing.m,
  },
  mainButtonWrapper: {
    marginBottom: Theme.spacing.l,
  },
  mainBtn: {
=======
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
>>>>>>> 9d58b9ae387549f7767c97bdc0516e0e4371b185
    borderRadius: Theme.borderRadius.xlarge,
    padding: Theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
<<<<<<< HEAD
    minHeight: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  mainBtnActive: {
    backgroundColor: Theme.colors.primaryLimeDark,
  },
  mainBtnInactive: {
    backgroundColor: '#E0E0E0',
=======
    minHeight: 200,
    marginBottom: Theme.spacing.l,
>>>>>>> 9d58b9ae387549f7767c97bdc0516e0e4371b185
  },
  mainBtnDone: {
    backgroundColor: Theme.colors.success,
  },
<<<<<<< HEAD
  mainBtnText: {
    fontSize: 26,
    fontWeight: '900',
    color: Theme.colors.surfaceWhite,
    textAlign: 'center',
    marginTop: Theme.spacing.m,
=======
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
>>>>>>> 9d58b9ae387549f7767c97bdc0516e0e4371b185
  },
  mainBtnSubText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Theme.colors.primaryLime,
    textAlign: 'center',
    marginTop: Theme.spacing.s,
  },
  sosBtn: {
    flexDirection: 'row',
<<<<<<< HEAD
    backgroundColor: '#D32F2F',
    borderRadius: Theme.borderRadius.large,
    padding: Theme.spacing.m,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.xl,
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
  sosText: {
    fontSize: 28,
    fontWeight: '900',
    color: Theme.colors.surfaceWhite,
    marginLeft: Theme.spacing.m,
  },
  section: {
    marginBottom: Theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: Theme.typography.largeTitle,
    fontWeight: 'bold',
    color: Theme.colors.textDark,
    marginBottom: Theme.spacing.m,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceWhite,
    padding: Theme.spacing.m,
    borderRadius: Theme.borderRadius.medium,
    marginBottom: Theme.spacing.s,
  },
  activityItemTaken: {
    opacity: 0.6,
  },
  activityTime: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Theme.colors.textDark,
    width: 80,
  },
  activityName: {
    flex: 1,
    fontSize: 22,
    fontWeight: '600',
    color: Theme.colors.textDark,
  },
  calendarBtn: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.primaryLime,
=======
>>>>>>> 9d58b9ae387549f7767c97bdc0516e0e4371b185
    borderRadius: Theme.borderRadius.large,
    padding: Theme.spacing.l,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.xl,
<<<<<<< HEAD
  },
  calendarBtnText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Theme.colors.textDark,
    marginLeft: Theme.spacing.s,
  },
  medItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.surfaceWhite,
    padding: Theme.spacing.m,
    borderRadius: Theme.borderRadius.medium,
    marginBottom: Theme.spacing.s,
  },
  medName: {
    fontSize: 22,
    fontWeight: '600',
    color: Theme.colors.textDark,
  },
  medAmount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Theme.colors.accentOrange,
  },
=======
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
>>>>>>> 9d58b9ae387549f7767c97bdc0516e0e4371b185
});
