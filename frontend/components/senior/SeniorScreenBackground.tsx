import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { SeniorSurfaceColors } from '../../context/DependentDisplayContext';

type Props = {
  colors: SeniorSurfaceColors;
  children: React.ReactNode;
};

/** Jednolite, gładkie tło — bez gradientu i dekoracji. */
export function SeniorScreenBackground({ colors, children }: Props) {
  return (
    <View style={[styles.root, { backgroundColor: colors.surfaceGrey }]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
