import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/theme';
import type { NotificationSoundChoiceId } from '../../constants/notificationSounds';
import {
  NOTIFICATION_SOUND_CHOICES,
  resolveMedicationSoundAsset,
} from '../../constants/notificationSounds';
import {
  getMedicationSoundChoice,
  setMedicationSoundChoice,
} from '../../services/notificationSoundPreferences';
import { previewNotificationAsset } from '../../services/notificationSoundPreview';
import { useDependentDisplay } from '../../context/DependentDisplayContext';

const SOUND_LABELS_EN: Record<NotificationSoundChoiceId, { title: string; hint: string }> = {
  default: { title: 'System default', hint: 'Uses the device notification sound.' },
  gentle: { title: 'Local — soft', hint: 'Built-in gentle reminder tone.' },
  strong: { title: 'Local — clear', hint: 'Built-in easy-to-hear tone.' },
};

type ConfirmPayload = {
  title: string;
  message: string;
  onConfirm: () => void | Promise<void>;
};

export default function DependentSettingsScreen() {
  const { colors, colorBlindFriendly, highContrast, setColorBlindFriendly, setHighContrastMode, reload } =
    useDependentDisplay();
  const [secondsLeft, setSecondsLeft] = useState(10);
  const [medSound, setMedSound] = useState<NotificationSoundChoiceId>('default');
  const [loading, setLoading] = useState(true);
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmPayload | null>(null);

  const goHome = useCallback(() => {
    router.replace('/(dependent)' as any);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setSecondsLeft(10);
      void reload();
      void (async () => {
        setLoading(true);
        try {
          const m = await getMedicationSoundChoice();
          setMedSound(m);
        } finally {
          setLoading(false);
        }
      })();
    }, [reload]),
  );

  useEffect(() => {
    if (secondsLeft <= 0) {
      goHome();
      return;
    }
    const t = setInterval(() => setSecondsLeft(s => s - 1), 1000);
    return () => clearInterval(t);
  }, [secondsLeft, goHome]);

  const openConfirm = (payload: ConfirmPayload) => setConfirm(payload);

  const applySound = async (id: NotificationSoundChoiceId) => {
    setMedSound(id);
    await setMedicationSoundChoice(id);
  };

  const onPreview = async (id: NotificationSoundChoiceId) => {
    const key = `med-${id}`;
    setPreviewKey(key);
    try {
      await previewNotificationAsset(resolveMedicationSoundAsset(id));
    } finally {
      setPreviewKey(null);
    }
  };

  const titleSize = 26;
  const bodySize = 22;

  return (
    <View style={[styles.root, { backgroundColor: colors.surfaceGrey }]}>
      <View style={[styles.topBar, { backgroundColor: colors.surfaceWhite, borderBottomColor: colors.border }]}>
        <Pressable
          onPress={goHome}
          style={({ pressed }) => [
            styles.backHuge,
            { backgroundColor: colors.primaryLimeDark, borderColor: colors.textDark },
            pressed && { opacity: 0.92 },
          ]}
        >
          <MaterialIcons name="home" size={36} color={colors.surfaceWhite} />
          <Text style={[styles.backHugeText, { color: colors.surfaceWhite }]}>Back to home</Text>
        </Pressable>
        <Text style={[styles.countdown, { color: colors.textDark }]}>
          Returning to home in {secondsLeft}s…
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={[styles.pageTitle, { color: colors.textDark, fontSize: titleSize + 4 }]}>Settings</Text>
        <Text style={[styles.pageHint, { color: colors.textLight, fontSize: bodySize - 2 }]}>
          Every change needs your confirmation. Nothing is saved until you confirm.
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primaryLimeDark} style={{ marginTop: 32 }} />
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textDark, fontSize: titleSize }]}>
              Accessibility
            </Text>

            <Pressable
              onPress={() =>
                openConfirm({
                  title: colorBlindFriendly ? 'Turn off colour-blind friendly?' : 'Turn on colour-blind friendly?',
                  message: colorBlindFriendly
                    ? 'Colours and emphasis will return to the standard style.'
                    : 'Uses stronger outlines and avoids easy-to-confuse colour pairs.',
                  onConfirm: async () => {
                    await setColorBlindFriendly(!colorBlindFriendly);
                  },
                })
              }
              style={({ pressed }) => [
                styles.rowCard,
                {
                  backgroundColor: colors.surfaceWhite,
                  borderColor: colors.border,
                  borderWidth: colors.mainButtonBorderWidth ?? 1,
                },
                pressed && { opacity: 0.9 },
              ]}
            >
              <MaterialIcons
                name={colorBlindFriendly ? 'check-box' : 'check-box-outline-blank'}
                size={36}
                color={colors.primaryLimeDark}
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.rowTitle, { color: colors.textDark, fontSize: bodySize }]}>
                  Colour-blind friendly
                </Text>
                <Text style={[styles.rowSub, { color: colors.textLight, fontSize: bodySize - 4 }]}>
                  Clearer shapes and safer colours.
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() =>
                openConfirm({
                  title: highContrast ? 'Turn off high contrast?' : 'Turn on high contrast?',
                  message: highContrast
                    ? 'The screen will use the standard contrast again.'
                    : 'Text and buttons will use very high contrast for easier reading.',
                  onConfirm: async () => {
                    await setHighContrastMode(!highContrast);
                  },
                })
              }
              style={({ pressed }) => [
                styles.rowCard,
                {
                  backgroundColor: colors.surfaceWhite,
                  borderColor: colors.border,
                  borderWidth: colors.mainButtonBorderWidth ?? 1,
                  marginTop: Theme.spacing.m,
                },
                pressed && { opacity: 0.9 },
              ]}
            >
              <MaterialIcons
                name={highContrast ? 'check-box' : 'check-box-outline-blank'}
                size={36}
                color={colors.primaryLimeDark}
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.rowTitle, { color: colors.textDark, fontSize: bodySize }]}>
                  High contrast
                </Text>
                <Text style={[styles.rowSub, { color: colors.textLight, fontSize: bodySize - 4 }]}>
                  Extra bold text and backgrounds.
                </Text>
              </View>
            </Pressable>

            <Text
              style={[
                styles.sectionTitle,
                { color: colors.textDark, fontSize: titleSize, marginTop: Theme.spacing.xl },
              ]}
            >
              Reminder sound
            </Text>
            <Text style={[styles.pageHint, { color: colors.textLight, fontSize: bodySize - 4 }]}>
              Pick the system sound or a built-in local tone. Tap a row to select (with confirmation). Use the
              speaker to preview.
            </Text>

            {NOTIFICATION_SOUND_CHOICES.map(opt => {
              const en = SOUND_LABELS_EN[opt.id];
              const selected = medSound === opt.id;
              const rowPreviewKey = `med-${opt.id}`;
              return (
                <View key={opt.id} style={styles.soundRow}>
                  <Pressable
                    onPress={() =>
                      openConfirm({
                        title: 'Change reminder sound?',
                        message: `Use “${en.title}” for medication reminders on this device?`,
                        onConfirm: async () => {
                          await applySound(opt.id);
                        },
                      })
                    }
                    style={({ pressed }) => [
                      styles.rowCard,
                      {
                        flex: 1,
                        backgroundColor: colors.surfaceWhite,
                        borderColor: selected ? colors.primaryLimeDark : colors.border,
                        borderWidth: selected
                          ? (colors.mainButtonBorderWidth ?? 2)
                          : colors.mainButtonBorderWidth ?? 1,
                      },
                      pressed && { opacity: 0.9 },
                    ]}
                  >
                    <MaterialIcons
                      name={selected ? 'radio-button-checked' : 'radio-button-unchecked'}
                      size={32}
                      color={colors.primaryLimeDark}
                    />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.rowTitle, { color: colors.textDark, fontSize: bodySize }]}>
                        {en.title}
                      </Text>
                      <Text style={[styles.rowSub, { color: colors.textLight, fontSize: bodySize - 4 }]}>
                        {en.hint}
                      </Text>
                    </View>
                  </Pressable>
                  <Pressable
                    onPress={() => void onPreview(opt.id)}
                    style={({ pressed }) => [
                      styles.previewBtn,
                      {
                        backgroundColor: colors.surfaceWhite,
                        borderColor: colors.border,
                      },
                      pressed && { opacity: 0.85 },
                    ]}
                    accessibilityLabel={`Preview ${en.title}`}
                    disabled={previewKey !== null}
                  >
                    {previewKey === rowPreviewKey ? (
                      <ActivityIndicator color={colors.primaryLimeDark} />
                    ) : (
                      <MaterialIcons name="volume-up" size={32} color={colors.primaryLimeDark} />
                    )}
                  </Pressable>
                </View>
              );
            })}

            {Platform.OS === 'web' && (
              <Text style={[styles.webHint, { color: colors.textLight }]}>
                In the browser, sound preview may be limited; phones give the full experience.
              </Text>
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={confirm !== null} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surfaceWhite }]}>
            <Text style={[styles.modalTitle, { color: colors.textDark }]}>{confirm?.title}</Text>
            <Text style={[styles.modalBody, { color: colors.textLight }]}>{confirm?.message}</Text>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setConfirm(null)}
                style={({ pressed }) => [
                  styles.modalBtnGhost,
                  { borderColor: colors.border },
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Text style={[styles.modalBtnGhostText, { color: colors.textDark }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  const c = confirm;
                  setConfirm(null);
                  if (c) void Promise.resolve(c.onConfirm());
                }}
                style={({ pressed }) => [
                  styles.modalBtnPrimary,
                  { backgroundColor: colors.primaryLimeDark },
                  pressed && { opacity: 0.92 },
                ]}
              >
                <Text style={[styles.modalBtnPrimaryText, { color: colors.surfaceWhite }]}>Confirm</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    paddingHorizontal: Theme.spacing.l,
    paddingTop: Theme.spacing.xxl,
    paddingBottom: Theme.spacing.m,
    borderBottomWidth: 1,
    gap: Theme.spacing.m,
  },
  backHuge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: Theme.borderRadius.large,
    borderWidth: 1,
  },
  backHugeText: {
    fontSize: 24,
    fontWeight: '800',
  },
  countdown: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
  },
  scroll: {
    padding: Theme.spacing.l,
    paddingBottom: 120,
  },
  pageTitle: {
    fontWeight: '900',
    marginBottom: Theme.spacing.s,
  },
  pageHint: {
    marginBottom: Theme.spacing.l,
    lineHeight: 28,
  },
  sectionTitle: {
    fontWeight: '800',
    marginBottom: Theme.spacing.m,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Theme.borderRadius.large,
    padding: Theme.spacing.m,
  },
  rowTitle: { fontWeight: '800' },
  rowSub: { marginTop: 4, lineHeight: 24 },
  soundRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Theme.spacing.s,
    marginBottom: Theme.spacing.m,
  },
  previewBtn: {
    width: 64,
    minHeight: 64,
    borderRadius: Theme.borderRadius.medium,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webHint: {
    marginTop: Theme.spacing.m,
    fontSize: 16,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Theme.spacing.l,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    borderRadius: Theme.borderRadius.xlarge,
    padding: Theme.spacing.l,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: Theme.spacing.s,
  },
  modalBody: {
    fontSize: 20,
    lineHeight: 28,
    marginBottom: Theme.spacing.l,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Theme.spacing.m,
  },
  modalBtnGhost: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: Theme.borderRadius.round,
    borderWidth: 2,
  },
  modalBtnGhostText: { fontSize: 20, fontWeight: '700' },
  modalBtnPrimary: {
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: Theme.borderRadius.round,
  },
  modalBtnPrimaryText: { fontSize: 20, fontWeight: '800' },
});
