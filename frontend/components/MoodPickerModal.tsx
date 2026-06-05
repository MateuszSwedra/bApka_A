import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import { Theme } from '../constants/theme';
import { MoodIcon } from './mood/MoodIcon';
import type { MoodValue } from '../constants/moodVisual';

interface Props {
  visible: boolean;
  onPick: (mood: MoodValue) => void;
  onClose: () => void;
}

const MOODS: { key: MoodValue; label: string }[] = [
  { key: 'sad', label: 'Smutny' },
  { key: 'neutral', label: 'Neutralny' },
  { key: 'happy', label: 'Wesoły' },
];

export function MoodPickerModal({ visible, onPick, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Jak się dziś czujesz?</Text>
          <Text style={styles.subtitle}>Wybierz buzię</Text>
          <View style={styles.row}>
            {MOODS.map(m => (
              <Pressable
                key={m.key}
                onPress={() => onPick(m.key)}
                style={({ pressed }) => [styles.faceBtn, pressed && styles.pressed]}
              >
                <MoodIcon mood={m.key} size="lg" />
                <Text style={styles.faceLabel}>{m.label}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={onClose} style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}>
            <Text style={styles.closeText}>Anuluj</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(27, 60, 83, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.l,
  },
  card: {
    backgroundColor: Theme.colors.surfaceWhite,
    borderRadius: Theme.borderRadius.xlarge,
    padding: Theme.spacing.xl,
    width: '100%',
    maxWidth: 420,
    borderWidth: 2,
    borderColor: Theme.colors.textDark,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: Theme.colors.textDark,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Theme.colors.textLight,
    textAlign: 'center',
    marginTop: Theme.spacing.xs,
    marginBottom: Theme.spacing.l,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Theme.spacing.l,
  },
  faceBtn: {
    alignItems: 'center',
    padding: Theme.spacing.m,
    borderRadius: Theme.borderRadius.large,
    minWidth: 96,
  },
  faceLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.textDark,
    marginTop: Theme.spacing.s,
  },
  closeBtn: {
    alignSelf: 'center',
    paddingVertical: Theme.spacing.s,
    paddingHorizontal: Theme.spacing.l,
  },
  closeText: {
    fontSize: 18,
    fontWeight: '700',
    color: Theme.colors.textLight,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
});
