import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { format } from 'date-fns';
import { router, useLocalSearchParams, useSegments } from 'expo-router';
import { addMedRoute, resolveMedsFlowScope } from '../../../../utils/medsFlowNavigation';
import { addMedPrefillParams, initialRegularWeekdays, readAddMedPrefill } from '../../../../utils/addMedPrefill';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getScreenBottomPadding } from '../../../../utils/safeAreaInsets';
import { Theme } from '../../../../constants/theme';
import type { MedScheduleType } from '../../../../context/MedsContext';
import { ScheduleTimingIllustration } from '../../../../components/caretaker/ScheduleTimingIllustration';
import { HugeButton } from '../../../../components/HugeButton';
import {
  WEEKDAY_IDS,
  addMedCalendarTheme,
  buildTempRangeMarks,
  compareYmd,
} from '../../../../utils/scheduleDateHelpers';
import { useTranslation } from 'react-i18next';

function paramString(v?: string | string[]): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

export default function PickScheduleTimingScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    dependentId?: string;
    treatmentId?: string;
    medType?: string;
    prefillDate?: string;
    prefillTime?: string;
  }>();

  const dependentId = paramString(params.dependentId);
  const treatmentId = paramString(params.treatmentId);
  const medTypeParam = paramString(params.medType);
  const prefill = readAddMedPrefill(params);
  const medType: MedScheduleType | null =
    medTypeParam === 'ONCE' || medTypeParam === 'REGULAR' || medTypeParam === 'TEMPORARY'
      ? medTypeParam
      : null;

  const today = format(new Date(), 'yyyy-MM-dd');
  const prefillStartDate = prefill.prefillDate ?? today;
  const [selectedDate, setSelectedDate] = useState(prefill.prefillDate ?? today);
  const [selectedDays, setSelectedDays] = useState<number[]>(() =>
    medType === 'REGULAR' ? initialRegularWeekdays(prefill.prefillDate) : [],
  );
  const [tempStart, setTempStart] = useState(prefillStartDate);
  const [tempEnd, setTempEnd] = useState(prefillStartDate);
  const [tempSelectingStart, setTempSelectingStart] = useState(!prefill.prefillDate);
  const [tempRangeComplete, setTempRangeComplete] = useState(false);

  useEffect(() => {
    if (medType !== 'TEMPORARY') return;
    const start = prefill.prefillDate ?? today;
    setTempStart(start);
    setTempEnd(start);
    setTempSelectingStart(!prefill.prefillDate);
    setTempRangeComplete(false);
  }, [medType, today, prefill.prefillDate]);

  useEffect(() => {
    if (medType !== 'REGULAR') return;
    setSelectedDays(initialRegularWeekdays(prefill.prefillDate));
  }, [medType, prefill.prefillDate]);

  const leadKey =
    medType === 'ONCE'
      ? 'schedule.add.pickTimingLeadOnce'
      : medType === 'REGULAR'
        ? 'schedule.add.pickTimingLeadRegular'
        : 'schedule.add.pickTimingLeadPeriod';

  const titleKey =
    medType === 'ONCE'
      ? 'schedule.add.pickTimingTitleOnce'
      : medType === 'REGULAR'
        ? 'schedule.add.pickTimingTitleRegular'
        : 'schedule.add.pickTimingTitlePeriod';

  const canContinue = useMemo(() => {
    if (!medType) return false;
    if (medType === 'ONCE') return Boolean(selectedDate) && compareYmd(selectedDate, today) >= 0;
    if (medType === 'REGULAR') return selectedDays.length > 0;
    if (medType === 'TEMPORARY') return tempRangeComplete;
    return false;
  }, [medType, selectedDate, today, selectedDays, tempRangeComplete]);

  const tempRangeMarks = useMemo(
    () => buildTempRangeMarks(tempStart, tempEnd),
    [tempStart, tempEnd],
  );

  const toggleDay = (id: number) => {
    setSelectedDays(prev => (prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]));
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
    const start = prefill.prefillDate ?? today;
    setTempStart(start);
    setTempEnd(start);
    setTempSelectingStart(!prefill.prefillDate);
    setTempRangeComplete(false);
  };

  const segments = useSegments();
  const flowScope = resolveMedsFlowScope(segments as string[]);
  const schedulePath = addMedRoute(flowScope, 'schedule');

  const handleContinue = () => {
    if (!canContinue || !dependentId || !treatmentId || !medType) return;

    const base = { dependentId, treatmentId, medType, ...addMedPrefillParams(prefill) } as const;
    if (medType === 'ONCE') {
      router.push({
        pathname: schedulePath,
        params: { ...base, startDate: selectedDate },
      } as never);
      return;
    }
    if (medType === 'REGULAR') {
      router.push({
        pathname: schedulePath,
        // Dla zgodności z filtrem w widoku dnia/month:
        // startDate ma pochodzić z daty wybranej w kalendarzu (prefillDate),
        // a nie z domyślnego "dzisiaj" w ekranie schedule.
        params: { ...base, startDate: selectedDate, daysOfWeek: selectedDays.join(',') },
      } as never);
      return;
    }
    router.push({
      pathname: schedulePath,
      params: {
        ...base,
        startDate: tempStart,
        endDate: tempEnd,
        daysOfWeek: selectedDays.length > 0 ? selectedDays.join(',') : '1,2,3,4,5,6,7',
      },
    } as never);
  };

  if (!dependentId || !treatmentId || !medType) {
    router.back();
    return null;
  }

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} accessibilityLabel={t('common.back')}>
          <MaterialIcons name="arrow-back" size={28} color={Theme.colors.textDark} />
        </Pressable>
        <Text style={styles.headerTitle}>{t(titleKey)}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ScheduleTimingIllustration width={156} height={124} />
        <Text style={styles.lead}>{t(leadKey)}</Text>

        {medType === 'ONCE' && (
          <View style={styles.calendarWrapper}>
            <Calendar
              current={selectedDate}
              minDate={today}
              onDayPress={day => {
                if (compareYmd(day.dateString, today) < 0) return;
                setSelectedDate(day.dateString);
              }}
              markedDates={{ [selectedDate]: { selected: true } }}
              theme={addMedCalendarTheme}
              hideExtraDays
            />
          </View>
        )}

        {medType === 'REGULAR' && (
          <View style={styles.weekdaysBlock}>
            <Text style={styles.sectionLabel}>{t('schedule.add.weekdays')}</Text>
            <View style={styles.daysRow}>
              {WEEKDAY_IDS.map(dayNum => {
                const isActive = selectedDays.includes(dayNum);
                return (
                  <Pressable
                    key={dayNum}
                    style={[styles.dayCircle, isActive && styles.dayCircleActive]}
                    onPress={() => toggleDay(dayNum)}
                  >
                    <Text style={[styles.dayText, isActive && styles.dayTextActive]}>
                      {t(`calendar.weekdayShort.${dayNum}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {medType === 'TEMPORARY' && (
          <>
            <View style={styles.rangeHeader}>
              <Text style={styles.sectionLabel}>{t('schedule.add.periodTitle')}</Text>
              <Pressable onPress={resetTempRange} style={styles.resetBtn} hitSlop={8}>
                <MaterialIcons name="refresh" size={16} color={Theme.colors.primaryLimeDark} />
                <Text style={styles.resetBtnText}>{t('schedule.add.clear')}</Text>
              </Pressable>
            </View>
            <View style={styles.rangePreview}>
              <View style={styles.rangePill}>
                <Text style={styles.rangePillLabel}>{t('schedule.add.from')}</Text>
                <Text style={styles.rangePillValue}>{tempStart}</Text>
              </View>
              <MaterialIcons name="arrow-forward" size={18} color={Theme.colors.textLight} />
              <View style={styles.rangePill}>
                <Text style={styles.rangePillLabel}>{t('schedule.add.to')}</Text>
                <Text style={styles.rangePillValue}>{tempEnd}</Text>
              </View>
            </View>
            <Text style={styles.rangeHint}>
              {tempRangeComplete
                ? t('schedule.add.rangeSet')
                : tempSelectingStart
                  ? t('schedule.add.rangeStart')
                  : t('schedule.add.rangeEnd')}
            </Text>
            <View style={styles.calendarPeriodWrapper}>
              <Calendar
                current={tempStart}
                minDate={today}
                enableSwipeMonths
                onDayPress={day => handleTempDayPress(day.dateString)}
                markingType="period"
                markedDates={tempRangeMarks}
                theme={addMedCalendarTheme}
              />
            </View>

            <Text style={[styles.sectionLabel, { marginTop: Theme.spacing.l }]}>
              {t('schedule.add.weekdaysOptional')}
            </Text>
            <Text style={styles.weekdaysHint}>{t('schedule.add.weekdaysHint')}</Text>
            <View style={styles.daysRow}>
              {WEEKDAY_IDS.map(dayNum => {
                const isActive = selectedDays.includes(dayNum);
                return (
                  <Pressable
                    key={dayNum}
                    style={[styles.dayCircle, isActive && styles.dayCircleActive]}
                    onPress={() => toggleDay(dayNum)}
                  >
                    <Text style={[styles.dayText, isActive && styles.dayTextActive]}>
                      {t(`calendar.weekdayShort.${dayNum}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: getScreenBottomPadding(insets.bottom, Theme.spacing.m) }]}>
        <HugeButton
          title={t('schedule.add.continue')}
          onPress={handleContinue}
          disabled={!canContinue}
          style={styles.continueBtn}
        />
      </View>
    </View>
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
    paddingHorizontal: Theme.spacing.m,
    paddingBottom: Theme.spacing.s,
  },
  iconBtn: {
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: Theme.typography.title,
    fontWeight: '800',
    color: Theme.colors.textDark,
  },
  headerSpacer: {
    width: 48,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Theme.spacing.l,
    paddingBottom: Theme.spacing.l,
    alignItems: 'center',
  },
  lead: {
    marginTop: Theme.spacing.s,
    marginBottom: Theme.spacing.m,
    fontSize: Theme.typography.body,
    color: Theme.colors.textLight,
    textAlign: 'center',
    lineHeight: 22,
    width: '100%',
  },
  sectionLabel: {
    width: '100%',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '700',
    color: Theme.colors.textLight,
    marginBottom: Theme.spacing.s,
  },
  calendarWrapper: {
    width: '100%',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 16,
    overflow: 'hidden',
    paddingBottom: 10,
  },
  calendarPeriodWrapper: {
    width: '100%',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 16,
    overflow: 'visible',
    paddingBottom: 10,
  },
  weekdaysBlock: {
    width: '100%',
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  dayCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.colors.calendarCell,
  },
  dayCircleActive: {
    backgroundColor: Theme.colors.primaryLimeDark,
    borderColor: Theme.colors.primaryLimeDark,
  },
  dayText: {
    fontWeight: '600',
    color: Theme.colors.textDark,
    fontSize: Theme.typography.small,
  },
  dayTextActive: {
    color: Theme.colors.surfaceWhite,
  },
  rangeHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    width: '100%',
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
    width: '100%',
    fontSize: Theme.typography.caption,
    color: Theme.colors.accentOrange,
    fontWeight: '600',
    marginBottom: Theme.spacing.s,
  },
  weekdaysHint: {
    width: '100%',
    fontSize: Theme.typography.caption,
    color: Theme.colors.textLight,
    marginBottom: Theme.spacing.s,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: Theme.spacing.l,
    paddingTop: Theme.spacing.m,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Theme.colors.border,
    backgroundColor: Theme.colors.background,
  },
  continueBtn: {
    width: '100%',
    minHeight: 56,
  },
});
