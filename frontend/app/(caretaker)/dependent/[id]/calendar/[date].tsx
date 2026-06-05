import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, Pressable, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { Theme } from '../../../../../constants/theme';
import { router, useGlobalSearchParams, useLocalSearchParams, useFocusEffect, useSegments } from 'expo-router';
import { useMeds } from '../../../../../context/MedsContext';
import { pickDependentUserId } from '../../../../../utils/resolveMedsTargetUserId';
import { openAddMedForDependent } from '../../../../../utils/caretakerNavigation';
import { useFabBottomOffset } from '../../../../../utils/useFabBottomOffset';
import type { ScheduleItem } from '../../../../../context/MedsContext';
import { getScheduleTreatmentId } from '../../../../../context/MedsContext';
import { useTranslation } from 'react-i18next';
import { AndroidStyleDayView } from '../../../../../components/caretaker/AndroidStyleDayView';
import { useDependentTabTopInset } from '../../../../../utils/useDependentTabTopInset';
import {
  CALENDAR_DAY_BACKDROP_ENTER,
  CALENDAR_DAY_BACKDROP_EXIT,
  CALENDAR_DAY_ENTER,
  CALENDAR_DAY_EXIT,
} from '../../../../../utils/calendarDayTransition';

export default function DependentCalendarDayScreen() {
  const { t } = useTranslation();
  const { date: dateParam } = useLocalSearchParams<{ date: string }>();
  const localParams = useLocalSearchParams<{ id?: string }>();
  const globalParams = useGlobalSearchParams<{ id?: string }>();
  const segments = useSegments();
  const fabBottomOffset = useFabBottomOffset({ aboveTabBar: true });
  const topInset = useDependentTabTopInset();

  const dateStr = typeof dateParam === 'string' ? dateParam : Array.isArray(dateParam) ? dateParam[0] : '';

  const { depletionAlerts, schedules, treatments, refetchFromServer, targetUserId } = useMeds();

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

  useFocusEffect(
    useCallback(() => {
      if (dependentId) void refetchFromServer(dependentId);
    }, [dependentId, refetchFromServer]),
  );

  const labelForSchedule = useCallback(
    (sch: ScheduleItem) => {
      if (sch.customName) return sch.customName;
      const tid = getScheduleTreatmentId(sch);
      if (tid) return treatments.find(tr => tr.id === tid)?.name ?? t('schedule.activityFallback');
      return t('schedule.activityFallback');
    },
    [treatments, t],
  );

  if (!dateStr) {
    router.back();
    return null;
  }

  return (
    <View style={styles.root}>
      <Animated.View
        entering={CALENDAR_DAY_BACKDROP_ENTER}
        exiting={CALENDAR_DAY_BACKDROP_EXIT}
        style={styles.backdrop}
        pointerEvents="none"
      />
      <Animated.View
        entering={CALENDAR_DAY_ENTER}
        exiting={CALENDAR_DAY_EXIT}
        style={styles.container}
      >
        <View style={[styles.dayWrap, { paddingTop: topInset }]}>
          <AndroidStyleDayView
            dateStr={dateStr}
            onBack={() => router.back()}
            schedules={schedules}
            treatments={treatments}
            depletionAlerts={depletionAlerts}
            labelForSchedule={labelForSchedule}
          />
        </View>

        <Pressable
          style={[styles.fab, { bottom: fabBottomOffset }]}
          onPress={() => {
            if (!dependentId) {
              Alert.alert(t('common.error'), t('errors.invalidDependentProfile'));
              return;
            }
            openAddMedForDependent(dependentId);
          }}
          accessibilityRole="button"
          accessibilityLabel={t('tabs.calendar')}
        >
          <MaterialIcons name="add" size={28} color={Theme.colors.textDark} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(27, 60, 83, 0.08)',
  },
  container: {
    flex: 1,
    backgroundColor: Theme.colors.calendarCanvas,
  },
  dayWrap: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    right: Theme.spacing.xl,
    zIndex: 10,
    elevation: 6,
    shadowColor: Theme.colors.shadowNeutral,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    backgroundColor: Theme.colors.primaryLime,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.primaryLimeDark,
  },
});
