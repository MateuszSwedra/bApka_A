import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/theme';
import { formatTimeParts, parseTimeParts } from '../TimeScrollPicker';
import { useTranslation } from 'react-i18next';

export type FriendlyTimePickerRef = {
  getTime: () => { hour: number; minute: number };
};

type Props = {
  hour: number;
  minute: number;
  onHourChange: (h: number) => void;
  onMinuteChange: (m: number) => void;
};

const PRESET_TIMES = ['07:00', '08:00', '12:00', '14:00', '18:00', '20:00', '21:00'];

function clampHour(h: number) {
  return ((h % 24) + 24) % 24;
}

function clampMinute(m: number) {
  return ((m % 60) + 60) % 60;
}

export const FriendlyTimePicker = React.forwardRef<FriendlyTimePickerRef, Props>(
  function FriendlyTimePicker({ hour, minute, onHourChange, onMinuteChange }, ref) {
    const { t } = useTranslation();

    React.useImperativeHandle(ref, () => ({
      getTime: () => ({ hour, minute }),
    }));

    const display = formatTimeParts(hour, minute);

    const applyPreset = useCallback(
      (time: string) => {
        const { hour: h, minute: m } = parseTimeParts(time);
        onHourChange(h);
        onMinuteChange(m);
      },
      [onHourChange, onMinuteChange],
    );

    const stepHour = useCallback(
      (delta: number) => onHourChange(clampHour(hour + delta)),
      [hour, onHourChange],
    );

    const stepMinute = useCallback(
      (delta: number) => onMinuteChange(clampMinute(minute + delta)),
      [minute, onMinuteChange],
    );

    const presetActive = useMemo(
      () => (time: string) => formatTimeParts(hour, minute) === time,
      [hour, minute],
    );

    return (
      <View style={styles.card}>
        <Text style={styles.bigTime}>{display}</Text>
        <Text style={styles.hint}>{t('schedule.add.timeHint')}</Text>

        <Text style={styles.presetsLabel}>{t('schedule.add.timePresets')}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetsRow}
        >
          {PRESET_TIMES.map(time => {
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

        <View style={styles.steppersRow}>
          <Stepper
            label={t('common.hour')}
            value={hour}
            max={23}
            onChange={onHourChange}
            onMinus={() => stepHour(-1)}
            onPlus={() => stepHour(1)}
          />
          <Stepper
            label={t('common.minute')}
            value={minute}
            max={59}
            onChange={onMinuteChange}
            onMinus={() => stepMinute(-1)}
            onPlus={() => stepMinute(1)}
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
  onChange,
  onMinus,
  onPlus,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (n: number) => void;
  onMinus: () => void;
  onPlus: () => void;
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
    onChange(clamped);
    setDraft(clamped.toString().padStart(2, '0'));
  };

  return (
    <View style={styles.stepperCol}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        <Pressable onPress={onMinus} style={styles.stepBtn} accessibilityRole="button">
          <MaterialIcons name="remove" size={22} color={Theme.colors.primaryLimeDark} />
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
    width: 118,
    alignItems: 'center',
    flexShrink: 0,
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
