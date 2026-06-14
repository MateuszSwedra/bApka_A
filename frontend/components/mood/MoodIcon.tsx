import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MOOD_VISUAL, type MoodValue } from '../../constants/moodVisual';

type MoodIconProps = {
  mood: MoodValue;
  size?: 'sm' | 'md' | 'lg';
  selected?: boolean;
  style?: ViewStyle;
};

const SIZES = {
  sm: { wrap: 32, icon: 20, border: 1.5 },
  md: { wrap: 44, icon: 28, border: 2 },
  lg: { wrap: 72, icon: 44, border: 2.5 },
} as const;

export function MoodIcon({ mood, size = 'md', selected = false, style }: MoodIconProps) {
  const visual = MOOD_VISUAL[mood];
  const dim = SIZES[size];

  return (
    <View
      style={[
        styles.wrap,
        {
          width: dim.wrap,
          height: dim.wrap,
          borderRadius: dim.wrap / 2,
          backgroundColor: visual.background,
          borderColor: selected ? visual.color : visual.ring,
          borderWidth: selected ? dim.border + 0.5 : dim.border,
        },
        selected && styles.selected,
        style,
      ]}
    >
      <MaterialCommunityIcons
        name={visual.icon}
        size={dim.icon}
        color={visual.color}
        style={{ width: dim.icon, height: dim.icon, textAlign: 'center' }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  selected: {
    transform: [{ scale: 1.04 }],
  },
});
