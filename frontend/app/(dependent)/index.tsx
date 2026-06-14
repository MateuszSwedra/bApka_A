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
import { useTranslation } from 'react-i18next';
import {
  computeDependentMainScheduleState,
  computeMoodScheduleState,
} from '../../utils/dependentScheduleUi';
import { normalizeMoodCheckTimes } from '../../utils/moodCheckTimes';
import {
  getCompletedScheduleIdsForDate,
  markScheduleCompletedForDate,
} from '../../services/seniorScheduleCompletion';
import { mergeDoseLogsIntoCompletionSets } from '../../utils/doseLogDay';
import {
  getCompletedMoodSlotsForDate,
  markMoodSlotCompletedForDate,
} from '../../services/seniorMoodCompletion';
import { SeniorConfirmModal } from '../../components/SeniorConfirmModal';
import { MoodPickerModal } from '../../components/MoodPickerModal';
import { VitalsMetricModal } from '../../components/senior/VitalsMetricModal';
import { MoodIcon } from '../../components/mood/MoodIcon';
import { useFocusEffect } from '@react-navigation/native';
import { treatmentTypeForSchedule } from '../../utils/scheduleTreatmentType';
import { seniorActionTileContent } from '../../utils/seniorActionTile';
import {
  DEV_PREVIEW_SENIOR_NAME,
  isSeniorPreviewActive,
} from '../../constants/devSeniorPreview';

const DEFAULT_TILE_COLORS = {
  medActive: '#2E7D32',
  medInactive: '#B0BEC5',
  moodActive: '#F9A825',
  moodInactive: '#CFD8DC',
  schedule: '#456882',
  sos: '#D32F2F',
};

export default function DependentDashboard() {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const { colors, colorBlindFriendly, highContrast, reload } = useDependentDisplay();
  const { schedules, treatments, refetchFromServer } = useMeds();
  const [now, setNow] = useState(() => new Date());
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [completedMoodSlots, setCompletedMoodSlots] = useState<Set<string>>(new Set());
  const previewMode = isSeniorPreviewActive();
  const [seniorName, setSeniorName] = useState(
    previewMode ? DEV_PREVIEW_SENIOR_NAME : t('dependent.nameFallback'),
  );
  const [moodEnabled, setMoodEnabled] = useState(true);
  const [moodCheckTimes, setMoodCheckTimes] = useState<string[]>(normalizeMoodCheckTimes(undefined));
  const [vitalsEntryEnabled, setVitalsEntryEnabled] = useState(false);

  const [medConfirmVisible, setMedConfirmVisible] = useState(false);
  const [sosConfirmVisible, setSosConfirmVisible] = useState(false);
  const [moodPickerVisible, setMoodPickerVisible] = useState(false);
  const [vitalsModalVisible, setVitalsModalVisible] = useState(false);
  const [vitalsModalType, setVitalsModalType] = useState<'BP' | 'GLUCOSE'>('BP');

  const todayStr = format(now, 'yyyy-MM-dd');

  const tileColors = useMemo(() => {
    if (colorBlindFriendly || highContrast) {
      return {
        medActive: colors.primaryLimeDark,
        medInactive: '#94A3B8',
        moodActive: colors.accentOrange,
        moodInactive: '#CBD5E1',
        schedule: colors.primaryLimeDark,
        sos: '#B91C1C',
      };
    }
    return DEFAULT_TILE_COLORS;
  }, [colorBlindFriendly, highContrast, colors]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const loadCompleted = useCallback(async () => {
    const [ids, moodSlots] = await Promise.all([
      getCompletedScheduleIdsForDate(todayStr),
      getCompletedMoodSlotsForDate(todayStr),
    ]);
    const completed = new Set(ids);
    const missed = new Set<string>();
    if (!previewMode) {
      try {
        const me = await usersAPI.getMe();
        if (me?.id) {
          const logs = await scheduleAPI.getTodayLogs(me.id, todayStr);
          mergeDoseLogsIntoCompletionSets(logs, todayStr, completed, missed);
        }
      } catch {
        /* offline - zostaje lokalny stan */
      }
    }
    setCompletedIds(completed);
    setCompletedMoodSlots(new Set(moodSlots));
  }, [todayStr, previewMode]);

  useFocusEffect(
    useCallback(() => {
      void refetchFromServer();
      void loadCompleted();
      void reload();
      if (previewMode) {
        setSeniorName(DEV_PREVIEW_SENIOR_NAME);
        setMoodEnabled(true);
        setVitalsEntryEnabled(true);
        return;
      }
      usersAPI
        .getMe()
        .then(me => {
          if (me?.name?.trim()) setSeniorName(me.name.trim());
          else if (me?.email) setSeniorName(me.email);
          if (me && typeof me.moodEnabled === 'boolean') setMoodEnabled(me.moodEnabled);
          setMoodCheckTimes(normalizeMoodCheckTimes(me?.moodCheckTimes));
          if (me && typeof me.vitalsEntryEnabled === 'boolean') setVitalsEntryEnabled(me.vitalsEntryEnabled);
          void applySeniorProfileSettings(me ?? {});
        })
        .catch(() => {});
    }, [refetchFromServer, loadCompleted, reload, previewMode]),
  );

  const mainState = useMemo(
    () => computeDependentMainScheduleState(schedules, treatments, completedIds, now),
    [schedules, treatments, completedIds, now],
  );

  const moodState = useMemo(
    () =>
      moodEnabled
        ? computeMoodScheduleState(moodCheckTimes, completedMoodSlots, now)
        : { kind: 'disabled' as const },
    [moodEnabled, moodCheckTimes, completedMoodSlots, now],
  );

  const lowStockMeds = useMemo(
    () =>
      treatments.filter(
        t =>
          t.type === 'MEDICATION' &&
          (t.currentPills ?? t.totalPills ?? 999) <= 10,
      ),
    [treatments],
  );

  const lowMedWarning = useMemo(() => {
    if (lowStockMeds.length > 0) {
      return t('dependent.home.lowMedToday', {
        names: lowStockMeds.map(a => a.name).join(', '),
      });
    }
    return null;
  }, [lowStockMeds, t]);

  const handleLogout = async () => {
    await logout();
    if (Platform.OS === 'web') {
      window.location.href = '/login';
    } else {
      router.replace('/login');
    }
  };

  const onMedPress = () => {
    if (mainState.kind !== 'due' && mainState.kind !== 'missed') return;
    setMedConfirmVisible(true);
  };

  const maybeShowVitalsForm = (scheduleId: string) => {
    if (!vitalsEntryEnabled) return;
    const activityType = treatmentTypeForSchedule(scheduleId, schedules, treatments);
    if (activityType === 'BLOOD_PRESSURE') {
      setVitalsModalType('BP');
      setVitalsModalVisible(true);
    } else if (activityType === 'BLOOD_SUGAR') {
      setVitalsModalType('GLUCOSE');
      setVitalsModalVisible(true);
    }
  };

  const confirmMed = async () => {
    if (mainState.kind !== 'due' && mainState.kind !== 'missed') return;
    const scheduleId = mainState.scheduleId;
    setMedConfirmVisible(false);
    try {
      if (!previewMode) {
        await scheduleAPI.markTaken(scheduleId);
      }
      await markScheduleCompletedForDate(todayStr, scheduleId);
      await refetchFromServer();
      await loadCompleted();
      maybeShowVitalsForm(scheduleId);
    } catch {
      Alert.alert(t('common.error'), t('dependent.errorMarkTaken'));
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
      if (!previewMode) {
        await usersAPI.updateMood(mood);
      }
      await markMoodSlotCompletedForDate(todayStr, moodState.slotTime);
      await loadCompleted();
    } catch {
      Alert.alert(t('common.error'), t('dependent.home.moodSaveError'));
    }
  };

  const onSosConfirm = async () => {
    setSosConfirmVisible(false);
    try {
      if (!previewMode) {
        await usersAPI.createSos();
      }
      Alert.alert(t('dependent.sosTitle'), t('dependent.sosSent'));
    } catch {
      Alert.alert(t('common.error'), t('dependent.sosError'));
    }
  };

  const medActive = mainState.kind === 'due' || mainState.kind === 'missed';
  const moodActive = moodState.kind === 'active';

  const actionTile = useMemo(
    () => seniorActionTileContent(mainState, schedules, treatments, t),
    [mainState, schedules, treatments, t],
  );

  const medTitle = medActive
    ? actionTile.title
    : actionTile.idleTitle;
  const medLine1 =
    mainState.kind === 'due' || mainState.kind === 'missed'
      ? mainState.name
      : mainState.kind === 'upcoming'
        ? t('dependent.home.medAt', { time: mainState.nextTime })
        : mainState.kind === 'all_done'
          ? t('dependent.mainAllDone')
          : t('dependent.home.medNoPlan');
  const medLine2 =
    mainState.kind === 'due' || mainState.kind === 'missed'
      ? mainState.dose
      : mainState.kind === 'upcoming'
        ? `${mainState.nextName} · ${mainState.dose}`
        : '';

  const moodCheckTime = moodCheckTimes[0] ?? '08:00';

  const moodTitle = moodActive ? t('dependent.home.moodDue') : t('dependent.home.moodIdle');
  const moodLine1 =
    moodState.kind === 'active'
      ? t('dependent.home.moodTap')
      : moodState.kind === 'inactive'
        ? t('dependent.home.moodNext', { time: moodCheckTime })
        : moodEnabled
          ? t('dependent.home.moodDone')
          : t('dependent.home.moodDisabled');
  const moodLine2 =
    moodEnabled && moodState.kind === 'active' ? moodCheckTime : null;

  const medConfirmMessage =
    mainState.kind === 'due' || mainState.kind === 'missed'
      ? t('dependent.home.confirmMed', { name: mainState.name, dose: mainState.dose })
      : t('dependent.home.confirmMedGeneric');

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceGrey }]}>
      {previewMode ? (
        <View style={[styles.previewBanner, { backgroundColor: colors.accentOrange }]}>
          <MaterialIcons name="visibility" size={20} color="#fff" />
          <Text style={styles.previewBannerText}>Podgląd UI - dane demo, bez API</Text>
        </View>
      ) : null}
      <View style={[styles.header, { backgroundColor: colors.surfaceWhite, borderBottomColor: colors.border }]}>
        <View style={styles.headerCenter}>
          <Text style={[styles.seniorName, { color: colors.textDark }]}>{seniorName}</Text>
          {lowMedWarning ? (
            <Text style={[styles.lowMedWarning, { color: colors.accentOrange }]}>{lowMedWarning}</Text>
          ) : null}
          {lowStockMeds.length > 0 ? (
            <View style={styles.stockMarginRow}>
              {lowStockMeds.map(med => (
                <Text
                  key={med.id}
                  style={[styles.stockMarginBadge, { color: colors.accentOrange, borderColor: colors.accentOrange }]}
                >
                  {med.currentPills ?? med.totalPills ?? 0}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={handleLogout}
            style={[styles.iconBtn, { backgroundColor: colors.surfaceSoftOrange }]}
            accessibilityLabel={t('auth.signIn.ctaLogin')}
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
            !moodEnabled && styles.tileFullWidth,
            {
              backgroundColor: medActive ? actionTile.accent : tileColors.medInactive,
              borderColor: medActive
                ? colorBlindFriendly || highContrast
                  ? colors.border
                  : actionTile.accent
                : '#90A4AE',
              borderWidth: colors.mainButtonBorderWidth ?? 3,
            },
            medActive && styles.tileActive,
            pressed && medActive && styles.pressed,
          ]}
        >
          <MaterialIcons
            name={actionTile.icon}
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

        {moodEnabled ? (
          <Pressable
            onPress={onMoodPress}
            disabled={!moodActive}
            style={({ pressed }) => [
              styles.tile,
              {
                backgroundColor: moodActive ? tileColors.moodActive : tileColors.moodInactive,
                borderColor: moodActive
                  ? colorBlindFriendly || highContrast
                    ? colors.moodBorder ?? colors.border
                    : '#F57F17'
                  : '#90A4AE',
                borderWidth: colors.mainButtonBorderWidth ?? 3,
              },
              moodActive && styles.tileActive,
              pressed && moodActive && styles.pressed,
            ]}
          >
            <MoodIcon mood={moodActive ? 'happy' : 'neutral'} size="lg" selected={moodActive} />
            <Text style={[styles.tileTitle, { color: moodActive ? '#3E2723' : '#546E7A' }]}>
              {moodTitle}
            </Text>
            <Text style={[styles.tileLine1, { color: moodActive ? '#3E2723' : '#607D8B' }]}>
              {moodLine1}
            </Text>
            {moodLine2 ? (
              <Text style={[styles.tileLine2, { color: moodActive ? '#3E2723' : '#607D8B' }]}>
                {moodLine2}
              </Text>
            ) : null}
          </Pressable>
        ) : null}

        <Pressable
          onPress={() => router.push('/(dependent)/calendar' as any)}
          style={({ pressed }) => [
            styles.tile,
            { backgroundColor: tileColors.schedule, borderColor: colors.border, borderWidth: colors.mainButtonBorderWidth ?? 3 },
            pressed && styles.pressed,
          ]}
        >
          <MaterialIcons name="calendar-month" size={48} color="#FFFFFF" />
          <Text style={[styles.tileTitle, { color: '#FFFFFF' }]}>{t('dependent.home.schedule')}</Text>
          <Text style={[styles.tileLine1, { color: '#E3F2FD' }]}>{t('dependent.home.scheduleSub')}</Text>
        </Pressable>

        <Pressable
          onPress={() => setSosConfirmVisible(true)}
          style={({ pressed }) => [
            styles.tile,
            { backgroundColor: tileColors.sos, borderColor: colors.border, borderWidth: colors.mainButtonBorderWidth ?? 3 },
            pressed && styles.pressed,
          ]}
        >
          <MaterialIcons name="emergency" size={48} color="#FFFFFF" />
          <Text style={[styles.tileTitle, { color: '#FFFFFF' }]}>{t('dependent.sosTitle')}</Text>
          <Text style={[styles.tileLine1, { color: '#FFEBEE' }]}>{t('dependent.home.sosSub')}</Text>
        </Pressable>
      </View>

      <SeniorConfirmModal
        visible={medConfirmVisible}
        title={t('dependent.home.confirmTitle')}
        message={medConfirmMessage}
        onConfirm={() => void confirmMed()}
        onCancel={() => setMedConfirmVisible(false)}
        confirmColor={tileColors.medActive}
      />

      <SeniorConfirmModal
        visible={sosConfirmVisible}
        title={t('dependent.sosTitle')}
        message={t('dependent.home.sosConfirm')}
        onConfirm={onSosConfirm}
        onCancel={() => setSosConfirmVisible(false)}
        confirmColor={tileColors.sos}
      />

      <MoodPickerModal
        visible={moodPickerVisible}
        onPick={mood => void onMoodPick(mood)}
        onClose={() => setMoodPickerVisible(false)}
      />

      <VitalsMetricModal
        visible={vitalsModalVisible}
        type={vitalsModalType}
        colors={colors}
        offlinePreview={previewMode}
        onClose={() => setVitalsModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  previewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: Theme.spacing.m,
  },
  previewBannerText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
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
    marginTop: 4,
  },
  stockMarginRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
    justifyContent: 'flex-end',
  },
  stockMarginBadge: {
    fontSize: 16,
    fontWeight: '900',
    borderWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 32,
    textAlign: 'center',
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
    padding: Theme.spacing.l,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Theme.spacing.xs,
    overflow: 'hidden',
  },
  tileFullWidth: {
    width: '100%',
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
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.92,
  },
});
