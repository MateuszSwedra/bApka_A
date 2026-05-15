import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { addDays, differenceInCalendarDays, format } from 'date-fns';
import { Theme } from '../../../constants/theme';
import { TREATMENT_VISUAL } from '../../../constants/treatmentVisuals';
import { useMeds, MedScheduleType } from '../../../context/MedsContext';
import { pickDependentUserId } from '../../../utils/resolveMedsTargetUserId';
import { useGlobalSearchParams, useSegments } from 'expo-router';

/** yyyy-MM-dd → data w lokalnej strefie (unika błędów parseISO / UTC). */
function parseYmdLocal(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function compareYmd(a: string, b: string): number {
  return parseYmdLocal(a).getTime() - parseYmdLocal(b).getTime();
}

export default function AddMedicationScreen() {
  const localParams = useLocalSearchParams<{ dependentId?: string; id?: string }>();
  const globalParams = useGlobalSearchParams<{ dependentId?: string; id?: string }>();
  const segments = useSegments();
  const { treatments, addSchedule, refetchFromServer, targetUserId } = useMeds();

  const dependentId = useMemo(
    () =>
      pickDependentUserId({
        localDependentId: localParams.dependentId,
        localId: localParams.id,
        globalDependentId: globalParams.dependentId,
        globalId: globalParams.id,
        segments: segments as string[],
        contextUserId: targetUserId,
      }),
    [
      localParams.dependentId,
      localParams.id,
      globalParams.dependentId,
      globalParams.id,
      segments,
      targetUserId,
    ],
  );

  useFocusEffect(
    useCallback(() => {
      if (dependentId) void refetchFromServer(dependentId);
    }, [dependentId, refetchFromServer]),
  );

  const [medType, setMedType] = useState<MedScheduleType>('ONCE');
  const [selectedTreatmentId, setSelectedTreatmentId] = useState<string | null>(null);

  const [hour, setHour] = useState('08');
  const [minute, setMinute] = useState('00');
  const [dosage, setDosage] = useState('1');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  const today = format(new Date(), 'yyyy-MM-dd');
  const [selectedDate, setSelectedDate] = useState(today);
  // Zakres dla aktywności tymczasowych
  const [tempStart, setTempStart] = useState(today);
  const [tempEnd, setTempEnd] = useState(today);
  /** Kolejny tap: początek zakresu (true) albo koniec (false). */
  const [tempSelectingStart, setTempSelectingStart] = useState(true);
  /** Po drugim tapie mamy kompletny zakres gotowy do zapisu. */
  const [tempRangeComplete, setTempRangeComplete] = useState(false);

  useEffect(() => {
    if (medType !== 'TEMPORARY') return;
    setTempStart(today);
    setTempEnd(today);
    setTempSelectingStart(true);
    setTempRangeComplete(false);
  }, [medType, today]);

  const daysOfWeek = [
    { id: 1, label: 'Pn' },
    { id: 2, label: 'Wt' },
    { id: 3, label: 'Śr' },
    { id: 4, label: 'Cz' },
    { id: 5, label: 'Pt' },
    { id: 6, label: 'Sb' },
    { id: 7, label: 'Nd' },
  ];

  const handleHourChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned.length <= 2) {
      const val = parseInt(cleaned, 10);
      if (!val || val < 24) setHour(cleaned);
      if (val >= 24) setHour('23');
    }
  };

  const handleMinuteChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned.length <= 2) {
      const val = parseInt(cleaned, 10);
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
    if (!selectedTreatmentId) return false;
    if (medType === 'ONCE') return true;
    if (medType === 'REGULAR') return selectedDays.length > 0;
    if (medType === 'TEMPORARY') return tempRangeComplete;
    return false;
  };

  const handleSave = async () => {
    if (!canSave() || !selectedTreatmentId || !dependentId) return;
    let startDate = today;
    let endDate: string | undefined;
    let daysOfWeek: number[] = [];
    if (medType === 'ONCE') startDate = selectedDate;
    if (medType === 'REGULAR') daysOfWeek = selectedDays;
    if (medType === 'TEMPORARY') {
      startDate = tempStart;
      endDate = tempEnd;
      daysOfWeek = selectedDays.length > 0 ? selectedDays : [1, 2, 3, 4, 5, 6, 7];
    }
    try {
      await addSchedule(
        {
          treatmentId: selectedTreatmentId,
          type: medType,
          time: `${hour}:${minute}`,
          dosage,
          daysOfWeek,
          startDate,
          endDate,
        },
        dependentId,
      );
      router.back();
    } catch {
      // zalogowane w MedsContext
    }
  };

  const handleTempDayPress = (dateString: string) => {
    if (compareYmd(dateString, today) < 0) return;

    if (tempSelectingStart) {
      setTempStart(dateString);
      setTempEnd(dateString);
      setTempSelectingStart(false);
      setTempRangeComplete(false);
      return;
    }
    setTempStart(prevStart => {
      if (compareYmd(dateString, prevStart) < 0) {
        setTempEnd(prevStart);
        return dateString;
      }
      setTempEnd(dateString);
      return prevStart;
    });
    setTempSelectingStart(true);
    setTempRangeComplete(true);
  };

  const resetTempRange = () => {
    setTempStart(today);
    setTempEnd(today);
    setTempSelectingStart(true);
    setTempRangeComplete(false);
  };

  const tempRangeMarks = useMemo(() => {
    const marks: Record<string, Record<string, unknown>> = {};
    const start = parseYmdLocal(tempStart);
    const end = parseYmdLocal(tempEnd);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return marks;

    const span = differenceInCalendarDays(end, start);
    if (span < 0) return marks;

    const middleColor = 'rgba(233, 164, 61, 0.35)';
    const edgeColor = Theme.colors.accentOrange;

    for (let i = 0; i <= span; i += 1) {
      const d = format(addDays(start, i), 'yyyy-MM-dd');
      const isFirst = i === 0;
      const isLast = i === span;
      const mark: Record<string, unknown> = {
        color: isFirst || isLast ? edgeColor : middleColor,
      };
      if (isFirst) mark.startingDay = true;
      if (isLast) mark.endingDay = true;
      if (isFirst || isLast) {
        mark.textColor = Theme.colors.surfaceWhite;
      }
      marks[d] = mark;
    }
    return marks;
  }, [tempStart, tempEnd]);

  const openAddTreatment = () => {
    if (!dependentId) return;
    router.push(`/(caretaker)/add-treatment/${dependentId}` as any);
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

  const renderActivityPicker = () => (
    <View style={styles.section}>
      <Text style={styles.label}>Aktywności z apteczki</Text>
      {treatments.length === 0 ? (
        <Text style={styles.hint}>
          Brak aktywności. Dotknij „+”, aby dodać pierwszą — po zapisie wrócisz tutaj i wybierzesz ją w
          kalendarzu.
        </Text>
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.activityRow}
      >
        {treatments.map(item => {
          const vis = TREATMENT_VISUAL[item.type];
          const selected = selectedTreatmentId === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => setSelectedTreatmentId(item.id)}
              style={[
                styles.activityPill,
                { borderColor: vis.accent, backgroundColor: vis.accent + '18' },
                selected && styles.activityPillSelected,
                selected && { borderColor: Theme.colors.textDark },
              ]}
            >
              <View style={[styles.activityPillIcon, { backgroundColor: vis.accent + '33' }]}>
                <MaterialIcons name={vis.icon} size={20} color={vis.accent} />
              </View>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[
                  styles.activityPillText,
                  selected && { color: Theme.colors.textDark },
                ]}
              >
                {item.name}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={openAddTreatment}
          style={[styles.activityAddPill]}
          accessibilityLabel="Dodaj aktywność do apteczki"
        >
          <MaterialIcons name="add" size={24} color={Theme.colors.primaryLimeDark} />
        </Pressable>
      </ScrollView>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <MaterialIcons name="close" size={28} color={Theme.colors.textDark} />
        </Pressable>
        <Text style={styles.headerTitle}>Dodaj do Kalendarza</Text>
        <Pressable onPress={handleSave} style={styles.saveBtn} disabled={!canSave()}>
          <Text style={[styles.saveBtnText, !canSave() && { color: Theme.colors.textLight }]}>
            Zapisz
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        removeClippedSubviews={false}
      >
        {renderActivityPicker()}

        <Text style={styles.label}>Rodzaj podawania</Text>
        <View style={styles.segmentContainer}>
          <Pressable
            style={[styles.segmentBtn, medType === 'ONCE' && styles.segmentBtnActive]}
            onPress={() => setMedType('ONCE')}
          >
            <Text style={[styles.segmentText, medType === 'ONCE' && styles.segmentTextActive]}>
              Jednorazowo
            </Text>
          </Pressable>
          <Pressable
            style={[styles.segmentBtn, medType === 'REGULAR' && styles.segmentBtnActive]}
            onPress={() => setMedType('REGULAR')}
          >
            <Text style={[styles.segmentText, medType === 'REGULAR' && styles.segmentTextActive]}>
              Stałe
            </Text>
          </Pressable>
          <Pressable
            style={[styles.segmentBtn, medType === 'TEMPORARY' && styles.segmentBtnActive]}
            onPress={() => setMedType('TEMPORARY')}
          >
            <Text style={[styles.segmentText, medType === 'TEMPORARY' && styles.segmentTextActive]}>
              Tymczasowo
            </Text>
          </Pressable>
        </View>

        <Text style={styles.label}>Godzina</Text>
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

        <Text style={styles.label}>Ilość sztuk / Dawka</Text>
        <TextInput
          style={[styles.timeInput, { width: 120, height: 60, fontSize: 32, alignSelf: 'center' }]}
          value={dosage}
          onChangeText={setDosage}
          keyboardType="number-pad"
          selectTextOnFocus
        />

        {medType === 'ONCE' && (
          <View style={styles.section}>
            <Text style={styles.label}>Wybierz datę</Text>
            <View style={styles.calendarWrapper}>
              <Calendar
                current={selectedDate}
                onDayPress={(day: { dateString: string }) => setSelectedDate(day.dateString)}
                markedDates={{ [selectedDate]: { selected: true } }}
                theme={calendarTheme}
                hideExtraDays
              />
            </View>
          </View>
        )}

        {(medType === 'REGULAR' || medType === 'TEMPORARY') && (
          <View style={styles.section}>
            <Text style={styles.label}>
              Dni tygodnia{medType === 'TEMPORARY' ? ' (opcjonalne)' : ''}
            </Text>
            {medType === 'TEMPORARY' && (
              <Text style={styles.weekdaysHint}>
                Pozostaw puste, by aktywność była każdego dnia w wybranym okresie.
              </Text>
            )}
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
                );
              })}
            </View>
          </View>
        )}

        {medType === 'TEMPORARY' && (
          <View style={styles.section}>
            <View style={styles.rangeHeader}>
              <Text style={[styles.label, { marginTop: 0 }]}>Okres podawania</Text>
              <Pressable onPress={resetTempRange} style={styles.resetBtn} hitSlop={8}>
                <MaterialIcons name="refresh" size={16} color={Theme.colors.primaryLimeDark} />
                <Text style={styles.resetBtnText}>Wyczyść</Text>
              </Pressable>
            </View>
            <View style={styles.rangePreview}>
              <View style={styles.rangePill}>
                <Text style={styles.rangePillLabel}>Od</Text>
                <Text style={styles.rangePillValue}>{tempStart}</Text>
              </View>
              <MaterialIcons name="arrow-forward" size={18} color={Theme.colors.textLight} />
              <View style={styles.rangePill}>
                <Text style={styles.rangePillLabel}>Do</Text>
                <Text style={styles.rangePillValue}>{tempEnd}</Text>
              </View>
            </View>
            <Text style={styles.rangeHint}>
              {tempRangeComplete
                ? 'Zakres ustawiony. Dotknij innego dnia, aby zacząć od nowa.'
                : tempSelectingStart
                  ? 'Zaznacz datę początkową okresu'
                  : 'Teraz zaznacz datę końcową okresu'}
            </Text>
            <View style={styles.calendarPeriodWrapper}>
              <Calendar
                current={tempStart}
                minDate={today}
                enableSwipeMonths
                onDayPress={(day: { dateString: string }) => handleTempDayPress(day.dateString)}
                markingType="period"
                markedDates={tempRangeMarks}
                theme={calendarTheme}
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
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.s,
    paddingRight: Theme.spacing.l,
  },
  activityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 999,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 14,
    marginRight: 10,
    maxWidth: 220,
  },
  activityPillSelected: {
    borderWidth: 3,
    backgroundColor: Theme.colors.surfaceWhite,
  },
  activityPillIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  activityPillText: {
    fontSize: Theme.typography.caption,
    fontWeight: '700',
    color: Theme.colors.textDark,
    maxWidth: 140,
  },
  activityAddPill: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Theme.colors.primaryLimeDark,
    backgroundColor: Theme.colors.primaryLime,
    marginRight: 10,
  },
  hint: {
    color: Theme.colors.accentOrange,
    fontSize: Theme.typography.caption,
    marginBottom: Theme.spacing.s,
    lineHeight: 20,
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
  /** Kalendarz okresu — bez overflow:hidden, żeby paski „period” i dotyk działały poprawnie. */
  calendarPeriodWrapper: {
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 16,
    overflow: 'visible',
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
  },
  rangeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Theme.spacing.xl,
    marginBottom: Theme.spacing.s,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: Theme.colors.surfaceGrey,
    borderRadius: 999,
  },
  resetBtnText: {
    marginLeft: 4,
    color: Theme.colors.primaryLimeDark,
    fontWeight: '700',
    fontSize: Theme.typography.small,
  },
  rangePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: Theme.spacing.s,
  },
  rangePill: {
    flex: 1,
    backgroundColor: Theme.colors.surfaceGrey,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  rangePillLabel: {
    fontSize: Theme.typography.small,
    color: Theme.colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  rangePillValue: {
    fontSize: Theme.typography.body,
    color: Theme.colors.textDark,
    fontWeight: '700',
  },
  rangeHint: {
    fontSize: Theme.typography.caption,
    color: Theme.colors.accentOrange,
    fontWeight: '600',
    marginBottom: Theme.spacing.s,
  },
  weekdaysHint: {
    fontSize: Theme.typography.caption,
    color: Theme.colors.textLight,
    marginBottom: Theme.spacing.s,
    lineHeight: 18,
  },
});
