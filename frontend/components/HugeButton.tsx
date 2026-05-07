import React from 'react';
import { Text, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { Theme } from '../constants/theme';

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'success' | 'warning' | 'outline';
  size?: 'normal' | 'huge';
  disabled?: boolean;
  style?: ViewStyle;
}

export function HugeButton({ title, onPress, variant = 'primary', size = 'normal', disabled, style }: Props) {
  
  const getBackgroundColor = () => {
    if (disabled) return Theme.colors.surfaceGrey;
    if (variant === 'success') return Theme.colors.primaryLime;
    if (variant === 'warning') return Theme.colors.accentOrange;
    if (variant === 'outline') return 'transparent';
    return Theme.colors.primaryLimeDark;
  };

  const getTextColor = () => {
    if (disabled) return Theme.colors.textLight;
    if (variant === 'outline') return Theme.colors.primaryLimeDark;
    if (variant === 'success') return Theme.colors.textDark; // Ciemny napis na limonkowym tle
    return Theme.colors.surfaceWhite;
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: getBackgroundColor() },
        size === 'huge' && styles.hugeContainer,
        variant === 'outline' && styles.outline,
        pressed && { opacity: 0.8 },
        style
      ]}
    >
      <Text style={[
        styles.text,
        { color: getTextColor() },
        size === 'huge' && styles.hugeText
      ]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: Theme.borderRadius.large,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.l,
    paddingVertical: Theme.spacing.m,
    minHeight: 64,
  },
  outline: {
    borderWidth: 2,
    borderColor: Theme.colors.primaryLimeDark,
  },
  hugeContainer: {
    width: '100%',
    minHeight: 120,
  },
  text: {
    fontSize: Theme.typography.title,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  hugeText: {
    fontSize: Theme.typography.largeTitle,
  }
});
