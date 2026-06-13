import React, { useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/theme';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function useHoldRepeater(onStep: () => void) {
  const onStepRef = useRef(onStep);
  onStepRef.current = onStep;
  const holdDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatCountRef = useRef(0);

  const clear = useCallback(() => {
    if (holdDelayRef.current) clearTimeout(holdDelayRef.current);
    if (repeatRef.current) clearTimeout(repeatRef.current);
    holdDelayRef.current = null;
    repeatRef.current = null;
    repeatCountRef.current = 0;
  }, []);

  const onPressIn = useCallback(() => {
    clear();
    onStepRef.current();
    holdDelayRef.current = setTimeout(() => {
      const tick = () => {
        onStepRef.current();
        repeatCountRef.current += 1;
        const delay =
          repeatCountRef.current > 16 ? 45 : repeatCountRef.current > 6 ? 90 : 170;
        repeatRef.current = setTimeout(tick, delay);
      };
      tick();
    }, 420);
  }, [clear]);

  useEffect(() => clear, [clear]);

  return { onPressIn, onPressOut: clear };
}

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  compact?: boolean;
};

export function SeniorNumericStepper({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
  compact = false,
}: Props) {
  const bump = useCallback(
    (direction: 1 | -1) => {
      onChange(clamp(value + direction * step, min, max));
    },
    [max, min, onChange, step, value],
  );

  const up = useHoldRepeater(() => bump(1));
  const down = useHoldRepeater(() => bump(-1));
  const atMin = value <= min;
  const atMax = value >= max;

  return (
    <View style={[styles.block, compact && styles.blockCompact]}>
      <Text style={[styles.label, compact && styles.labelCompact]} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.card}>
        <Pressable
          disabled={atMax}
          onPressIn={up.onPressIn}
          onPressOut={up.onPressOut}
          style={({ pressed }) => [
            styles.arrowBtn,
            atMax && styles.arrowBtnDisabled,
            pressed && !atMax && styles.arrowBtnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`${label} +`}
        >
          <MaterialIcons name="keyboard-arrow-up" size={compact ? 36 : 44} color={Theme.colors.primaryLimeDark} />
        </Pressable>

        <View style={styles.valueWrap}>
          <Text style={[styles.value, compact && styles.valueCompact]}>{value}</Text>
          {unit ? <Text style={[styles.unit, compact && styles.unitCompact]}>{unit}</Text> : null}
        </View>

        <Pressable
          disabled={atMin}
          onPressIn={down.onPressIn}
          onPressOut={down.onPressOut}
          style={({ pressed }) => [
            styles.arrowBtn,
            atMin && styles.arrowBtnDisabled,
            pressed && !atMin && styles.arrowBtnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`${label} -`}
        >
          <MaterialIcons name="keyboard-arrow-down" size={compact ? 36 : 44} color={Theme.colors.primaryLimeDark} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    flex: 1,
    minWidth: 0,
  },
  blockCompact: {
    flex: 0,
    width: '100%',
  },
  label: {
    fontSize: 18,
    fontWeight: '800',
    color: Theme.colors.textDark,
    textAlign: 'center',
    marginBottom: Theme.spacing.xs,
  },
  labelCompact: {
    fontSize: 16,
  },
  card: {
    backgroundColor: Theme.colors.calendarCell,
    borderRadius: Theme.borderRadius.large,
    borderWidth: 2,
    borderColor: Theme.colors.primaryLimeDark,
    paddingVertical: Theme.spacing.xs,
    alignItems: 'center',
  },
  arrowBtn: {
    width: '100%',
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  arrowBtnPressed: {
    backgroundColor: Theme.colors.primaryLime + '55',
  },
  arrowBtnDisabled: {
    opacity: 0.35,
  },
  valueWrap: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.xs,
    minHeight: 72,
    justifyContent: 'center',
  },
  value: {
    fontSize: 48,
    fontWeight: '900',
    color: Theme.colors.textDark,
    lineHeight: 52,
  },
  valueCompact: {
    fontSize: 44,
    lineHeight: 48,
  },
  unit: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.textLight,
  },
  unitCompact: {
    fontSize: 14,
  },
});
