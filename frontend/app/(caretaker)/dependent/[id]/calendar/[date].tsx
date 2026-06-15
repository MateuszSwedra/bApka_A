import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Theme } from '../../../../../constants/theme';
import { router, useGlobalSearchParams, useLocalSearchParams, useFocusEffect, useSegments } from 'expo-router';
import { useMeds } from '../../../../../context/MedsContext';
import { pickDependentUserId } from '../../../../../utils/resolveMedsTargetUserId';
import { openAddMedForDependent } from '../../../../../utils/caretakerNavigation';
import { openAddMedFromCalendarSlot, resolveMedsFlowScope } from '../../../../../utils/medsFlowNavigation';
import { isCalendarHourSlotInPast, isScheduleItemInPast, isCalendarDayInPast } from '../../../../../utils/scheduleDateHelpers';
import { useFabBottomOffset } from '../../../../../utils/useFabBottomOffset';
import type { ScheduleItem } from '../../../../../context/MedsContext';
import { getScheduleTreatmentId } from '../../../../../context/MedsContext';
import { useTranslation } from 'react-i18next';
import { AndroidStyleDayView } from '../../../../../components/caretaker/AndroidStyleDayView';
import { ScheduleEventSheet } from '../../../../../components/caretaker/ScheduleEventSheet';
import { useDependentTabTopInset } from '../../../../../utils/useDependentTabTopInset';
import { scheduleAppliesToDate, timeToMinutes } from '../../../../../utils/scheduleHelpers';
import type { ViewStyle } from 'react-native';

export default function DependentCalendarDayScreen() {
  const { t } = useTranslation();
  const { date: dateParam } = useLocalSearchParams<{ date: string }>();
  const localParams = useLocalSearchParams<{ id?: string }>();
  const globalParams = useGlobalSearchParams<{ id?: string }>();
  const segments = useSegments();
  const fabBottomOffset = useFabBottomOffset({ aboveTabBar: true });
  const topInset = useDependentTabTopInset();
  const dayScrollRef = useRef<ScrollView>(null);
  const dayContentRef = useRef<View>(null);

  const dateStr = typeof dateParam === 'string' ? dateParam : Array.isArray(dateParam) ? dateParam[0] : '';

  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleItem | null>(null);

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

  const selectedLabel = useMemo(() => {
    if (!selectedSchedule) return '';
    return labelForSchedule(selectedSchedule);
  }, [selectedSchedule, labelForSchedule]);

  const flowScope = resolveMedsFlowScope(segments as string[]);

  const tourTargetScheduleId = useMemo(() => {
    const daySchedules = schedules
      .filter(s => scheduleAppliesToDate(s, dateStr))
      .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
    return daySchedules[0]?.id ?? null;
  }, [schedules, dateStr]);

  const wrapTourTarget = useCallback(
    (node: React.ReactElement, wrapStyle: ViewStyle) => (
      <View style={wrapStyle}>{node}</View>
    ),
    [],
  );

  const handleSlotPress = useCallback(
    (hour: number) => {
      if (!dependentId) {
        Alert.alert(t('common.error'), t('errors.invalidDependentProfile'));
        return;
      }
      if (isCalendarDayInPast(dateStr) || isCalendarHourSlotInPast(dateStr, hour)) {
        return;
      }
      openAddMedFromCalendarSlot(dependentId, flowScope, dateStr, hour);
    },
    [dependentId, flowScope, dateStr, t],
  );

  const handleEventPress = useCallback(
    (sch: ScheduleItem) => {
      if (isScheduleItemInPast(dateStr, sch.time)) return;
      setSelectedSchedule(sch);
    },
    [dateStr],
  );

  if (!dateStr) {
    router.back();
    return null;
  }

  return (
    <View style={styles.root}>
      <View style={styles.backdrop} pointerEvents="none" />
      <View style={styles.container}>
        <View style={[styles.dayWrap, { paddingTop: topInset }]}>
          <AndroidStyleDayView
            dateStr={dateStr}
            onBack={() => router.back()}
            schedules={schedules}
            treatments={treatments}
            depletionAlerts={depletionAlerts}
            labelForSchedule={labelForSchedule}
            onEventPress={handleEventPress}
            onSlotPress={handleSlotPress}
            scrollRef={dayScrollRef}
            timelineContentRef={dayContentRef}
            tourTargetScheduleId={tourTargetScheduleId}
            wrapTourTarget={wrapTourTarget}
          />
        </View>

        <ScheduleEventSheet
          schedule={selectedSchedule}
          label={selectedLabel}
          visible={selectedSchedule != null}
          onClose={() => setSelectedSchedule(null)}
        />

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
          <MaterialIcons name="add" size={28} color={Theme.colors.textDark} style={styles.fabAddIcon} />
        </Pressable>
      </View>
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
  fabAddIcon: {
    marginTop: 3,
  },
});
