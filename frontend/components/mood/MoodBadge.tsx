import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { Theme } from '../../constants/theme';
import { parseMood } from '../../constants/moodVisual';
import { MoodIcon } from './MoodIcon';

type MoodBadgeProps = {
  mood: string;
  subtitle?: string;
  style?: ViewStyle;
};

export function MoodBadge({ mood, subtitle, style }: MoodBadgeProps) {
  const parsed = parseMood(mood);
  if (!parsed) return null;

  return (
    <View style={[styles.chip, style]}>
      <MoodIcon mood={parsed} size="sm" />
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingRight: 12,
    paddingLeft: 4,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.round,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.surfaceWhite,
  },
  subtitle: {
    fontSize: Theme.typography.caption,
    fontWeight: '700',
    color: Theme.colors.textDark,
  },
});
