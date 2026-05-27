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
  NOTIFICATION_SOUND_CHOICE_IDS,
  resolveMedicationSoundAsset,
} from '../../constants/notificationSounds';
import { useTranslation } from 'react-i18next';
import {
  getMedicationSoundChoice,
  setMedicationSoundChoice,
} from '../../services/notificationSoundPreferences';
import { previewNotificationAsset } from '../../services/notificationSoundPreview';
import { useDependentDisplay } from '../../context/DependentDisplayContext';
import { usersAPI } from '../../services/api';

type ConfirmPayload = {
  title: string;
  message: string;
  onConfirm: () => void | Promise<void>;
};

export default function DependentSettingsScreen() {
  const { t } = useTranslation();
  const { colors, colorBlindFriendly, highContrast, setColorBlindFriendly, setHighContrastMode, reload } =
    useDependentDisplay();
  const [secondsLeft, setSecondsLeft] = useState(10);
  const [medSound, setMedSound] = useState<NotificationSoundChoiceId>('default');
  const [loading, setLoading] = useState(true);
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmPayload | null>(null);
  const [moodEnabled, setMoodEnabled] = useState(true);

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
          
          try {
            const me = await usersAPI.getMe();
            if (me && typeof me.moodEnabled === 'boolean') {
              setMoodEnabled(me.moodEnabled);
            }
          } catch (e) {
            console.warn('Failed to fetch user settings in settings screen', e);
          }
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
          <Text style={[styles.backHugeText, { color: colors.surfaceWhite }]}>
            {t('dependent.settings.backHome')}
          </Text>
        </Pressable>
        <Text style={[styles.countdown, { color: colors.textDark }]}>
          {t('dependent.settings.returningHome', { seconds: secondsLeft })}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={[styles.pageTitle, { color: colors.textDark, fontSize: titleSize + 4 }]}>
          {t('dependent.settings.title')}
        </Text>
        <Text style={[styles.pageHint, { color: colors.textLight, fontSize: bodySize - 2 }]}>
          {t('dependent.settings.pageHint')}
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primaryLimeDark} style={{ marginTop: 32 }} />
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textDark, fontSize: titleSize }]}>
              {t('dependent.settings.otherSettings')}
            </Text>

            <Pressable
              onPress={() => router.push('/(dependent)/metrics' as any)}
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
              <MaterialIcons name="monitor-heart" size={36} color={colors.primaryLimeDark} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.rowTitle, { color: colors.textDark, fontSize: bodySize }]}>
                  {t('dependent.metrics.title')}
                </Text>
                <Text style={[styles.rowSub, { color: colors.textLight, fontSize: bodySize - 4 }]}>
                  {t('dependent.metrics.hint')}
                </Text>
              </View>
            </Pressable>

            <Text style={[styles.sectionTitle, { color: colors.textDark, fontSize: titleSize }]}>
              {t('dependent.settings.accessibility')}
            </Text>

            <Pressable
              onPress={() =>
                openConfirm({
                  title: colorBlindFriendly
                    ? t('dependent.settings.confirmColorBlindOff')
                    : t('dependent.settings.confirmColorBlindOn'),
                  message: colorBlindFriendly
                    ? t('dependent.settings.confirmColorBlindOffMsg')
                    : t('dependent.settings.confirmColorBlindOnMsg'),
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
                  {t('dependent.settings.colorBlind')}
                </Text>
                <Text style={[styles.rowSub, { color: colors.textLight, fontSize: bodySize - 4 }]}>
                  {t('dependent.settings.colorBlindSub')}
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() =>
                openConfirm({
                  title: highContrast
                    ? t('dependent.settings.confirmHighContrastOff')
                    : t('dependent.settings.confirmHighContrastOn'),
                  message: highContrast
                    ? t('dependent.settings.confirmHighContrastOffMsg')
                    : t('dependent.settings.confirmHighContrastOnMsg'),
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
                  {t('dependent.settings.highContrast')}
                </Text>
                <Text style={[styles.rowSub, { color: colors.textLight, fontSize: bodySize - 4 }]}>
                  {t('dependent.settings.highContrastSub')}
                </Text>
              </View>
            </Pressable>

            <Text
              style={[
                styles.sectionTitle,
                { color: colors.textDark, fontSize: titleSize, marginTop: Theme.spacing.xl },
              ]}
            >
              {t('dependent.settings.otherSettings')}
            </Text>

            <Pressable
              onPress={() =>
                openConfirm({
                  title: moodEnabled
                    ? t('dependent.settings.confirmMoodOff')
                    : t('dependent.settings.confirmMoodOn'),
                  message: moodEnabled
                    ? t('dependent.settings.confirmMoodOffMsg')
                    : t('dependent.settings.confirmMoodOnMsg'),
                  onConfirm: async () => {
                    await usersAPI.updateSettings({ moodEnabled: !moodEnabled });
                    setMoodEnabled(!moodEnabled);
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
                name={moodEnabled ? 'check-box' : 'check-box-outline-blank'}
                size={36}
                color={colors.primaryLimeDark}
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.rowTitle, { color: colors.textDark, fontSize: bodySize }]}>
                  {t('dependent.settings.moodPicker')}
                </Text>
                <Text style={[styles.rowSub, { color: colors.textLight, fontSize: bodySize - 4 }]}>
                  {t('dependent.settings.moodPickerSub')}
                </Text>
              </View>
            </Pressable>

            <Text
              style={[
                styles.sectionTitle,
                { color: colors.textDark, fontSize: titleSize, marginTop: Theme.spacing.xl },
              ]}
            >
              {t('dependent.settings.reminderSound')}
            </Text>
            <Text style={[styles.pageHint, { color: colors.textLight, fontSize: bodySize - 4 }]}>
              {t('dependent.settings.soundHint')}
            </Text>

            {NOTIFICATION_SOUND_CHOICE_IDS.map(soundId => {
              const label = t(`sounds.${soundId}.label`);
              const hint = t(`sounds.${soundId}.description`);
              const selected = medSound === soundId;
              const rowPreviewKey = `med-${soundId}`;
              return (
                <View key={soundId} style={styles.soundRow}>
                  <Pressable
                    onPress={() =>
                      openConfirm({
                        title: t('dependent.settings.soundChangeTitle'),
                        message: t('dependent.settings.soundChangeMessage', { label }),
                        onConfirm: async () => {
                          await applySound(soundId);
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
                        {label}
                      </Text>
                      <Text style={[styles.rowSub, { color: colors.textLight, fontSize: bodySize - 4 }]}>
                        {hint}
                      </Text>
                    </View>
                  </Pressable>
                  <Pressable
                    onPress={() => void onPreview(soundId)}
                    style={({ pressed }) => [
                      styles.previewBtn,
                      {
                        backgroundColor: colors.surfaceWhite,
                        borderColor: colors.border,
                      },
                      pressed && { opacity: 0.85 },
                    ]}
                    accessibilityLabel={t('sounds.a11yPreview', { label })}
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
                {t('sounds.webHint')}
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
                <Text style={[styles.modalBtnGhostText, { color: colors.textDark }]}>
                  {t('dependent.settings.modalCancel')}
                </Text>
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
                <Text style={[styles.modalBtnPrimaryText, { color: colors.surfaceWhite }]}>
                  {t('dependent.settings.confirm')}
                </Text>
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
