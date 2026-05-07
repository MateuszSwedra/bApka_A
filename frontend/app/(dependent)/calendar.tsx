import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { MaterialIcons } from '@expo/vector-icons';
import { Card } from '../../components/Card';
import { Theme } from '../../constants/theme';
import { format } from 'date-fns';

LocaleConfig.locales['pl'] = {
  monthNames: ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'],
  monthNamesShort: ['Sty','Lut','Mar','Kwi','Maj','Cze','Lip','Sie','Wrz','Paź','Lis','Gru'],
  dayNames: ['Niedziela','Poniedziałek','Wtorek','Środa','Czwartek','Piątek','Sobota'],
  dayNamesShort: ['Nd','Pn','Wt','Śr','Cz','Pt','Sb'],
  today: 'Dzisiaj'
};
LocaleConfig.defaultLocale = 'pl';

export default function DependentCalendarScreen() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Atrapa harmonogramu
  const scheduledForToday = [
    { id: '1', time: '08:00', name: 'Lek poranny', taken: true },
    { id: '2', time: '12:30', name: 'Lek popołudniowy', taken: false },
    { id: '3', time: '20:00', name: 'Lek wieczorny', taken: false },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={28} color={Theme.colors.textDark} />
        </Pressable>
        <Text style={styles.headerTitle}>Twój kalendarz</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.scroll}>
        <View style={styles.calendarContainer}>
          <Calendar
            current={selectedDate}
            onDayPress={(day: any) => setSelectedDate(day.dateString)}
            markedDates={{
              [selectedDate]: { selected: true, selectedColor: Theme.colors.primaryLime },
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
          <Text style={styles.sectionTitle}>Harmonogram: {selectedDate}</Text>
          
          {scheduledForToday.map(sch => (
            <Card key={sch.id} variant="grey" style={styles.scheduleCard}>
              <Text style={styles.scheduleTime}>{sch.time}</Text>
              <View style={styles.scheduleRow}>
                <MaterialIcons 
                  name={sch.taken ? "check-circle" : "radio-button-unchecked"} 
                  size={24} 
                  color={sch.taken ? Theme.colors.success : Theme.colors.textLight} 
                />
                <Text style={styles.scheduleItemDone}>{sch.name}</Text>
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.l,
    paddingTop: Theme.spacing.xxl,
    paddingBottom: Theme.spacing.m,
    backgroundColor: Theme.colors.surfaceWhite,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  backBtn: {
    padding: Theme.spacing.xs,
  },
  headerTitle: {
    fontSize: Theme.typography.title,
    fontWeight: 'bold',
    color: Theme.colors.textDark,
  },
  scroll: { flex: 1 },
  calendarContainer: { backgroundColor: Theme.colors.surfaceWhite, paddingBottom: Theme.spacing.m },
  scheduleSection: { paddingHorizontal: Theme.spacing.l, paddingTop: Theme.spacing.m, paddingBottom: 100 },
  sectionTitle: { fontSize: Theme.typography.title, fontWeight: 'bold', color: Theme.colors.textDark, marginBottom: Theme.spacing.m },
  scheduleCard: { padding: Theme.spacing.m, marginBottom: Theme.spacing.m },
  scheduleTime: { fontSize: Theme.typography.body, fontWeight: 'bold', color: Theme.colors.textDark, marginBottom: Theme.spacing.s },
  scheduleRow: { flexDirection: 'row', alignItems: 'center' },
  scheduleItemDone: { fontSize: Theme.typography.body, color: Theme.colors.textDark, marginLeft: Theme.spacing.s },
});
