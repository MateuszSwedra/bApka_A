import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Theme } from '../../../../../constants/theme';
import { format } from 'date-fns';
import { router, useGlobalSearchParams, useLocalSearchParams, useFocusEffect, useSegments } from 'expo-router';
import { useMeds } from '../../../../../context/MedsContext';
import { pickDependentUserId } from '../../../../../utils/resolveMedsTargetUserId';
import { openAddMedForDependent } from '../../../../../utils/caretakerNavigation';
import { useFabBottomOffset } from '../../../../../utils/useFabBottomOffset';
import type { ScheduleItem } from '../../../../../context/MedsContext';
import { getScheduleTreatmentId } from '../../../../../context/MedsContext';
import { useTranslation } from 'react-i18next';
import { AndroidStyleMonthCalendar } from '../../../../../components/caretaker/AndroidStyleMonthCalendar';
import { CaretakerTourTarget } from '../../../../../components/caretaker/CaretakerTourTarget';
import { useDependentTabTopInset } from '../../../../../utils/useDependentTabTopInset';

export default function DependentCalendarMonthScreen() {
  const { t } = useTranslation();
  const localParams = useLocalSearchParams<{ id?: string }>();
  const globalParams = useGlobalSearchParams<{ id?: string }>();
  const segments = useSegments();
  const fabBottomOffset = useFabBottomOffset({ aboveTabBar: true });
  const topInset = useDependentTabTopInset();

  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
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

  const openDay = useCallback(
    (dateStr: string) => {
      if (!dependentId) return;
      setSelectedDate(dateStr);
      router.push(`/(caretaker)/dependent/${dependentId}/calendar/${dateStr}`);
    },
    [dependentId],
  );

  return (
    <View style={styles.container}>
      <View style={[styles.calendarWrap, { paddingTop: topInset }]}>
        <AndroidStyleMonthCalendar
          selectedDate={selectedDate}
          onSelectDate={openDay}
          schedules={schedules}
          treatments={treatments}
          depletionAlerts={depletionAlerts}
          labelForSchedule={labelForSchedule}
        />
      </View>

      <CaretakerTourTarget stepId="calendar-fab" wrapStyle={[styles.fab, { bottom: fabBottomOffset }]}>
        <Pressable
          style={styles.fabInner}
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
      </CaretakerTourTarget>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.calendarCanvas,
  },
  calendarWrap: {
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
  },
  fabInner: {
    backgroundColor: Theme.colors.primaryLime,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Theme.colors.primaryLimeDark,
  },
  fabAddIcon: {
    marginTop: 3,
  },
});
