import React, { useCallback, useState } from 'react';
import { View, StyleSheet, Pressable, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Theme } from '../../../../constants/theme';
import { format } from 'date-fns';
import { router, useFocusEffect } from 'expo-router';
import { useMeds } from '../../../../context/MedsContext';
import { openAddMed } from '../../../../utils/medsFlowNavigation';
import { useFabBottomOffset } from '../../../../utils/useFabBottomOffset';
import type { ScheduleItem } from '../../../../context/MedsContext';
import { getScheduleTreatmentId } from '../../../../context/MedsContext';
import { useTranslation } from 'react-i18next';
import { AndroidStyleMonthCalendar } from '../../../../components/caretaker/AndroidStyleMonthCalendar';
import { useDependentTabTopInset } from '../../../../utils/useDependentTabTopInset';
import { useSelfUserId } from '../../../../hooks/useSelfUserId';
import { SeniorTourTarget } from '../../../../components/senior/SeniorTourTarget';

export default function HybridCalendarMonthScreen() {
  const { t } = useTranslation();
  const selfUserId = useSelfUserId();
  const fabBottomOffset = useFabBottomOffset({ aboveTabBar: true });
  const topInset = useDependentTabTopInset();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const { depletionAlerts, schedules, treatments, refetchFromServer } = useMeds();

  useFocusEffect(
    useCallback(() => {
      if (selfUserId) void refetchFromServer(selfUserId);
    }, [selfUserId, refetchFromServer]),
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
      setSelectedDate(dateStr);
      router.push(`/(hybrid)/(tabs)/calendar/${dateStr}` as any);
    },
    [],
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

      <SeniorTourTarget
        stepId="calendar-fab"
        wrapStyle={StyleSheet.flatten([styles.fab, { bottom: fabBottomOffset }])}
      >
        <Pressable
          style={styles.fabInner}
          onPress={() => {
            if (!selfUserId) {
              Alert.alert(t('common.error'), t('errors.invalidDependentProfile'));
              return;
            }
            openAddMed(selfUserId, 'hybrid');
          }}
          accessibilityRole="button"
          accessibilityLabel={t('schedule.add.pickActivityTitle')}
        >
          <MaterialIcons name="add" size={28} color={Theme.colors.textDark} />
        </Pressable>
      </SeniorTourTarget>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.calendarCanvas },
  calendarWrap: { flex: 1 },
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
    borderWidth: 1.5,
    borderColor: Theme.colors.primaryLimeDark,
  },
  fabInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
