import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Theme } from '../constants/theme';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  expectedPhrase: string;
  phraseHint: string;
  confirmLabel: string;
  cancelLabel: string;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

export function ConfirmPhraseModal({
  visible,
  title,
  message,
  expectedPhrase,
  phraseHint,
  confirmLabel,
  cancelLabel,
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  const [value, setValue] = useState('');

  useEffect(() => {
    if (!visible) setValue('');
  }, [visible]);

  const matches =
    value.trim().toLocaleLowerCase() === expectedPhrase.trim().toLocaleLowerCase();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={styles.card}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
            <Text style={styles.hint}>{phraseHint}</Text>
            <Text style={styles.phrase}>{expectedPhrase}</Text>
            <TextInput
              value={value}
              onChangeText={setValue}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              style={styles.input}
              placeholder={expectedPhrase}
              placeholderTextColor={Theme.colors.textLight}
            />
            <View style={styles.row}>
              <Pressable
                onPress={onCancel}
                disabled={loading}
                style={({ pressed }) => [styles.btn, styles.btnCancel, pressed && styles.pressed]}
              >
                <Text style={styles.btnCancelText}>{cancelLabel}</Text>
              </Pressable>
              <Pressable
                onPress={() => void onConfirm()}
                disabled={!matches || loading}
                style={({ pressed }) => [
                  styles.btn,
                  styles.btnDanger,
                  (!matches || loading) && styles.btnDisabled,
                  pressed && matches && !loading && styles.pressed,
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnDangerText}>{confirmLabel}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(27, 60, 83, 0.55)',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Theme.spacing.l,
  },
  card: {
    backgroundColor: Theme.colors.surfaceWhite,
    borderRadius: Theme.borderRadius.xlarge,
    padding: Theme.spacing.xl,
    borderWidth: 2,
    borderColor: Theme.colors.textDark,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: Theme.colors.textDark,
    marginBottom: Theme.spacing.s,
  },
  message: {
    fontSize: Theme.typography.body,
    color: Theme.colors.textDark,
    lineHeight: 22,
    marginBottom: Theme.spacing.m,
  },
  hint: {
    fontSize: Theme.typography.caption,
    color: Theme.colors.textLight,
    marginBottom: 6,
  },
  phrase: {
    fontSize: Theme.typography.body,
    fontWeight: '800',
    color: Theme.colors.accentOrange,
    marginBottom: Theme.spacing.s,
  },
  input: {
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.medium,
    paddingHorizontal: Theme.spacing.m,
    paddingVertical: 12,
    fontSize: Theme.typography.body,
    color: Theme.colors.textDark,
    marginBottom: Theme.spacing.l,
    backgroundColor: Theme.colors.background,
  },
  row: { flexDirection: 'row', gap: Theme.spacing.s },
  btn: {
    flex: 1,
    minHeight: 48,
    borderRadius: Theme.borderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Theme.spacing.s,
  },
  btnCancel: {
    backgroundColor: Theme.colors.surfaceGrey,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  btnCancelText: {
    fontWeight: '700',
    color: Theme.colors.textDark,
  },
  btnDanger: {
    backgroundColor: '#C62828',
  },
  btnDangerText: {
    fontWeight: '800',
    color: '#fff',
  },
  btnDisabled: { opacity: 0.45 },
  pressed: { opacity: 0.85 },
});
