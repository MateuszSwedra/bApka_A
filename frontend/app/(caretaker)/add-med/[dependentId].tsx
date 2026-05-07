import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { format } from 'date-fns';
import { Theme } from '../../../constants/theme';
import { useMeds, MedScheduleType, InventoryItem } from '../../../context/MedsContext';

export default function AddMedicationScreen() {
  const { dependentId } = useLocalSearchParams();
  const { inventory, addSchedule } = useMeds();
  
  const [medType, setMedType] = useState<MedScheduleType>('ONCE');
  
  // Stany dla ONCE (Wpisywane ręcznie)
  const [customName, setCustomName] = useState('');
  
  // Stany dla REGULAR i TEMPORARY (Wybierane z Apteczki)
  const [selectedInventoryId, setSelectedInventoryId] = useState<string | null>(null);

  // Zegar HH:MM
  const [hour, setHour] = useState('08');
  const [minute, setMinute] = useState('00');
  
  // Dni tygodnia
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  
  // Daty (format rrrr-mm-dd)
  const today = format(new Date(), 'yyyy-MM-dd');
  const [selectedDate, setSelectedDate] = useState(today); // Dla ONCE
  const [endDate, setEndDate] = useState(today); // Dla TEMPORARY

  const daysOfWeek = [
    { id: 1, label: 'Pn' }, { id: 2, label: 'Wt' }, { id: 3, label: 'Śr' },
    { id: 4, label: 'Cz' }, { id: 5, label: 'Pt' }, { id: 6, label: 'Sb' }, { id: 7, label: 'Nd' }
  ];

  const handleHourChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned.length <= 2) {
      const val = parseInt(cleaned);
      if (!val || val < 24) setHour(cleaned);
      if (val >= 24) setHour('23');
    }
  };

  const handleMinuteChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned.length <= 2) {
      const val = parseInt(cleaned);
      if (!val || val < 60) setMinute(cleaned);
      if (val >= 60) setMinute('59');
    }
  };

  const handleHourBlur = () => {
    if (hour.length === 1) setHour('0' + hour);
    if (hour.length === 0) setHour('00');
  };

  const handleMinuteBlur = () => {
    if (minute.length === 1) setMinute('0' + minute);
    if (minute.length === 0) setMinute('00');
  };

  const toggleDay = (id: number) => {
    setSelectedDays(prev => 
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const canSave = () => {
    if (medType === 'ONCE') return customName.length > 0;
    if (medType === 'REGULAR') return selectedInventoryId !== null && selectedDays.length > 0;
    if (medType === 'TEMPORARY') return selectedInventoryId !== null && selectedDays.length > 0;
    return false;
  };

  const handleSave = () => {
    addSchedule({
      inventoryId: (medType === 'REGULAR' || medType === 'TEMPORARY') ? selectedInventoryId! : undefined,
      customName: medType === 'ONCE' ? customName : undefined,
      type: medType,
      time: `${hour}:${minute}`,
      daysOfWeek: medType === 'ONCE' ? [] : selectedDays,
      startDate: medType === 'ONCE' ? selectedDate : today,
      endDate: medType === 'TEMPORARY' ? endDate : undefined,
    });
    router.back();
  };

  const calendarTheme = {
    backgroundColor: Theme.colors.background,
    calendarBackground: Theme.colors.background,
    textSectionTitleColor: Theme.colors.textLight,
    selectedDayBackgroundColor: Theme.colors.primaryLimeDark,
    selectedDayTextColor: Theme.colors.surfaceWhite,
    todayTextColor: Theme.colors.accentOrange,
    dayTextColor: Theme.colors.textDark,
    textDisabledColor: Theme.colors.border,
    arrowColor: Theme.colors.textDark,
    monthTextColor: Theme.colors.textDark,
    textDayFontWeight: '500' as const,
    textMonthFontWeight: 'bold' as const,
    textDayHeaderFontWeight: '600' as const,
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <MaterialIcons name="close" size={28} color={Theme.colors.textDark} />
        </Pressable>
        <Text style={styles.headerTitle}>Dodaj do Kalendarza</Text>
        <Pressable onPress={handleSave} style={styles.saveBtn} disabled={!canSave()}>
          <Text style={[styles.saveBtnText, !canSave() && { color: Theme.colors.textLight }]}>Zapisz</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        
        {/* Rodzaj Harmonogramu */}
        <Text style={styles.label}>Rodzaj podawania</Text>
        <View style={styles.segmentContainer}>
          <Pressable style={[styles.segmentBtn, medType === 'ONCE' && styles.segmentBtnActive]} onPress={() => setMedType('ONCE')}>
            <Text style={[styles.segmentText, medType === 'ONCE' && styles.segmentTextActive]}>Jednorazowo</Text>
          </Pressable>
          <Pressable style={[styles.segmentBtn, medType === 'REGULAR' && styles.segmentBtnActive]} onPress={() => setMedType('REGULAR')}>
            <Text style={[styles.segmentText, medType === 'REGULAR' && styles.segmentTextActive]}>Stałe</Text>
          </Pressable>
          <Pressable style={[styles.segmentBtn, medType === 'TEMPORARY' && styles.segmentBtnActive]} onPress={() => setMedType('TEMPORARY')}>
            <Text style={[styles.segmentText, medType === 'TEMPORARY' && styles.segmentTextActive]}>Tymczasowo</Text>
          </Pressable>
        </View>

        {/* Sekcja Nazwy / Wyboru leku */}
        {medType === 'ONCE' ? (
          <View style={styles.section}>
            <Text style={styles.label}>Nazwa leku (ręcznie)</Text>
            <TextInput 
              style={styles.textInput} 
              placeholder="Wpisz nazwę"
              value={customName}
              onChangeText={setCustomName}
              placeholderTextColor={Theme.colors.border}
            />
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.label}>Wybierz z Apteczki</Text>
            {inventory.length === 0 ? (
              <Text style={styles.hint}>Brak leków w apteczce! Wróć i najpierw dodaj leki w zakładce Meds.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.inventoryRow}>
                {inventory.map(item => (
                  <Pressable 
                    key={item.id} 
                    style={[styles.inventoryPill, selectedInventoryId === item.id && styles.inventoryPillActive]}
                    onPress={() => setSelectedInventoryId(item.id)}
                  >
                    <Text style={[styles.inventoryPillText, selectedInventoryId === item.id && styles.inventoryPillTextActive]}>
                      {item.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* Zegar Modernistyczny */}
        <Text style={styles.label}>Godzina Podania</Text>
        <View style={styles.timeContainer}>
          <TextInput
            style={styles.timeInput}
            value={hour}
            onChangeText={handleHourChange}
            onBlur={handleHourBlur}
            keyboardType="number-pad"
            maxLength={2}
            selectTextOnFocus
          />
          <Text style={styles.timeSeparator}>:</Text>
          <TextInput
            style={styles.timeInput}
            value={minute}
            onChangeText={handleMinuteChange}
            onBlur={handleMinuteBlur}
            keyboardType="number-pad"
            maxLength={2}
            selectTextOnFocus
          />
        </View>

        {/* Kalendarz dla opcji Jednorazowo */}
        {medType === 'ONCE' && (
          <View style={styles.section}>
            <Text style={styles.label}>Wybierz datę podania</Text>
            <View style={styles.calendarWrapper}>
              <Calendar
                current={selectedDate}
                onDayPress={(day: any) => setSelectedDate(day.dateString)}
                markedDates={{ [selectedDate]: { selected: true } }}
                theme={calendarTheme}
                hideExtraDays={true}
              />
            </View>
          </View>
        )}

        {/* Dni tygodnia dla Stałe / Tymczasowo */}
        {(medType === 'REGULAR' || medType === 'TEMPORARY') && (
          <View style={styles.section}>
            <Text style={styles.label}>Wybierz dni tygodnia</Text>
            <View style={styles.daysRow}>
              {daysOfWeek.map(day => {
                const isActive = selectedDays.includes(day.id);
                return (
                  <Pressable 
                    key={day.id} 
                    style={[styles.dayCircle, isActive && styles.dayCircleActive]}
                    onPress={() => toggleDay(day.id)}
                  >
                    <Text style={[styles.dayText, isActive && styles.dayTextActive]}>{day.label}</Text>
                  </Pressable>
                )
              })}
            </View>
          </View>
        )}

        {/* Data Końcowa dla Tymczasowo */}
        {medType === 'TEMPORARY' && (
          <View style={styles.section}>
            <Text style={styles.label}>Zakończ podawanie po dniu</Text>
            <View style={styles.calendarWrapper}>
              <Calendar
                current={endDate}
                onDayPress={(day: any) => setEndDate(day.dateString)}
                minDate={today}
                markedDates={{ [endDate]: { selected: true } }}
                theme={calendarTheme}
                hideExtraDays={true}
              />
            </View>
          </View>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Theme.spacing.l,
    paddingTop: Theme.spacing.xxl,
    backgroundColor: Theme.colors.background,
  },
  headerTitle: {
    fontSize: Theme.typography.title,
    fontWeight: '800',
    color: Theme.colors.textDark,
  },
  iconBtn: {
    padding: 8,
  },
  saveBtn: {
    padding: 8,
  },
  saveBtnText: {
    color: Theme.colors.primaryLimeDark,
    fontWeight: '800',
    fontSize: Theme.typography.body,
  },
  content: {
    paddingHorizontal: Theme.spacing.l,
    paddingBottom: 100,
  },
  label: {
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '700',
    color: Theme.colors.textLight,
    marginTop: Theme.spacing.xl,
    marginBottom: Theme.spacing.s,
  },
  textInput: {
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    paddingVertical: Theme.spacing.m,
    fontSize: Theme.typography.largeTitle,
    color: Theme.colors.textDark,
    fontWeight: '400',
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.surfaceGrey,
    borderRadius: 8,
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentBtnActive: {
    backgroundColor: Theme.colors.surfaceWhite,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  segmentText: {
    fontWeight: '600',
    color: Theme.colors.textLight,
    fontSize: Theme.typography.small,
  },
  segmentTextActive: {
    color: Theme.colors.textDark,
  },
  section: {
    marginTop: Theme.spacing.xs,
  },
  inventoryRow: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  inventoryPill: {
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    marginRight: 8,
    backgroundColor: Theme.colors.surfaceWhite,
  },
  inventoryPillActive: {
    backgroundColor: Theme.colors.textDark,
    borderColor: Theme.colors.textDark,
  },
  inventoryPillText: {
    fontWeight: '600',
    color: Theme.colors.textDark,
  },
  inventoryPillTextActive: {
    color: Theme.colors.surfaceWhite,
  },
  hint: {
    color: Theme.colors.accentOrange,
    fontSize: Theme.typography.caption,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Theme.spacing.s,
  },
  timeInput: {
    backgroundColor: Theme.colors.surfaceGrey,
    borderRadius: 16,
    width: 80,
    height: 90,
    textAlign: 'center',
    fontSize: 48,
    fontWeight: '300',
    color: Theme.colors.textDark,
  },
  timeSeparator: {
    fontSize: 48,
    fontWeight: '300',
    color: Theme.colors.textLight,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  calendarWrapper: {
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 16,
    overflow: 'hidden',
    paddingBottom: 10,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Theme.spacing.s,
  },
  dayCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceWhite,
  },
  dayCircleActive: {
    backgroundColor: Theme.colors.primaryLimeDark,
    borderColor: Theme.colors.primaryLimeDark,
  },
  dayText: {
    fontWeight: '600',
    color: Theme.colors.textDark,
  },
  dayTextActive: {
    color: Theme.colors.surfaceWhite,
  }
});
