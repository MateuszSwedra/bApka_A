import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Theme } from '../../constants/theme';
import type { VitalsDayGroup } from '../../utils/vitalsInsights';

type Props = {
  days: VitalsDayGroup[];
  title?: string;
};

export function VitalsDailyList({ days, title }: Props) {
  if (days.length === 0) return null;

  return (
    <View style={styles.wrap}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {days.map((day) => (
        <View key={day.dayKey} style={styles.dayBlock}>
          <Text style={styles.dayLabel}>{day.dayLabel}</Text>
          {day.entries.map((entry, idx) => (
            <View key={`${day.dayKey}-${idx}`} style={styles.entryRow}>
              <Text style={styles.time}>{entry.time}</Text>
              <Text style={styles.value}>{entry.text}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: Theme.spacing.m,
    paddingTop: Theme.spacing.m,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    gap: Theme.spacing.s,
  },
  title: {
    fontSize: Theme.typography.caption,
    fontWeight: '700',
    color: Theme.colors.textDark,
    marginBottom: 4,
  },
  dayBlock: {
    gap: 4,
  },
  dayLabel: {
    fontSize: Theme.typography.small,
    fontWeight: '700',
    color: Theme.colors.textDark,
    textTransform: 'capitalize',
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 4,
  },
  time: {
    width: 44,
    fontSize: Theme.typography.small,
    fontWeight: '600',
    color: Theme.colors.textLight,
    fontVariant: ['tabular-nums'],
  },
  value: {
    flex: 1,
    fontSize: Theme.typography.small,
    fontWeight: '600',
    color: Theme.colors.textDark,
  },
});
