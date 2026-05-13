import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { MaterialIcons } from '@expo/vector-icons';
import { Card } from '../../components/Card';
import { Theme } from '../../constants/theme';
import { format } from 'date-fns';
import { useMeds, getScheduleTreatmentId } from '../../context/MedsContext';
import type { ScheduleItem } from '../../context/MedsContext';
import { scheduleAppliesToDate } from '../../utils/scheduleHelpers';
import { TREATMENT_VISUAL } from '../../constants/treatmentVisuals';
import { useDependentDisplay } from '../../context/DependentDisplayContext';

LocaleConfig.locales['en'] = {
  monthNames: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
  monthNamesShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  dayNamesShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  today: 'Today',
};
LocaleConfig.defaultLocale = 'en';

export default function DependentCalendarScreen() {
  const { colors } = useDependentDisplay();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const { depletionAlerts, schedules, treatments } = useMeds();

  const dynamicMarks = depletionAlerts.reduce(
    (acc, alert) => {
      acc[alert.date] = { marked: true, dotColor: colors.accentOrange };
      return acc;
    },
    {} as Record<string, { marked: boolean; dotColor: string }>,
  );

  const todayAlerts = depletionAlerts.filter(a => a.date === selectedDate);

  const scheduledForDay = useMemo(
    () => schedules.filter(s => scheduleAppliesToDate(s, selectedDate)),
    [schedules, selectedDate],
  );

  const labelForSchedule = (sch: ScheduleItem) => {
    if (sch.customName) return sch.customName;
    const tid = getScheduleTreatmentId(sch);
    if (tid) return treatments.find(t => t.id === tid)?.name ?? 'Activity';
    return 'Activity';
  };

  const typeForSchedule = (sch: ScheduleItem) => {
    const tid = getScheduleTreatmentId(sch);
    return treatments.find(t => t.id === tid)?.type;
  };

  const typeLabel = (sch: ScheduleItem) => {
    if (sch.type === 'ONCE') return 'One-off';
    if (sch.type === 'REGULAR') return 'Regular';
    return 'Temporary';
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surfaceWhite, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={32} color={colors.textDark} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textDark }]}>Your calendar</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={styles.scroll}>
        <View style={[styles.calendarContainer, { backgroundColor: colors.surfaceWhite }]}>
          <Calendar
            current={selectedDate}
            onDayPress={(day: { dateString: string }) => setSelectedDate(day.dateString)}
            markedDates={{
              ...dynamicMarks,
              [selectedDate]: {
                ...dynamicMarks[selectedDate],
                selected: true,
                selectedColor: colors.primaryLime,
              },
            }}
            theme={{
              backgroundColor: colors.surfaceWhite,
              calendarBackground: colors.surfaceWhite,
              textSectionTitleColor: colors.textLight,
              selectedDayBackgroundColor: colors.primaryLime,
              selectedDayTextColor: colors.textDark,
              todayTextColor: colors.primaryLimeDark,
              dayTextColor: colors.textDark,
              textDisabledColor: colors.border,
              dotColor: colors.primaryLimeDark,
              selectedDotColor: colors.textDark,
              arrowColor: colors.textDark,
              monthTextColor: colors.textDark,
              indicatorColor: colors.primaryLime,
              textDayFontWeight: '600',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '700',
              textDayFontSize: 18,
              textMonthFontSize: 22,
            }}
          />
        </View>

        <View style={styles.scheduleSection}>
          <Text style={[styles.sectionTitle, { color: colors.textDark }]}>
            Day: {selectedDate}
          </Text>

          {todayAlerts.map((alert, idx) => (
            <Card
              key={`warn-${idx}`}
              variant="white"
              style={{ ...styles.scheduleCardWarning, borderColor: colors.accentOrange }}
            >
              <Text style={[styles.scheduleTimeWarning, { color: colors.accentOrange }]}>
                Medicine running low
              </Text>
              <View style={styles.scheduleRow}>
                <MaterialIcons name="shopping-cart" size={28} color={colors.accentOrange} />
                <Text style={[styles.scheduleItemWarning, { color: colors.accentOrange }]}>
                  Buy a new pack: {alert.inventoryItemName}
                </Text>
              </View>
            </Card>
          ))}

          {scheduledForDay.map(sch => {
            const name = labelForSchedule(sch);
            const tType = typeForSchedule(sch);
            const icon =
              tType && TREATMENT_VISUAL[tType] ? TREATMENT_VISUAL[tType].icon : ('event' as const);
            return (
              <Card key={sch.id} variant="grey" style={{ ...styles.scheduleCard, borderColor: colors.border }}>
                <Text style={[styles.scheduleTime, { color: colors.textDark }]}>
                  {sch.time} · {typeLabel(sch)}
                </Text>
                <View style={styles.scheduleRow}>
                  <MaterialIcons name={icon} size={26} color={colors.success} />
                  <Text style={[styles.scheduleItemDone, { color: colors.textDark }]}>{name}</Text>
                </View>
              </Card>
            );
          })}

          {scheduledForDay.length === 0 && todayAlerts.length === 0 && (
            <Text style={[styles.emptyDay, { color: colors.textLight }]}>No activities on this day.</Text>
          )}
        </View>
      </ScrollView>
    </View>
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
  calendarContainer: { paddingBottom: Theme.spacing.m },
  scheduleSection: {
    paddingHorizontal: Theme.spacing.l,
    paddingTop: Theme.spacing.m,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Theme.colors.textDark,
    marginBottom: Theme.spacing.m,
  },
  scheduleCard: {
    padding: Theme.spacing.m,
    marginBottom: Theme.spacing.m,
    borderWidth: 1,
    borderRadius: Theme.borderRadius.large,
  },
  scheduleCardWarning: {
    padding: Theme.spacing.m,
    marginBottom: Theme.spacing.m,
    borderWidth: 2,
    borderRadius: Theme.borderRadius.large,
  },
  scheduleTime: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: Theme.spacing.s,
  },
  scheduleTimeWarning: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: Theme.spacing.s,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.xs,
  },
  scheduleItemDone: {
    fontSize: 22,
    marginLeft: Theme.spacing.s,
    fontWeight: '600',
  },
  scheduleItemWarning: {
    fontSize: 20,
    marginLeft: Theme.spacing.s,
    fontWeight: '700',
  },
  emptyDay: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 22,
  },
});
