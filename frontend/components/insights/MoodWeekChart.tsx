import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Theme } from '../../constants/theme';
import { MoodIcon } from '../mood/MoodIcon';
import type { MoodDayCell } from '../../utils/moodWeekChart';

type Props = {
  days: MoodDayCell[];
  subtitle?: string;
};

export function MoodWeekChart({ days, subtitle }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const useScroll = days.length > 7;
  const colMinWidth = days.length <= 7 ? undefined : 44;

  useEffect(() => {
    if (!useScroll) return;
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: false });
    }, 50);
    return () => clearTimeout(timer);
  }, [useScroll, days.length]);

  if (days.length === 0) return null;

  const row = (
    <View style={[styles.row, useScroll && styles.rowScroll]}>
      {days.map(day => (
        <View
          key={day.dayKey}
          style={[styles.col, colMinWidth != null && { minWidth: colMinWidth }]}
        >
          <Text style={styles.dayLabel} numberOfLines={1}>
            {day.dayLabel}
          </Text>
          {day.mood ? (
            <MoodIcon mood={day.mood} size="sm" />
          ) : (
            <View style={styles.emptyIcon} accessibilityLabel="—">
              <View style={styles.emptyFace} />
            </View>
          )}
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.wrap}>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {useScroll ? (
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {row}
        </ScrollView>
      ) : (
        row
      )}
    </View>
  );
}

const EMPTY_SIZE = 32;

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  subtitle: {
    fontSize: Theme.typography.caption,
    color: Theme.colors.textLight,
    marginBottom: Theme.spacing.m,
    textAlign: 'right',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    width: '100%',
  },
  rowScroll: {
    justifyContent: 'flex-start',
    gap: 8,
    paddingHorizontal: 2,
  },
  scrollContent: {
    paddingVertical: 4,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  col: {
    flex: 1,
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  dayLabel: {
    fontSize: Theme.typography.caption,
    fontWeight: '600',
    color: Theme.colors.textLight,
    textTransform: 'capitalize',
  },
  emptyIcon: {
    width: EMPTY_SIZE,
    height: EMPTY_SIZE,
    borderRadius: EMPTY_SIZE / 2,
    backgroundColor: Theme.colors.surfaceGrey,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyFace: {
    width: 10,
    height: 2,
    borderRadius: 1,
    backgroundColor: Theme.colors.textLight,
    opacity: 0.45,
  },
});
