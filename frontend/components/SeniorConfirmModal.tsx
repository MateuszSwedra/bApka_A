import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import { Theme } from '../constants/theme';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: string;
}

export function SeniorConfirmModal({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'TAK',
  cancelLabel = 'NIE',
  confirmColor = Theme.colors.primaryLimeDark,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.row}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [styles.btn, styles.btnCancel, pressed && styles.pressed]}
            >
              <Text style={styles.btnCancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.btn,
                { backgroundColor: confirmColor },
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.btnConfirmText}>{confirmLabel}</Text>
            </Pressable>
          </View>
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
    marginBottom: Theme.spacing.m,
  },
  message: {
    fontSize: 22,
    fontWeight: '600',
    color: Theme.colors.textDark,
    textAlign: 'center',
    lineHeight: 30,
    marginBottom: Theme.spacing.xl,
  },
  row: {
    flexDirection: 'row',
    gap: Theme.spacing.m,
  },
  btn: {
    flex: 1,
    minHeight: 64,
    borderRadius: Theme.borderRadius.large,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnCancel: {
    backgroundColor: Theme.colors.surfaceGrey,
    borderWidth: 2,
    borderColor: Theme.colors.textDark,
  },
  btnCancelText: {
    fontSize: 24,
    fontWeight: '800',
    color: Theme.colors.textDark,
  },
  btnConfirmText: {
    fontSize: 24,
    fontWeight: '800',
    color: Theme.colors.surfaceWhite,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
