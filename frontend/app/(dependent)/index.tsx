import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Alert,
} from 'react-native';
import { Theme } from '../../constants/theme';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { scheduleAPI, usersAPI } from '../../services/api';
import { useMeds } from '../../context/MedsContext';
import { useDependentDisplay } from '../../context/DependentDisplayContext';
import { format } from 'date-fns';
import {
  computeDependentMainScheduleState,
  computeMoodScheduleState,
  DEFAULT_MOOD_CHECK_TIMES,
} from '../../utils/dependentScheduleUi';
import {
  getCompletedScheduleIdsForDate,
  markScheduleCompletedForDate,
} from '../../services/seniorScheduleCompletion';
import {
  getCompletedMoodSlotsForDate,
  markMoodSlotCompletedForDate,
} from '../../services/seniorMoodCompletion';
import { SeniorConfirmModal } from '../../components/SeniorConfirmModal';
import { MoodPickerModal } from '../../components/MoodPickerModal';
import { useFocusEffect } from '@react-navigation/native';

const TILE_COLORS = {
  medActive: '#2E7D32',
  medInactive: '#B0BEC5',
  moodActive: '#F9A825',
  moodInactive: '#CFD8DC',
  schedule: '#456882',
  sos: '#D32F2F',
};

export default function DependentDashboard() {
  const { logout } = useAuth();
  const { colors } = useDependentDisplay();
  const { schedules, treatments, depletionAlerts, refetchFromServer } = useMeds();
  const [now, setNow] = useState(() => new Date());
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [completedMoodSlots, setCompletedMoodSlots] = useState<Set<string>>(new Set());
  const [seniorName, setSeniorName] = useState('Senior');
  const [moodEnabled, setMoodEnabled] = useState(true);

  const [medConfirmVisible, setMedConfirmVisible] = useState(false);
  const [sosConfirmVisible, setSosConfirmVisible] = useState(false);
  const [moodPickerVisible, setMoodPickerVisible] = useState(false);

  const todayStr = format(now, 'yyyy-MM-dd');

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const loadCompleted = useCallback(async () => {
    const [ids, moodSlots] = await Promise.all([
      getCompletedScheduleIdsForDate(todayStr),
      getCompletedMoodSlotsForDate(todayStr),
    ]);
    setCompletedIds(new Set(ids));
    setCompletedMoodSlots(new Set(moodSlots));
  }, [todayStr]);

  useFocusEffect(
    useCallback(() => {
      void refetchFromServer();
      void loadCompleted();
      usersAPI
        .getMe()
        .then(me => {
          if (me?.name?.trim()) setSeniorName(me.name.trim());
          else if (me?.email) setSeniorName(me.email);
          if (me && typeof me.moodEnabled === 'boolean') setMoodEnabled(me.moodEnabled);
        })
        .catch(() => {});
    }, [refetchFromServer, loadCompleted]),
  );

  const mainState = useMemo(
    () => computeDependentMainScheduleState(schedules, treatments, completedIds, now),
    [schedules, treatments, completedIds, now],
  );

  const moodState = useMemo(
    () =>
      moodEnabled
        ? computeMoodScheduleState(DEFAULT_MOOD_CHECK_TIMES, completedMoodSlots, now)
        : { kind: 'disabled' as const },
    [moodEnabled, completedMoodSlots, now],
  );

  const lowMedWarning = useMemo(() => {
    const todayAlerts = depletionAlerts.filter(a => a.date === todayStr);
    if (todayAlerts.length > 0) {
      return `Kończy się lek: ${todayAlerts.map(a => a.inventoryItemName).join(', ')}`;
    }
    const upcoming = depletionAlerts
      .filter(a => a.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (upcoming.length > 0) {
      return `Wkrótce skończy się: ${upcoming[0].inventoryItemName}`;
    }
    return null;
  }, [depletionAlerts, todayStr]);

  const handleLogout = async () => {
    await logout();
    if (Platform.OS === 'web') {
      window.location.href = '/login';
    } else {
      router.replace('/login');
    }
  };

  const onMedPress = () => {
    if (mainState.kind !== 'due') return;
    setMedConfirmVisible(true);
  };

  const confirmMed = async () => {
    if (mainState.kind !== 'due') return;
    setMedConfirmVisible(false);
    try {
      await scheduleAPI.markTaken(mainState.scheduleId);
      await markScheduleCompletedForDate(todayStr, mainState.scheduleId);
      await loadCompleted();
    } catch {
      Alert.alert('Błąd', 'Nie udało się zapisać. Spróbuj ponownie.');
    }
  };

  const onMoodPress = () => {
    if (moodState.kind !== 'active') return;
    setMoodPickerVisible(true);
  };

  const onMoodPick = async (mood: 'sad' | 'neutral' | 'happy') => {
    setMoodPickerVisible(false);
    if (moodState.kind !== 'active') return;
    try {
      await usersAPI.updateMood(mood);
      await markMoodSlotCompletedForDate(todayStr, moodState.slotTime);
      await loadCompleted();
    } catch {
      Alert.alert('Błąd', 'Nie udało się zapisać nastroju.');
    }
  };

  const onSosConfirm = () => {
    setSosConfirmVisible(false);
    Alert.alert('SOS', 'Powiadomienie do opiekuna zostanie wysłane w kolejnej wersji aplikacji.');
  };

  const medActive = mainState.kind === 'due';
  const moodActive = moodState.kind === 'active';

  const medTitle = medActive ? 'WEŹ LEK' : 'Leki';
  const medLine1 =
    mainState.kind === 'due'
      ? mainState.name
      : mainState.kind === 'upcoming'
        ? `O ${mainState.nextTime}`
        : mainState.kind === 'all_done'
          ? 'Wszystko na dziś'
          : 'Brak planu';
  const medLine2 =
    mainState.kind === 'due'
      ? mainState.dose
      : mainState.kind === 'upcoming'
        ? `${mainState.nextName} · ${mainState.dose}`
        : '';

  const moodTitle = moodActive ? 'ZAZNACZ HUMOR' : 'Humor';
  const moodLine1 =
    moodState.kind === 'active'
      ? 'Dotknij i wybierz buzię'
      : moodState.kind === 'inactive'
        ? `Następny o ${moodState.nextTime}`
        : moodEnabled
          ? 'Na dziś zrobione'
          : 'Wyłączone';

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceGrey }]}>
      <View style={[styles.header, { backgroundColor: colors.surfaceWhite, borderBottomColor: colors.border }]}>
        <View style={styles.headerCenter}>
          <Text style={[styles.seniorName, { color: colors.textDark }]}>{seniorName}</Text>
          {lowMedWarning ? (
            <Text style={styles.lowMedWarning}>{lowMedWarning}</Text>
          ) : null}
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => router.push('/(dependent)/settings' as any)}
            style={[styles.iconBtn, { backgroundColor: colors.primaryLime }]}
          >
            <MaterialIcons name="settings" size={28} color={colors.primaryLimeDark} />
          </Pressable>
          <Pressable
            onPress={handleLogout}
            style={[styles.iconBtn, { backgroundColor: colors.surfaceSoftOrange }]}
          >
            <MaterialIcons name="logout" size={28} color={colors.accentOrange} />
          </Pressable>
        </View>
      </View>

      <View style={styles.grid}>
        <Pressable
          onPress={onMedPress}
          disabled={!medActive}
          style={({ pressed }) => [
            styles.tile,
            {
              backgroundColor: medActive ? TILE_COLORS.medActive : TILE_COLORS.medInactive,
              borderColor: medActive ? '#1B5E20' : '#90A4AE',
            },
            medActive && styles.tileActive,
            pressed && medActive && styles.pressed,
          ]}
        >
          <MaterialIcons
            name="medication"
            size={48}
            color={medActive ? '#FFFFFF' : '#546E7A'}
          />
          <Text style={[styles.tileTitle, { color: medActive ? '#FFFFFF' : '#37474F' }]}>
            {medTitle}
          </Text>
          <Text style={[styles.tileLine1, { color: medActive ? '#FFFFFF' : '#455A64' }]}>
            {medLine1}
          </Text>
          {medLine2 ? (
            <Text style={[styles.tileLine2, { color: medActive ? '#E8F5E9' : '#607D8B' }]}>
              {medLine2}
            </Text>
          ) : null}
        </Pressable>

        <Pressable
          onPress={onMoodPress}
          disabled={!moodActive}
          style={({ pressed }) => [
            styles.tile,
            {
              backgroundColor: moodActive ? TILE_COLORS.moodActive : TILE_COLORS.moodInactive,
              borderColor: moodActive ? '#F57F17' : '#90A4AE',
            },
            moodActive && styles.tileActive,
            pressed && moodActive && styles.pressed,
          ]}
        >
          <Text style={styles.moodIcon}>{moodActive ? '😊' : '😐'}</Text>
          <Text style={[styles.tileTitle, { color: moodActive ? '#3E2723' : '#546E7A' }]}>
            {moodTitle}
          </Text>
          <Text style={[styles.tileLine1, { color: moodActive ? '#3E2723' : '#607D8B' }]}>
            {moodLine1}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/(dependent)/calendar' as any)}
          style={({ pressed }) => [
            styles.tile,
            { backgroundColor: TILE_COLORS.schedule, borderColor: '#1B3C53' },
            pressed && styles.pressed,
          ]}
        >
          <MaterialIcons name="calendar-month" size={48} color="#FFFFFF" />
          <Text style={[styles.tileTitle, { color: '#FFFFFF' }]}>Harmonogram</Text>
          <Text style={[styles.tileLine1, { color: '#E3F2FD' }]}>Plan leków</Text>
        </Pressable>

        <Pressable
          onPress={() => setSosConfirmVisible(true)}
          style={({ pressed }) => [
            styles.tile,
            { backgroundColor: TILE_COLORS.sos, borderColor: '#B71C1C' },
            pressed && styles.pressed,
          ]}
        >
          <MaterialIcons name="emergency" size={48} color="#FFFFFF" />
          <Text style={[styles.tileTitle, { color: '#FFFFFF' }]}>SOS</Text>
          <Text style={[styles.tileLine1, { color: '#FFEBEE' }]}>Wezwij pomoc</Text>
        </Pressable>
      </View>

      <SeniorConfirmModal
        visible={medConfirmVisible}
        title="Potwierdzenie"
        message={
          mainState.kind === 'due'
            ? `Czy potwierdzasz wzięcie leku ${mainState.name} (${mainState.dose})?`
            : 'Czy potwierdzasz wzięcie leku?'
        }
        onConfirm={() => void confirmMed()}
        onCancel={() => setMedConfirmVisible(false)}
        confirmColor={TILE_COLORS.medActive}
      />

      <SeniorConfirmModal
        visible={sosConfirmVisible}
        title="SOS"
        message="Czy na pewno chcesz wysłać pomoc do opiekuna?"
        onConfirm={onSosConfirm}
        onCancel={() => setSosConfirmVisible(false)}
        confirmColor={TILE_COLORS.sos}
      />

      <MoodPickerModal
        visible={moodPickerVisible}
        onPick={mood => void onMoodPick(mood)}
        onClose={() => setMoodPickerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.l,
    paddingTop: Theme.spacing.xxl,
    paddingBottom: Theme.spacing.m,
    borderBottomWidth: 2,
  },
  headerCenter: {
    flex: 1,
    paddingRight: Theme.spacing.m,
  },
  seniorName: {
    fontSize: 32,
    fontWeight: '900',
  },
  lowMedWarning: {
    fontSize: 15,
    fontWeight: '700',
    color: '#D32F2F',
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Theme.spacing.s,
  },
  iconBtn: {
    padding: Theme.spacing.s,
    borderRadius: Theme.borderRadius.round,
  },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: Theme.spacing.m,
    gap: Theme.spacing.m,
    alignContent: 'center',
    justifyContent: 'center',
  },
  tile: {
    width: '47%',
    minHeight: 200,
    borderRadius: Theme.borderRadius.xlarge,
    borderWidth: 3,
    padding: Theme.spacing.l,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Theme.spacing.xs,
  },
  tileActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  tileTitle: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: Theme.spacing.xs,
  },
  tileLine1: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 22,
  },
  tileLine2: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  moodIcon: {
    fontSize: 48,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.92,
  },
});
