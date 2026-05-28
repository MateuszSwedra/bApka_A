import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/theme';
import { useMeds } from '../../context/MedsContext';
import { useDependentDisplay } from '../../context/DependentDisplayContext';
import { SeniorScreenBackground } from '../../components/senior/SeniorScreenBackground';
import { SeniorWeekPlanView } from '../../components/senior/SeniorWeekPlanView';
import { seniorT } from '../../utils/seniorI18n';
import { useOnCalendarDayChange, useTickingNow } from '../../hooks/useTickingNow';
import { shiftSeniorWeek, startOfSeniorPlanWindow } from '../../utils/seniorWeekPlan';

export default function DependentCalendarScreen() {
  const tPl = seniorT();
  const { colors } = useDependentDisplay();
  const { todayStr } = useTickingNow();
  const [weekAnchor, setWeekAnchor] = useState(() => startOfSeniorPlanWindow(new Date()));
  const { depletionAlerts, schedules, treatments, refetchFromServer } = useMeds();

  useOnCalendarDayChange(
    todayStr,
    useCallback(() => {
      setWeekAnchor(startOfSeniorPlanWindow(new Date()));
      void refetchFromServer();
    }, [refetchFromServer]),
  );

  return (
    <SeniorScreenBackground colors={colors}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.surfaceWhite, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={32} color={colors.textDark} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.textDark }]}>
            {tPl('dependent.calendar.screenTitle')}
          </Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <SeniorWeekPlanView
            weekAnchor={weekAnchor}
            onPrevWeek={() => setWeekAnchor(w => shiftSeniorWeek(w, -1))}
            onNextWeek={() => setWeekAnchor(w => shiftSeniorWeek(w, 1))}
            onThisWeek={() => setWeekAnchor(startOfSeniorPlanWindow(new Date()))}
            schedules={schedules}
            treatments={treatments}
            depletionAlerts={depletionAlerts}
            colors={colors}
          />
        </ScrollView>
      </View>
    </SeniorScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.l,
    paddingTop: Theme.spacing.xxl,
    paddingBottom: Theme.spacing.m,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: Theme.spacing.xs,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Theme.spacing.l,
    paddingTop: Theme.spacing.m,
    paddingBottom: 100,
  },
});
