import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Theme } from '@/constants/theme';

type Props = {
  visible: boolean;
  onAccept: () => Promise<void>;
  onDecline: () => Promise<void>;
};

export function NotificationConsentModal({ visible, onAccept, onDecline }: Props) {
  const [busy, setBusy] = useState(false);

  const handleAccept = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onAccept();
    } finally {
      setBusy(false);
    }
  };

  const handleDecline = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onDecline();
    } finally {
      setBusy(false);
    }
  };

  if (Platform.OS === 'web') return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleDecline}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <MaterialIcons name="notifications-active" size={40} color={Theme.colors.primaryLimeDark} />
          </View>
          <Text style={styles.title}>Powiadomienia o lekach</Text>
          <Text style={styles.body}>
            Możemy wysyłać przypomnienia o czasie przyjęcia leku. Zgoda obejmuje powiadomienia push w tym
            urządzeniu — w każdej chwili możesz zmienić decyzję w ustawieniach systemowych.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed, busy && styles.disabled]}
            onPress={handleAccept}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color={Theme.colors.textDark} />
            ) : (
              <Text style={styles.primaryBtnText}>Zgadzam się — włącz powiadomienia</Text>
            )}
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed, busy && styles.disabled]}
            onPress={handleDecline}
            disabled={busy}
          >
            <Text style={styles.secondaryBtnText}>Nie teraz</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(51, 51, 51, 0.55)',
    justifyContent: 'center',
    paddingHorizontal: Theme.spacing.l,
  },
  card: {
    backgroundColor: Theme.colors.surfaceWhite,
    borderRadius: Theme.borderRadius.large,
    padding: Theme.spacing.l,
  },
  iconWrap: {
    alignSelf: 'center',
    marginBottom: Theme.spacing.m,
    backgroundColor: Theme.colors.primaryLime,
    borderRadius: Theme.borderRadius.round,
    padding: Theme.spacing.m,
  },
  title: {
    fontSize: Theme.typography.title,
    fontWeight: '700',
    color: Theme.colors.textDark,
    textAlign: 'center',
    marginBottom: Theme.spacing.s,
  },
  body: {
    fontSize: Theme.typography.body,
    color: Theme.colors.textLight,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Theme.spacing.l,
  },
  primaryBtn: {
    backgroundColor: Theme.colors.primaryLime,
    paddingVertical: Theme.spacing.m,
    borderRadius: Theme.borderRadius.medium,
    alignItems: 'center',
    marginBottom: Theme.spacing.s,
    minHeight: 48,
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: Theme.typography.body,
    fontWeight: '600',
    color: Theme.colors.textDark,
    textAlign: 'center',
  },
  secondaryBtn: {
    paddingVertical: Theme.spacing.m,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: Theme.typography.body,
    color: Theme.colors.textLight,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.6,
  },
});
