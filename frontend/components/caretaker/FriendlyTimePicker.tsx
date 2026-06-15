import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/theme';
import { formatTimeParts, parseTimeParts } from '../TimeScrollPicker';
import { useTranslation } from 'react-i18next';
import { isTimeBeforeMin } from '../../utils/scheduleDateHelpers';

export type FriendlyTimePickerRef = {
  getTime: () => { hour: number; minute: number };
};

type MinTime = { hour: number; minute: number };

type Props = {
  hour: number;
  minute: number;
  onHourChange: (h: number) => void;
  onMinuteChange: (m: number) => void;
  /** Minimalna godzina (np. „dziś” = teraz). */
  minTime?: MinTime;
};

const PRESET_TIMES = ['07:00', '08:00', '12:00', '14:00', '18:00', '20:00', '21:00'];

function clampHour(h: number) {
  return ((h % 24) + 24) % 24;
}

function clampMinute(m: number) {
  return ((m % 60) + 60) % 60;
}

function clampToMin(h: number, m: number, min?: MinTime): { hour: number; minute: number } {
  if (!min) return { hour: h, minute: m };
  if (!isTimeBeforeMin(h, m, min)) return { hour: h, minute: m };
  return { hour: min.hour, minute: min.minute };
}

export const FriendlyTimePicker = React.forwardRef<FriendlyTimePickerRef, Props>(
  function FriendlyTimePicker({ hour, minute, onHourChange, onMinuteChange, minTime }, ref) {
    const { t } = useTranslation();

    React.useImperativeHandle(ref, () => ({
      getTime: () => clampToMin(hour, minute, minTime),
    }));

    useEffect(() => {
      if (!minTime) return;
      const clamped = clampToMin(hour, minute, minTime);
      if (clamped.hour !== hour) onHourChange(clamped.hour);
      if (clamped.minute !== minute) onMinuteChange(clamped.minute);
    }, [minTime?.hour, minTime?.minute]);

    const display = formatTimeParts(hour, minute);

    const visiblePresets = useMemo(() => {
      if (!minTime) return PRESET_TIMES;
      return PRESET_TIMES.filter(time => {
        const { hour: h, minute: m } = parseTimeParts(time);
        return !isTimeBeforeMin(h, m, minTime);
      });
    }, [minTime]);

    const applyPreset = useCallback(
      (time: string) => {
        const { hour: h, minute: m } = parseTimeParts(time);
        const clamped = clampToMin(h, m, minTime);
        onHourChange(clamped.hour);
        onMinuteChange(clamped.minute);
      },
      [minTime, onHourChange, onMinuteChange],
    );

    const setHourClamped = useCallback(
      (h: number) => {
        const clamped = clampToMin(h, minute, minTime);
        onHourChange(clamped.hour);
        onMinuteChange(clamped.minute);
      },
      [minute, minTime, onHourChange, onMinuteChange],
    );

    const setMinuteClamped = useCallback(
      (m: number) => {
        const clamped = clampToMin(hour, m, minTime);
        onHourChange(clamped.hour);
        onMinuteChange(clamped.minute);
      },
      [hour, minTime, onHourChange, onMinuteChange],
    );

    const stepHour = useCallback(
      (delta: number) => {
        const next = clampHour(hour + delta);
        const clamped = clampToMin(next, minute, minTime);
        onHourChange(clamped.hour);
        onMinuteChange(clamped.minute);
      },
      [hour, minute, minTime, onHourChange, onMinuteChange],
    );

    const stepMinute = useCallback(
      (delta: number) => {
        const next = clampMinute(minute + delta);
        const clamped = clampToMin(hour, next, minTime);
        onHourChange(clamped.hour);
        onMinuteChange(clamped.minute);
      },
      [hour, minute, minTime, onHourChange, onMinuteChange],
    );

    const presetActive = useMemo(
      () => (time: string) => formatTimeParts(hour, minute) === time,
      [hour, minute],
    );

    const hourAtMin =
      minTime != null && hour === minTime.hour && minute === minTime.minute;
    const minuteAtMin =
      minTime != null && hour === minTime.hour && minute === minTime.minute;

    return (
      <View style={styles.card}>
        <Text style={styles.bigTime}>{display}</Text>
        <Text style={styles.hint}>{t('schedule.add.timeHint')}</Text>

        {visiblePresets.length > 0 ? (
          <>
            <Text style={styles.presetsLabel}>{t('schedule.add.timePresets')}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.presetsRow}
            >
              {visiblePresets.map(time => {
                const active = presetActive(time);
                return (
                  <Pressable
                    key={time}
                    onPress={() => applyPreset(time)}
                    style={[styles.presetChip, active && styles.presetChipActive]}
                  >
                    <Text style={[styles.presetText, active && styles.presetTextActive]}>{time}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        ) : null}

        <View style={styles.steppersRow}>
          <Stepper
            label={t('common.hour')}
            value={hour}
            max={23}
            minTime={minTime}
            isHour
            onChange={setHourClamped}
            onMinus={() => stepHour(-1)}
            onPlus={() => stepHour(1)}
            minusDisabled={hourAtMin}
          />
          <Stepper
            label={t('common.minute')}
            value={minute}
            max={59}
            minTime={minTime}
            pairedHour={hour}
            onChange={setMinuteClamped}
            onMinus={() => stepMinute(-1)}
            onPlus={() => stepMinute(1)}
            minusDisabled={minuteAtMin}
          />
        </View>
      </View>
    );
  },
);

function Stepper({
  label,
  value,
  max,
  minTime,
  isHour,
  pairedHour,
  onChange,
  onMinus,
  onPlus,
  minusDisabled,
}: {
  label: string;
  value: number;
  max: number;
  minTime?: MinTime;
  isHour?: boolean;
  pairedHour?: number;
  onChange: (n: number) => void;
  onMinus: () => void;
  onPlus: () => void;
  minusDisabled?: boolean;
}) {
  const padded = value.toString().padStart(2, '0');
  const [draft, setDraft] = useState(padded);

  useEffect(() => {
    setDraft(padded);
  }, [padded]);

  const commitDraft = (text: string) => {
    const digits = text.replace(/\D/g, '');
    if (digits.length === 0) {
      setDraft(padded);
      return;
    }
    const parsed = parseInt(digits, 10);
    if (Number.isNaN(parsed)) {
      setDraft(padded);
      return;
    }
    const clamped = max === 23 ? clampHour(parsed) : clampMinute(parsed);
    if (minTime) {
      const h = isHour ? clamped : (pairedHour ?? 0);
      const m = isHour ? 0 : clamped;
      const safe = clampToMin(h, m, minTime);
      onChange(isHour ? safe.hour : safe.minute);
      setDraft((isHour ? safe.hour : safe.minute).toString().padStart(2, '0'));
      return;
    }
    onChange(clamped);
    setDraft(clamped.toString().padStart(2, '0'));
  };

  return (
    <View style={styles.stepperCol}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        <Pressable
          onPress={onMinus}
          disabled={minusDisabled}
          style={[styles.stepBtn, minusDisabled && styles.stepBtnDisabled]}
          accessibilityRole="button"
        >
          <MaterialIcons
            name="remove"
            size={22}
            color={minusDisabled ? Theme.colors.textLight : Theme.colors.primaryLimeDark}
          />
        </Pressable>
        <View style={styles.stepValueBox}>
          <TextInput
            style={styles.stepValueInput}
            value={draft}
            onChangeText={text => {
              const digits = text.replace(/\D/g, '').slice(0, 2);
              setDraft(digits);
              if (digits.length === 2) {
                commitDraft(digits);
              }
            }}
            onBlur={() => commitDraft(draft)}
            keyboardType="number-pad"
            maxLength={2}
            selectTextOnFocus
            accessibilityLabel={label}
          />
        </View>
        <Pressable onPress={onPlus} style={styles.stepBtn} accessibilityRole="button">
          <MaterialIcons name="add" size={22} color={Theme.colors.primaryLimeDark} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: Theme.colors.calendarCell,
    borderRadius: Theme.borderRadius.large,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.m,
    paddingBottom: Theme.spacing.s,
  },
  bigTime: {
    fontSize: 48,
    fontWeight: '800',
    color: Theme.colors.textDark,
    textAlign: 'center',
    letterSpacing: 2,
  },
  hint: {
    marginTop: Theme.spacing.xs,
    fontSize: Theme.typography.caption,
    color: Theme.colors.textLight,
    textAlign: 'center',
  },
  presetsLabel: {
    marginTop: Theme.spacing.l,
    marginBottom: Theme.spacing.s,
    fontSize: Theme.typography.small,
    fontWeight: '700',
    color: Theme.colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  presetsRow: {
    gap: Theme.spacing.s,
    paddingBottom: Theme.spacing.xs,
  },
  presetChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Theme.borderRadius.round,
    backgroundColor: Theme.colors.surfaceWhite,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    minHeight: 44,
    justifyContent: 'center',
  },
  presetChipActive: {
    backgroundColor: Theme.colors.primaryLime,
    borderColor: Theme.colors.primaryLimeDark,
    borderWidth: 2,
  },
  presetText: {
    fontSize: Theme.typography.body,
    fontWeight: '600',
    color: Theme.colors.textDark,
  },
  presetTextActive: {
    fontWeight: '800',
    color: Theme.colors.primaryLimeDark,
  },
  steppersRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginTop: Theme.spacing.l,
    gap: Theme.spacing.m,
    paddingHorizontal: 4,
  },
  stepperCol: {
    flex: 1,
    minWidth: 148,
    maxWidth: 168,
    alignItems: 'center',
  },
  stepperLabel: {
    fontSize: Theme.typography.small,
    fontWeight: '700',
    color: Theme.colors.textLight,
    marginBottom: Theme.spacing.s,
    textTransform: 'uppercase',
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Theme.colors.surfaceWhite,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBtnDisabled: {
    opacity: 0.45,
  },
  stepValueBox: {
    width: 52,
    height: 44,
    borderRadius: Theme.borderRadius.medium,
    backgroundColor: Theme.colors.surfaceWhite,
    borderWidth: 2,
    borderColor: Theme.colors.primaryLimeDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepValueInput: {
    width: '100%',
    fontSize: 22,
    fontWeight: '800',
    color: Theme.colors.textDark,
    textAlign: 'center',
    padding: 0,
    fontVariant: ['tabular-nums'],
  },
});
