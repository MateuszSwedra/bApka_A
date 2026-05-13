import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { MaterialIcons } from '@expo/vector-icons';
import { Card } from '../../../../components/Card';
import { Theme } from '../../../../constants/theme';
import { TREATMENT_VISUAL } from '../../../../constants/treatmentVisuals';
import { format } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import { getScheduleTreatmentId, useMeds } from '../../../../context/MedsContext';
import type { ScheduleItem } from '../../../../context/MedsContext';
import { scheduleAppliesToDate } from '../../../../utils/scheduleHelpers';

LocaleConfig.locales['pl'] = {
  monthNames: [
    'Styczeń',
    'Luty',
    'Marzec',
    'Kwiecień',
    'Maj',
    'Czerwiec',
    'Lipiec',
    'Sierpień',
    'Wrzesień',
    'Październik',
    'Listopad',
    'Grudzień',
  ],
  monthNamesShort: ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'],
  dayNames: ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'],
  dayNamesShort: ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'],
  today: 'Dzisiaj',
};
LocaleConfig.defaultLocale = 'pl';

export default function DependentCalendarScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const dependentId = Array.isArray(id) ? id[0] : id;

  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const { depletionAlerts, schedules, treatments } = useMeds();

  const dynamicMarks = depletionAlerts.reduce(
    (acc, alert) => {
      acc[alert.date] = { marked: true, dotColor: Theme.colors.accentOrange };
      return acc;
    },
    {} as Record<string, { marked: boolean; dotColor: string }>
  );

  const todayAlerts = depletionAlerts.filter(a => a.date === selectedDate);

  const scheduledForToday = useMemo(
    () => schedules.filter(s => scheduleAppliesToDate(s, selectedDate)),
    [schedules, selectedDate]
  );

  const labelForSchedule = (sch: ScheduleItem) => {
    if (sch.customName) return sch.customName;
    const tid = getScheduleTreatmentId(sch);
    if (tid) return treatments.find(t => t.id === tid)?.name ?? 'Aktywność';
    return 'Aktywność';
  };

  const typeForSchedule = (sch: ScheduleItem) => {
    const tid = getScheduleTreatmentId(sch);
    return treatments.find(t => t.id === tid)?.type;
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll}>
        <View style={styles.calendarContainer}>
          <Calendar
            current={selectedDate}
            onDayPress={(day: { dateString: string }) => setSelectedDate(day.dateString)}
            markedDates={{
              ...dynamicMarks,
              [selectedDate]: {
                ...dynamicMarks[selectedDate],
                selected: true,
                selectedColor: Theme.colors.primaryLime,
              },
            }}
            theme={{
              backgroundColor: Theme.colors.surfaceWhite,
              calendarBackground: Theme.colors.surfaceWhite,
              textSectionTitleColor: Theme.colors.textLight,
              selectedDayBackgroundColor: Theme.colors.primaryLime,
              selectedDayTextColor: Theme.colors.textDark,
              todayTextColor: Theme.colors.primaryLimeDark,
              dayTextColor: Theme.colors.textDark,
              textDisabledColor: Theme.colors.border,
              dotColor: Theme.colors.primaryLimeDark,
              selectedDotColor: Theme.colors.textDark,
              arrowColor: Theme.colors.textDark,
              monthTextColor: Theme.colors.textDark,
              indicatorColor: Theme.colors.primaryLime,
              textDayFontWeight: '500',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '600',
            }}
          />
        </View>

        <View style={styles.scheduleSection}>
          <Text style={styles.sectionTitle}>Dzień: {selectedDate}</Text>

          {todayAlerts.map((alert, idx) => (
            <Card key={`warn-${idx}`} variant="white" style={styles.scheduleCardWarning}>
              <Text style={styles.scheduleTimeWarning}>Koniec zapasu leku</Text>
              <View style={styles.scheduleRow}>
                <MaterialIcons name="shopping-cart" size={24} color={Theme.colors.accentOrange} />
                <Text style={styles.scheduleItemWarning}>Kup nową paczkę: {alert.inventoryItemName}</Text>
              </View>
            </Card>
          ))}

          {scheduledForToday.map(sch => {
            const name = labelForSchedule(sch);
            const tType = typeForSchedule(sch);
            const icon =
              tType && TREATMENT_VISUAL[tType]
                ? TREATMENT_VISUAL[tType].icon
                : ('event' as const);
            const typeLabel =
              sch.type === 'ONCE'
                ? 'Jednorazowo'
                : sch.type === 'REGULAR'
                  ? 'Stałe'
                  : 'Tymczasowo';
            return (
              <Card key={sch.id} variant="grey" style={styles.scheduleCard}>
                <Text style={styles.scheduleTime}>
                  {sch.time} · {typeLabel}
                </Text>
                <View style={styles.scheduleRow}>
                  <MaterialIcons name={icon} size={20} color={Theme.colors.success} />
                  <Text style={styles.scheduleItemDone}>{name}</Text>
                </View>
              </Card>
            );
          })}

          {scheduledForToday.length === 0 && todayAlerts.length === 0 && (
            <Text style={styles.emptyDay}>Brak aktywności na ten dzień.</Text>
          )}
        </View>
      </ScrollView>

      <Pressable
        style={styles.fab}
        onPress={() =>
          dependentId
            ? router.push(`/(caretaker)/add-med/${dependentId}` as any)
            : router.push('/(caretaker)/add-med/1' as any)
        }
      >
        <MaterialIcons name="add" size={32} color={Theme.colors.textDark} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  scroll: {
    flex: 1,
  },
  calendarContainer: {
    backgroundColor: Theme.colors.surfaceWhite,
    paddingBottom: Theme.spacing.m,
  },
  scheduleSection: {
    paddingHorizontal: Theme.spacing.l,
    paddingTop: Theme.spacing.m,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: Theme.typography.body,
    fontWeight: 'bold',
    color: Theme.colors.textDark,
    marginBottom: Theme.spacing.m,
  },
  scheduleCard: {
    padding: Theme.spacing.m,
    marginBottom: Theme.spacing.m,
  },
  scheduleCardWarning: {
    padding: Theme.spacing.m,
    marginBottom: Theme.spacing.m,
    borderColor: Theme.colors.accentOrange,
    borderWidth: 2,
  },
  scheduleTime: {
    fontSize: Theme.typography.body,
    fontWeight: '600',
    color: Theme.colors.textDark,
    marginBottom: Theme.spacing.s,
  },
  scheduleTimeWarning: {
    fontSize: Theme.typography.body,
    fontWeight: '800',
    color: Theme.colors.accentOrange,
    marginBottom: Theme.spacing.s,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.xs,
  },
  scheduleItemDone: {
    fontSize: Theme.typography.caption,
    color: Theme.colors.textLight,
    marginLeft: Theme.spacing.s,
  },
  scheduleItemWarning: {
    fontSize: Theme.typography.caption,
    color: Theme.colors.accentOrange,
    marginLeft: Theme.spacing.s,
    fontWeight: '700',
  },
  emptyDay: {
    textAlign: 'center',
    color: Theme.colors.textLight,
    marginTop: 20,
  },
  fab: {
    position: 'absolute',
    bottom: Theme.spacing.xl,
    right: Theme.spacing.xl,
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
