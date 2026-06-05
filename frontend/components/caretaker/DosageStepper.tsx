import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/theme';
import { useTranslation } from 'react-i18next';

type Props = {
  value: string;
  onChange: (next: string) => void;
  label: string;
};

function parseCount(raw: string): number {
  const n = parseInt(raw.replace(/[^0-9]/g, ''), 10);
  return !n || n < 1 ? 1 : Math.min(n, 99);
}

export function DosageStepper({ value, onChange, label }: Props) {
  const { t } = useTranslation();
  const count = parseCount(value);

  const setCount = (n: number) => onChange(String(Math.max(1, Math.min(99, n))));

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Pressable
          onPress={() => setCount(count - 1)}
          style={styles.btn}
          accessibilityRole="button"
          accessibilityLabel="-"
        >
          <MaterialIcons name="remove" size={28} color={Theme.colors.primaryLimeDark} />
        </Pressable>
        <View style={styles.valueBox}>
          <Text style={styles.value}>{count}</Text>
          <Text style={styles.unit}>{t('schedule.add.dosageUnit')}</Text>
        </View>
        <Pressable
          onPress={() => setCount(count + 1)}
          style={styles.btn}
          accessibilityRole="button"
          accessibilityLabel="+"
        >
          <MaterialIcons name="add" size={28} color={Theme.colors.primaryLimeDark} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    marginTop: Theme.spacing.l,
  },
  label: {
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '700',
    color: Theme.colors.textLight,
    marginBottom: Theme.spacing.s,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.m,
  },
  btn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Theme.colors.surfaceWhite,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  valueBox: {
    minWidth: 100,
    paddingHorizontal: Theme.spacing.l,
    paddingVertical: Theme.spacing.m,
    borderRadius: Theme.borderRadius.large,
    backgroundColor: Theme.colors.calendarCell,
    borderWidth: 2,
    borderColor: Theme.colors.accentOrange,
    alignItems: 'center',
  },
  value: {
    fontSize: 40,
    fontWeight: '800',
    color: Theme.colors.textDark,
  },
  unit: {
    fontSize: Theme.typography.caption,
    color: Theme.colors.textLight,
    fontWeight: '600',
    marginTop: 2,
  },
});
