import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Theme } from '../constants/theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'white' | 'grey' | 'lime';
}

export function Card({ children, style, variant = 'white' }: Props) {
  const getBackgroundColor = () => {
    switch (variant) {
      case 'grey': return Theme.colors.surfaceGrey;
      case 'lime': return Theme.colors.primaryLime;
      default: return Theme.colors.surfaceWhite;
    }
  };

  return (
    <View style={[
      styles.card, 
      { backgroundColor: getBackgroundColor() },
      variant === 'white' && styles.bordered,
      style
    ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Theme.borderRadius.large,
    padding: Theme.spacing.l,
    marginVertical: Theme.spacing.s,
    // Usunięto cienie na rzecz płaskiego wyglądu z obrazka
  },
  bordered: {
    borderWidth: 1,
    borderColor: Theme.colors.border,
  }
});
