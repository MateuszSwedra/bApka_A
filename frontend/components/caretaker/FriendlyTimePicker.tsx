import React, { useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/theme';
import {
  TimeScrollPicker,
  formatTimeParts,
  parseTimeParts,
  type TimeScrollPickerRef,
} from '../TimeScrollPicker';
import { useTranslation } from 'react-i18next';

export type FriendlyTimePickerRef = TimeScrollPickerRef;

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
    const innerRef = useRef<TimeScrollPickerRef>(null);

    React.useImperativeHandle(ref, () => ({
      getTime: () => innerRef.current?.getTime() ?? { hour, minute },
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
            value={hour.toString().padStart(2, '0')}
            onMinus={() => stepHour(-1)}
            onPlus={() => stepHour(1)}
          />
          <Text style={styles.stepperColon}>:</Text>
          <Stepper
            label={t('common.minute')}
            value={minute.toString().padStart(2, '0')}
            onMinus={() => stepMinute(-1)}
            onPlus={() => stepMinute(1)}
          />
        </View>

        <Text style={styles.wheelLabel}>{t('schedule.add.timeFineTune')}</Text>
        <TimeScrollPicker
          ref={innerRef}
          hour={hour}
          minute={minute}
          onHourChange={onHourChange}
          onMinuteChange={onMinuteChange}
          surfaceColor={Theme.colors.calendarCell}
        />
      </View>
    );
  },
);

function Stepper({
  label,
  value,
  onMinus,
  onPlus,
}: {
  label: string;
  value: string;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <View style={styles.stepperCol}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        <Pressable onPress={onMinus} style={styles.stepBtn} accessibilityRole="button">
          <MaterialIcons name="remove" size={24} color={Theme.colors.primaryLimeDark} />
        </Pressable>
        <View style={styles.stepValueBox}>
          <Text style={styles.stepValue}>{value}</Text>
        </View>
        <Pressable onPress={onPlus} style={styles.stepBtn} accessibilityRole="button">
          <MaterialIcons name="add" size={24} color={Theme.colors.primaryLimeDark} />
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
    gap: Theme.spacing.s,
  },
  stepperCol: {
    flex: 1,
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
    gap: Theme.spacing.xs,
  },
  stepBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Theme.colors.surfaceWhite,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepValueBox: {
    minWidth: 56,
    height: 48,
    borderRadius: Theme.borderRadius.medium,
    backgroundColor: Theme.colors.surfaceWhite,
    borderWidth: 2,
    borderColor: Theme.colors.primaryLimeDark,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  stepValue: {
    fontSize: 24,
    fontWeight: '800',
    color: Theme.colors.textDark,
  },
  stepperColon: {
    fontSize: 28,
    fontWeight: '800',
    color: Theme.colors.textDark,
    marginBottom: 12,
  },
  wheelLabel: {
    marginTop: Theme.spacing.m,
    marginBottom: 0,
    fontSize: Theme.typography.small,
    fontWeight: '600',
    color: Theme.colors.textLight,
    textAlign: 'center',
  },
});
