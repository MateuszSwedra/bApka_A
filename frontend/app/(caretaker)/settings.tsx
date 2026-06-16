import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../constants/theme';
import { usersAPI } from '../../services/api';
import {
  applyAppLanguagePreference,
  getStoredAppLanguagePreference,
  normalizeAppLanguagePreference,
  type AppLanguagePreference,
} from '../../services/appLanguage';
import {
  NOTIFICATION_SOUND_CHOICE_IDS,
  type NotificationSoundChoiceId,
  resolveMedicationSoundAsset,
  resolveSosSoundAsset,
} from '../../constants/notificationSounds';
import {
  getMedicationSoundChoice,
  getSosSoundChoice,
  setMedicationSoundChoice,
  setSosSoundChoice,
} from '../../services/notificationSoundPreferences';
import { previewNotificationAsset } from '../../services/notificationSoundPreview';
import { getScreenBottomPadding } from '../../utils/safeAreaInsets';

export default function CaretakerSettingsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [language, setLanguage] = useState<AppLanguagePreference>('system');
  const [medSound, setMedSound] = useState<NotificationSoundChoiceId>('default');
  const [sosSound, setSosSound] = useState<NotificationSoundChoiceId>('default');
  const [loading, setLoading] = useState(true);
  const [savingLang, setSavingLang] = useState(false);
  const [previewKey, setPreviewKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [me, storedPreference, med, sos] = await Promise.all([
        usersAPI.getMe(),
        getStoredAppLanguagePreference(),
        getMedicationSoundChoice(),
        getSosSoundChoice(),
      ]);
      setLanguage(storedPreference ?? normalizeAppLanguagePreference(me?.appLanguage));
      setMedSound(med);
      setSosSound(sos);
    } catch {
      Alert.alert(t('common.error'), t('caretaker.settings.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const saveLanguage = useCallback(
    async (next: AppLanguagePreference) => {
      if (savingLang) return;
      setSavingLang(true);
      try {
        const resolved = await applyAppLanguagePreference(next);
        await usersAPI.updateSettings({ appLanguage: resolved });
        setLanguage(next);
      } catch {
        Alert.alert(t('common.error'), t('caretaker.settings.saveError'));
      } finally {
        setSavingLang(false);
      }
    },
    [savingLang, t],
  );

  const onSelectMed = async (id: NotificationSoundChoiceId) => {
    setMedSound(id);
    await setMedicationSoundChoice(id);
  };

  const onSelectSos = async (id: NotificationSoundChoiceId) => {
    setSosSound(id);
    await setSosSoundChoice(id);
  };

  const onPreview = async (id: NotificationSoundChoiceId, kind: 'med' | 'sos') => {
    const key = `${kind}-${id}`;
    setPreviewKey(key);
    try {
      await previewNotificationAsset(
        kind === 'med' ? resolveMedicationSoundAsset(id) : resolveSosSoundAsset(id),
      );
    } finally {
      setPreviewKey(null);
    }
  };

  const renderSoundRow = (
    soundId: NotificationSoundChoiceId,
    selected: boolean,
    onSelect: (id: NotificationSoundChoiceId) => void,
    kind: 'med' | 'sos',
  ) => {
    const label = t(`sounds.${soundId}.label`);
    const hint = t(`sounds.${soundId}.description`);
    const rowPreviewKey = `${kind}-${soundId}`;
    return (
      <View key={`${kind}-${soundId}`} style={styles.soundRow}>
        <Pressable
          onPress={() => void onSelect(soundId)}
          style={[styles.soundCard, selected && styles.soundCardSelected]}
        >
          <MaterialIcons
            name={selected ? 'radio-button-checked' : 'radio-button-unchecked'}
            size={28}
            color={Theme.colors.primaryLimeDark}
          />
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>{label}</Text>
            <Text style={styles.rowSub}>{hint}</Text>
          </View>
        </Pressable>
        <Pressable
          onPress={() => void onPreview(soundId, kind)}
          style={styles.previewBtn}
          accessibilityLabel={t('sounds.a11yPreview', { label })}
          disabled={previewKey !== null}
        >
          {previewKey === rowPreviewKey ? (
            <ActivityIndicator color={Theme.colors.primaryLimeDark} />
          ) : (
            <MaterialIcons name="volume-up" size={28} color={Theme.colors.primaryLimeDark} />
          )}
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, Platform.OS === 'web' ? 12 : 0) }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <MaterialIcons name="arrow-back" size={24} color={Theme.colors.primaryLimeDark} />
        </Pressable>
        <Text style={styles.title}>{t('tabs.settings')}</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={Theme.colors.primaryLimeDark}
          style={{ marginTop: 32 }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: getScreenBottomPadding(insets.bottom, Theme.spacing.xl) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionTitle}>{t('sounds.sectionMedication')}</Text>
          <Text style={styles.sectionHint}>{t('sounds.sectionMedicationSubtitleCaretaker')}</Text>
          {NOTIFICATION_SOUND_CHOICE_IDS.map(id =>
            renderSoundRow(id, medSound === id, onSelectMed, 'med'),
          )}

          <Text style={[styles.sectionTitle, styles.sectionGap]}>{t('sounds.sectionSos')}</Text>
          <Text style={styles.sectionHint}>{t('sounds.sectionSosSubtitle')}</Text>
          {NOTIFICATION_SOUND_CHOICE_IDS.map(id =>
            renderSoundRow(id, sosSound === id, onSelectSos, 'sos'),
          )}

          {Platform.OS === 'web' ? (
            <Text style={styles.webHint}>{t('sounds.webHint')}</Text>
          ) : null}

          <Text style={[styles.sectionTitle, styles.sectionGap]}>
            {t('caretaker.settings.languageSection')}
          </Text>
          <View style={styles.card}>
            <Text style={styles.rowTitle}>{t('caretaker.settings.caretakerLanguage')}</Text>
            <Text style={styles.rowSub}>{t('caretaker.settings.caretakerLanguageSub')}</Text>
            <View style={styles.langRow}>
              {(['system', 'pl', 'en'] as AppLanguagePreference[]).map(lang => {
                const selected = language === lang;
                return (
                  <Pressable
                    key={lang}
                    disabled={savingLang}
                    onPress={() => void saveLanguage(lang)}
                    style={[
                      styles.langChip,
                      selected && styles.langChipActive,
                      savingLang && { opacity: 0.6 },
                    ]}
                  >
                    <Text style={[styles.langChipText, selected && styles.langChipTextActive]}>
                      {t(`caretaker.settings.language.${lang}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.l,
    paddingBottom: Theme.spacing.m,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.surfaceWhite,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  backBtnPressed: { opacity: 0.8 },
  title: {
    fontSize: Theme.typography.title,
    fontWeight: '800',
    color: Theme.colors.textDark,
  },
  scroll: {
    paddingHorizontal: Theme.spacing.l,
  },
  sectionTitle: {
    fontSize: Theme.typography.title,
    fontWeight: '800',
    color: Theme.colors.textDark,
    marginBottom: Theme.spacing.s,
  },
  sectionGap: { marginTop: Theme.spacing.xl },
  sectionHint: {
    fontSize: Theme.typography.caption,
    color: Theme.colors.textLight,
    marginBottom: Theme.spacing.m,
    lineHeight: 20,
  },
  card: {
    backgroundColor: Theme.colors.surfaceWhite,
    borderRadius: Theme.borderRadius.large,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.m,
  },
  rowText: { flex: 1 },
  rowTitle: {
    fontSize: Theme.typography.body,
    fontWeight: '700',
    color: Theme.colors.textDark,
  },
  rowSub: {
    marginTop: 4,
    fontSize: Theme.typography.caption,
    color: Theme.colors.textLight,
    lineHeight: 20,
  },
  langRow: {
    flexDirection: 'row',
    gap: Theme.spacing.s,
    marginTop: Theme.spacing.s,
  },
  langChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    alignItems: 'center',
  },
  langChipActive: {
    borderColor: Theme.colors.primaryLimeDark,
    backgroundColor: 'rgba(69, 104, 130, 0.12)',
  },
  langChipText: {
    fontWeight: '700',
    color: Theme.colors.textLight,
  },
  langChipTextActive: {
    color: Theme.colors.primaryLimeDark,
  },
  soundRow: {
    flexDirection: 'row',
    gap: Theme.spacing.s,
    marginBottom: Theme.spacing.m,
  },
  soundCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.s,
    backgroundColor: Theme.colors.surfaceWhite,
    borderRadius: Theme.borderRadius.large,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.m,
  },
  soundCardSelected: {
    borderColor: Theme.colors.primaryLimeDark,
    borderWidth: 2,
  },
  previewBtn: {
    width: 56,
    borderRadius: Theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.surfaceWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webHint: {
    fontSize: Theme.typography.small,
    color: Theme.colors.textLight,
    fontStyle: 'italic',
    lineHeight: 18,
    marginBottom: Theme.spacing.m,
  },
});
