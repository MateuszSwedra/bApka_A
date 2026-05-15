import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput, Alert } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { MaterialIcons } from '@expo/vector-icons';
import { Card } from '../../../../components/Card';
import { Theme } from '../../../../constants/theme';
import { TREATMENT_VISUAL } from '../../../../constants/treatmentVisuals';
import { format } from 'date-fns';
import { router, useGlobalSearchParams, useLocalSearchParams, useFocusEffect, useSegments } from 'expo-router';
import { getScheduleTreatmentId, useMeds } from '../../../../context/MedsContext';
import { pickDependentUserId } from '../../../../utils/resolveMedsTargetUserId';
import { openAddMedForDependent } from '../../../../utils/caretakerNavigation';
import { useFabBottomOffset } from '../../../../utils/useFabBottomOffset';
import type { ScheduleItem } from '../../../../context/MedsContext';
import { scheduleAppliesToDate } from '../../../../utils/scheduleHelpers';
import { buildScheduleMarkedDates } from '../../../../utils/buildScheduleMarkedDates';

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
  const localParams = useLocalSearchParams<{ id?: string }>();
  const globalParams = useGlobalSearchParams<{ id?: string }>();
  const segments = useSegments();
  const fabBottom = useFabBottomOffset();

  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const { depletionAlerts, schedules, treatments, updateSchedule, removeSchedule, refetchFromServer, targetUserId } =
    useMeds();

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

  const [editingSchedule, setEditingSchedule] = useState<ScheduleItem | null>(null);
  const [editTime, setEditTime] = useState('');
  const [editDosage, setEditDosage] = useState('');

  useEffect(() => {
    if (editingSchedule) {
      setEditTime(editingSchedule.time);
      setEditDosage(editingSchedule.dosage || '1');
    }
  }, [editingSchedule]);

  const handleSaveEdit = async () => {
    if (!editingSchedule) return;
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(editTime)) {
      Alert.alert('Błąd', 'Podaj poprawny czas w formacie HH:MM');
      return;
    }
    try {
      await updateSchedule(editingSchedule.id, { time: editTime, dosage: editDosage });
      setEditingSchedule(null);
    } catch (e) {
      Alert.alert('Błąd', 'Nie udało się zaktualizować harmonogramu');
    }
  };

  const handleDelete = () => {
    if (!editingSchedule) return;
    Alert.alert('Usuwanie cyklu', 'Czy na pewno chcesz usunąć ten harmonogram?', [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Usuń', style: 'destructive', onPress: async () => {
        try {
          await removeSchedule(editingSchedule.id);
          setEditingSchedule(null);
        } catch (e) {
          Alert.alert('Błąd', 'Nie udało się usunąć harmonogramu');
        }
      }},
    ]);
  };

  const scheduleMarks = useMemo(
    () => buildScheduleMarkedDates(schedules, Theme.colors.primaryLimeDark),
    [schedules],
  );

  const dynamicMarks = useMemo(() => {
    const acc = { ...scheduleMarks };
    depletionAlerts.forEach(alert => {
      acc[alert.date] = { marked: true, dotColor: Theme.colors.accentOrange };
    });
    return acc;
  }, [scheduleMarks, depletionAlerts]);

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
              <Pressable
                key={sch.id}
                onPress={() => setEditingSchedule(sch)}
              >
                <Card variant="grey" style={styles.scheduleCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                      <Text style={styles.scheduleTime}>
                        {sch.time} · {typeLabel}
                        {sch.dosage && sch.dosage !== "1" ? ` · ${sch.dosage} szt.` : ''}
                      </Text>
                      <View style={styles.scheduleRow}>
                        <MaterialIcons name={icon} size={20} color={Theme.colors.success} />
                        <Text style={styles.scheduleItemDone}>{name}</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 16 }}>
                      <MaterialIcons name="edit" size={24} color={Theme.colors.primaryLimeDark} />
                    </View>
                  </View>
                </Card>
              </Pressable>
            );
          })}

          {scheduledForToday.length === 0 && todayAlerts.length === 0 && (
            <Text style={styles.emptyDay}>Brak aktywności na ten dzień.</Text>
          )}
        </View>
      </ScrollView>

      {/* MODAL EDYCJI */}
      <Modal visible={!!editingSchedule} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edytuj harmonogram</Text>
            
            <Text style={styles.label}>Godzina (HH:MM)</Text>
            <TextInput
              style={styles.textInput}
              value={editTime}
              onChangeText={setEditTime}
              keyboardType="numbers-and-punctuation"
            />
            
            <Text style={styles.label}>Ilość / Dawka (np. 2)</Text>
            <TextInput
              style={styles.textInput}
              value={editDosage}
              onChangeText={setEditDosage}
              keyboardType="number-pad"
            />
            
            <View style={styles.modalActions}>
              <Pressable style={styles.modalBtnGhost} onPress={() => setEditingSchedule(null)}>
                <Text style={styles.modalBtnGhostText}>Anuluj</Text>
              </Pressable>
              
              <Pressable style={[styles.modalBtnGhost, { borderColor: Theme.colors.accentOrange }]} onPress={handleDelete}>
                <Text style={[styles.modalBtnGhostText, { color: Theme.colors.accentOrange }]}>Usuń cykl</Text>
              </Pressable>

              <Pressable style={styles.modalBtnPrimary} onPress={handleSaveEdit}>
                <Text style={styles.modalBtnPrimaryText}>Zapisz</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Pressable
        style={[styles.fab, { bottom: fabBottom }]}
        onPress={() => {
          if (!dependentId) {
            Alert.alert(
              'Błąd',
              'Nie udało się ustalić profilu podopiecznego. Wróć do listy i otwórz profil ponownie.',
            );
            return;
          }
          openAddMedForDependent(dependentId);
        }}
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
    right: Theme.spacing.xl,
    zIndex: 10,
    elevation: 8,
    backgroundColor: Theme.colors.primaryLime,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.primaryLimeDark,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: Theme.spacing.l,
  },
  modalCard: {
    backgroundColor: Theme.colors.surfaceWhite,
    borderRadius: Theme.borderRadius.large,
    padding: Theme.spacing.l,
  },
  modalTitle: {
    fontSize: Theme.typography.title,
    fontWeight: 'bold',
    marginBottom: Theme.spacing.m,
  },
  label: {
    fontSize: Theme.typography.caption,
    fontWeight: 'bold',
    marginBottom: 4,
    marginTop: Theme.spacing.m,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.medium,
    padding: Theme.spacing.m,
    fontSize: Theme.typography.body,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: Theme.spacing.xl,
    gap: Theme.spacing.m,
  },
  modalBtnGhost: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: Theme.borderRadius.round,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  modalBtnGhostText: {
    fontSize: Theme.typography.body,
    fontWeight: '600',
  },
  modalBtnPrimary: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: Theme.borderRadius.round,
    backgroundColor: Theme.colors.primaryLimeDark,
  },
  modalBtnPrimaryText: {
    fontSize: Theme.typography.body,
    fontWeight: 'bold',
    color: Theme.colors.surfaceWhite,
  },
});
