import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useGlobalSearchParams, useSegments, useFocusEffect, router } from 'expo-router';
import { pickDependentUserId } from '../../../../utils/resolveMedsTargetUserId';
import { useMeds } from '../../../../context/MedsContext';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../../../constants/theme';
import { usersAPI } from '../../../../services/api';
import { DependentProfileHeader } from '../../../../components/caretaker/DependentProfileHeader';
import type { NotificationSoundChoiceId } from '../../../../constants/notificationSounds';
import {
  NOTIFICATION_SOUND_CHOICE_IDS,
  resolveMedicationSoundAsset,
} from '../../../../constants/notificationSounds';
import { previewNotificationAsset } from '../../../../services/notificationSoundPreview';
import { applyAppLanguage, normalizeAppLanguage } from '../../../../services/appLanguage';
import type { AppLanguage } from '../../../../i18n/resolveLanguage';
import { MoodCheckTimesEditor } from '../../../../components/caretaker/MoodCheckTimesEditor';
import { CaretakerTourAnchor } from '../../../../components/caretaker/CaretakerTourAnchor';
import { normalizeMoodCheckTimes } from '../../../../utils/moodCheckTimes';
import {
  CaretakerTourScrollProvider,
  CaretakerTourScrollView,
} from '../../../../context/CaretakerTourScrollContext';
import { useTabScreenScrollBottomPadding } from '../../../../utils/safeAreaInsets';

type DependentSettings = {
  moodEnabled: boolean;
  moodCheckTimes: string[];
  vitalsEntryEnabled: boolean;
  highContrast: boolean;
  colorBlindFriendly: boolean;
  appLanguage: AppLanguage;
  medicationSoundChoice: NotificationSoundChoiceId;
};

const DEFAULT_SETTINGS: DependentSettings = {
  moodEnabled: true,
  moodCheckTimes: normalizeMoodCheckTimes(undefined),
  vitalsEntryEnabled: false,
  highContrast: false,
  colorBlindFriendly: false,
  appLanguage: 'pl',
  medicationSoundChoice: 'default',
};

export default function DependentSettingsScreen() {
  const { t } = useTranslation();
  const scrollBottomPadding = useTabScreenScrollBottomPadding();
  const localParams = useLocalSearchParams<{ id?: string }>();
  const globalParams = useGlobalSearchParams<{ id?: string }>();
  const segments = useSegments();
  const { targetUserId } = useMeds();

  const dependentId = useMemo(
    () =>
      pickDependentUserId({
        localId: localParams.id,
        globalId: globalParams.id,
        segments: segments as string[],
        contextUserId: targetUserId,
      }),
    [localParams.id, globalParams.id, segments, targetUserId],
  );
  const [dependentName, setDependentName] = useState('');
  const [settings, setSettings] = useState<DependentSettings>(DEFAULT_SETTINGS);
  const [caretakerLanguage, setCaretakerLanguage] = useState<AppLanguage>('pl');
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!dependentId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [dependents, me] = await Promise.all([usersAPI.getDependents(), usersAPI.getMe()]);
      const dep = (dependents as any[]).find(d => d.id === dependentId);
      if (dep) {
        setDependentName(dep.name?.trim() || dep.email || '');
        setSettings({
          moodEnabled: dep.moodEnabled ?? true,
          moodCheckTimes: normalizeMoodCheckTimes(dep.moodCheckTimes),
          vitalsEntryEnabled: dep.vitalsEntryEnabled ?? false,
          highContrast: dep.highContrast ?? false,
          colorBlindFriendly: dep.colorBlindFriendly ?? false,
          appLanguage: normalizeAppLanguage(dep.appLanguage),
          medicationSoundChoice: (dep.medicationSoundChoice ?? 'default') as NotificationSoundChoiceId,
        });
      }
      if (me?.appLanguage) {
        setCaretakerLanguage(normalizeAppLanguage(me.appLanguage));
      }
    } catch {
      Alert.alert(t('common.error'), t('caretaker.settings.loadError'));
    } finally {
      setLoading(false);
    }
  }, [dependentId, t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const patchDependent = async (patch: Partial<DependentSettings>, key: string) => {
    if (!dependentId) return;
    const payload = { ...patch };
    if (payload.moodCheckTimes) {
      payload.moodCheckTimes = normalizeMoodCheckTimes(payload.moodCheckTimes);
    }
    setSavingKey(key);
    try {
      await usersAPI.updateDependentSettings(dependentId, payload);
      setSettings(prev => ({ ...prev, ...payload }));
    } catch {
      Alert.alert(t('common.error'), t('caretaker.settings.saveError'));
      void load();
    } finally {
      setSavingKey(null);
    }
  };

  const patchCaretakerLanguage = async (lang: AppLanguage) => {
    setSavingKey('caretakerLang');
    try {
      await usersAPI.updateSettings({ appLanguage: lang });
      setCaretakerLanguage(lang);
      await applyAppLanguage(lang);
    } catch {
      Alert.alert(t('common.error'), t('caretaker.settings.saveError'));
    } finally {
      setSavingKey(null);
    }
  };

  const onPreview = async (soundId: NotificationSoundChoiceId) => {
    const key = `med-${soundId}`;
    setPreviewKey(key);
    try {
      await previewNotificationAsset(resolveMedicationSoundAsset(soundId));
    } finally {
      setPreviewKey(null);
    }
  };

  const renderLanguageRow = (
    label: string,
    subtitle: string,
    value: AppLanguage,
    onChange: (lang: AppLanguage) => void,
    busy: boolean,
  ) => (
    <View style={styles.langBlock}>
      <Text style={styles.rowTitle}>{label}</Text>
      <Text style={styles.rowSub}>{subtitle}</Text>
      <View style={styles.langRow}>
        {(['pl', 'en'] as AppLanguage[]).map(lang => {
          const selected = value === lang;
          return (
            <Pressable
              key={lang}
              disabled={busy}
              onPress={() => void onChange(lang)}
              style={[
                styles.langChip,
                selected && styles.langChipActive,
                busy && { opacity: 0.6 },
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
  );

  const renderSoundRow = (soundId: NotificationSoundChoiceId) => {
    const label = t(`sounds.${soundId}.label`);
    const hint = t(`sounds.${soundId}.description`);
    const selected = settings.medicationSoundChoice === soundId;
    const rowPreviewKey = `med-${soundId}`;
    return (
      <View key={soundId} style={styles.soundRow}>
        <Pressable
          onPress={() => void patchDependent({ medicationSoundChoice: soundId }, `sound-${soundId}`)}
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
          onPress={() => void onPreview(soundId)}
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
    <CaretakerTourScrollProvider>
      <View style={styles.root}>
        <DependentProfileHeader
          title={t('caretaker.settings.title')}
          subtitle={dependentName || t('caretaker.dependentFallbackName')}
          onBack={() => router.back()}
        />
        <CaretakerTourScrollView contentContainerStyle={[styles.scroll, { paddingBottom: scrollBottomPadding }]} keyboardShouldPersistTaps="handled">
        {loading ? (
          <ActivityIndicator size="large" color={Theme.colors.primaryLimeDark} style={{ marginTop: 32 }} />
        ) : (
          <>
            <Text style={styles.sectionTitle}>{t('caretaker.settings.seniorSection')}</Text>
            <Text style={styles.sectionHint}>{t('caretaker.settings.seniorSectionHint')}</Text>

            <CaretakerTourAnchor
              stepId="settings-mood"
              titleKey="caretaker.tour.settingsMood.title"
              bodyKey="caretaker.tour.settingsMood.body"
              placement="bottom"
              tooltipEstimateHeight={200}
              measureDelayMs={200}
              wrapStyle={styles.rowCardWrap}
            >
              <View style={styles.rowCard}>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{t('caretaker.settings.mood')}</Text>
                  <Text style={styles.rowSub}>{t('caretaker.settings.moodSub')}</Text>
                </View>
                <Switch
                  value={settings.moodEnabled}
                  disabled={savingKey === 'moodEnabled'}
                  onValueChange={v => void patchDependent({ moodEnabled: v }, 'moodEnabled')}
                  trackColor={{ true: Theme.colors.primaryLimeDark, false: Theme.colors.border }}
                />
              </View>
            </CaretakerTourAnchor>

            {settings.moodEnabled ? (
              <CaretakerTourAnchor
                stepId="settings-mood-time"
                titleKey="caretaker.tour.settingsMoodTime.title"
                bodyKey="caretaker.tour.settingsMoodTime.body"
                placement="top"
                tooltipLayoutMode="screenCenter"
                tooltipEstimateHeight={220}
                measureDelayMs={280}
                afterStepId="settings-mood"
                wrapStyle={styles.rowCardWrap}
              >
                <MoodCheckTimesEditor
                  savedTime={settings.moodCheckTimes[0] ?? '08:00'}
                  busy={savingKey === 'moodCheckTimes'}
                  onSave={time => void patchDependent({ moodCheckTimes: [time] }, 'moodCheckTimes')}
                />
              </CaretakerTourAnchor>
            ) : null}

            <CaretakerTourAnchor
              stepId="settings-vitals"
              titleKey="caretaker.tour.settingsVitals.title"
              bodyKey="caretaker.tour.settingsVitals.body"
              placement="bottom"
              tooltipEstimateHeight={200}
              measureDelayMs={200}
              afterStepId={settings.moodEnabled ? 'settings-mood-time' : 'settings-mood'}
              wrapStyle={styles.rowCardWrap}
            >
              <View style={styles.rowCard}>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{t('caretaker.settings.vitals')}</Text>
                  <Text style={styles.rowSub}>{t('caretaker.settings.vitalsSub')}</Text>
                </View>
                <Switch
                  value={settings.vitalsEntryEnabled}
                  disabled={savingKey === 'vitalsEntryEnabled'}
                  onValueChange={v => void patchDependent({ vitalsEntryEnabled: v }, 'vitalsEntryEnabled')}
                  trackColor={{ true: Theme.colors.primaryLimeDark, false: Theme.colors.border }}
                />
              </View>
            </CaretakerTourAnchor>

            <Text style={[styles.sectionTitle, styles.sectionGap]}>{t('caretaker.settings.accessibility')}</Text>
            <Text style={styles.sectionHint}>{t('caretaker.settings.accessibilityHint')}</Text>

            <CaretakerTourAnchor
              stepId="settings-color-blind"
              titleKey="caretaker.tour.settingsColorBlind.title"
              bodyKey="caretaker.tour.settingsColorBlind.body"
              placement="bottom"
              afterStepId="settings-vitals"
              wrapStyle={styles.rowCardWrap}
            >
              <View style={styles.rowCard}>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{t('dependent.settings.colorBlind')}</Text>
                  <Text style={styles.rowSub}>{t('dependent.settings.colorBlindSub')}</Text>
                </View>
                <Switch
                  value={settings.colorBlindFriendly}
                  disabled={savingKey === 'colorBlindFriendly'}
                  onValueChange={v => void patchDependent({ colorBlindFriendly: v }, 'colorBlindFriendly')}
                  trackColor={{ true: Theme.colors.primaryLimeDark, false: Theme.colors.border }}
                />
              </View>
            </CaretakerTourAnchor>

            <CaretakerTourAnchor
              stepId="settings-high-contrast"
              titleKey="caretaker.tour.settingsHighContrast.title"
              bodyKey="caretaker.tour.settingsHighContrast.body"
              placement="bottom"
              afterStepId="settings-color-blind"
              wrapStyle={styles.rowCardWrap}
            >
              <View style={styles.rowCard}>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{t('dependent.settings.highContrast')}</Text>
                  <Text style={styles.rowSub}>{t('dependent.settings.highContrastSub')}</Text>
                </View>
                <Switch
                  value={settings.highContrast}
                  disabled={savingKey === 'highContrast'}
                  onValueChange={v => void patchDependent({ highContrast: v }, 'highContrast')}
                  trackColor={{ true: Theme.colors.primaryLimeDark, false: Theme.colors.border }}
                />
              </View>
            </CaretakerTourAnchor>

            <Text style={[styles.sectionTitle, styles.sectionGap]}>{t('caretaker.settings.languageSection')}</Text>
            <CaretakerTourAnchor
              stepId="settings-senior-language"
              titleKey="caretaker.tour.settingsSeniorLanguage.title"
              bodyKey="caretaker.tour.settingsSeniorLanguage.body"
              placement="bottom"
              afterStepId="settings-high-contrast"
              wrapStyle={styles.rowCardWrap}
            >
              {renderLanguageRow(
                t('caretaker.settings.seniorLanguage'),
                t('caretaker.settings.seniorLanguageSub'),
                settings.appLanguage,
                lang => void patchDependent({ appLanguage: lang }, 'seniorLang'),
                savingKey === 'seniorLang',
              )}
            </CaretakerTourAnchor>
            <CaretakerTourAnchor
              stepId="settings-caretaker-language"
              titleKey="caretaker.tour.settingsCaretakerLanguage.title"
              bodyKey="caretaker.tour.settingsCaretakerLanguage.body"
              placement="bottom"
              afterStepId="settings-senior-language"
              wrapStyle={styles.rowCardWrap}
            >
              {renderLanguageRow(
                t('caretaker.settings.caretakerLanguage'),
                t('caretaker.settings.caretakerLanguageSub'),
                caretakerLanguage,
                lang => void patchCaretakerLanguage(lang),
                savingKey === 'caretakerLang',
              )}
            </CaretakerTourAnchor>

            <CaretakerTourAnchor
              stepId="settings-reminder-sound"
              titleKey="caretaker.tour.settingsReminderSound.title"
              bodyKey="caretaker.tour.settingsReminderSound.body"
              placement="top"
              tooltipLayoutMode="screenCenter"
              tooltipEstimateHeight={220}
              measureDelayMs={280}
              afterStepId="settings-caretaker-language"
              wrapStyle={styles.soundSectionWrap}
            >
              <Text style={[styles.sectionTitle, styles.sectionGap]}>{t('dependent.settings.reminderSound')}</Text>
              <Text style={styles.sectionHint}>{t('caretaker.settings.soundHint')}</Text>
              {renderSoundRow(NOTIFICATION_SOUND_CHOICE_IDS[0])}
            </CaretakerTourAnchor>

            {NOTIFICATION_SOUND_CHOICE_IDS.slice(1).map(soundId => renderSoundRow(soundId))}

          </>
        )}
        </CaretakerTourScrollView>
      </View>
    </CaretakerTourScrollProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Theme.colors.background },
  scroll: {
    padding: Theme.spacing.l,
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
  rowCardWrap: {
    width: '100%',
  },
  soundSectionWrap: {
    width: '100%',
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.m,
    backgroundColor: Theme.colors.surfaceWhite,
    borderRadius: Theme.borderRadius.large,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.m,
    marginBottom: Theme.spacing.m,
  },
  rowText: { flex: 1 },
  rowTitle: { fontSize: Theme.typography.body, fontWeight: '700', color: Theme.colors.textDark },
  rowSub: { marginTop: 4, fontSize: Theme.typography.caption, color: Theme.colors.textLight, lineHeight: 20 },
  langBlock: {
    backgroundColor: Theme.colors.surfaceWhite,
    borderRadius: Theme.borderRadius.large,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.m,
    marginBottom: Theme.spacing.m,
  },
  langRow: { flexDirection: 'row', gap: Theme.spacing.s, marginTop: Theme.spacing.s },
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
  langChipText: { fontWeight: '700', color: Theme.colors.textLight },
  langChipTextActive: { color: Theme.colors.primaryLimeDark },
  soundRow: { flexDirection: 'row', gap: Theme.spacing.s, marginBottom: Theme.spacing.m },
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
});
