import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Theme } from '../../constants/theme';

export default function MedsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Meds</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Theme.colors.background },
  title: { fontSize: Theme.typography.title, color: Theme.colors.textDark, fontWeight: 'bold' }
});
