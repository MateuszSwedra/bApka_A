import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Switch,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../../constants/theme';
import { useAuth } from '../../../context/AuthContext';
import { usersAPI } from '../../../services/api';
import { HybridProfileHeader } from '../../../components/hybrid/HybridProfileHeader';
import type { NotificationSoundChoiceId } from '../../../constants/notificationSounds';
import {
  NOTIFICATION_SOUND_CHOICE_IDS,
  resolveMedicationSoundAsset,
} from '../../../constants/notificationSounds';
import { previewNotificationAsset } from '../../../services/notificationSoundPreview';
import { applyAppLanguage, normalizeAppLanguage } from '../../../services/appLanguage';
import type { AppLanguage } from '../../../i18n/resolveLanguage';
import { applySeniorProfileSettings } from '../../../services/seniorProfileSync';
import { SeniorTourAnchor } from '../../../components/senior/SeniorTourAnchor';
import {
  CaretakerTourScrollProvider,
  CaretakerTourScrollView,
} from '../../../context/CaretakerTourScrollContext';
import { useTabScreenScrollBottomPadding } from '../../../utils/safeAreaInsets';

type SelfSettings = {
  vitalsEntryEnabled: boolean;
  highContrast: boolean;
  colorBlindFriendly: boolean;
  appLanguage: AppLanguage;
  medicationSoundChoice: NotificationSoundChoiceId;
};

const DEFAULT: SelfSettings = {
  vitalsEntryEnabled: false,
  highContrast: false,
  colorBlindFriendly: false,
  appLanguage: 'pl',
  medicationSoundChoice: 'default',
};

export default function HybridSettingsScreen() {
  const { t } = useTranslation();
  const scrollBottomPadding = useTabScreenScrollBottomPadding();
  const { logout } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [settings, setSettings] = useState<SelfSettings>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const me = await usersAPI.getMe();
      setDisplayName(me?.name?.trim() || me?.email || '');
      setSettings({
        vitalsEntryEnabled: me?.vitalsEntryEnabled ?? false,
        highContrast: me?.highContrast ?? false,
        colorBlindFriendly: me?.colorBlindFriendly ?? false,
        appLanguage: normalizeAppLanguage(me?.appLanguage),
        medicationSoundChoice: (me?.medicationSoundChoice ?? 'default') as NotificationSoundChoiceId,
      });
    } catch {
      Alert.alert(t('common.error'), t('caretaker.settings.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const handleLogout = async () => {
    await logout();
    if (Platform.OS === 'web') {
      window.location.href = '/login';
    } else {
      router.replace('/login');
    }
  };

  const patch = async (patchData: Partial<SelfSettings>, key: string) => {
    setSavingKey(key);
    try {
      const updated = await usersAPI.updateSettings(patchData);
      setSettings(prev => ({ ...prev, ...patchData }));
      await applySeniorProfileSettings(updated ?? patchData);
      if (patchData.appLanguage) await applyAppLanguage(normalizeAppLanguage(patchData.appLanguage));
    } catch {
      Alert.alert(t('common.error'), t('caretaker.settings.saveError'));
      void load();
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <CaretakerTourScrollProvider>
    <View style={styles.root}>
      <HybridProfileHeader
        title={t('tabs.settings')}
        subtitle={displayName}
        showSettings={false}
        showBack
        onBack={() => router.push('/(hybrid)/(tabs)/' as any)}
      />
      <CaretakerTourScrollView contentContainerStyle={[styles.scroll, { paddingBottom: scrollBottomPadding }]}>
        {loading ? (
          <ActivityIndicator size="large" color={Theme.colors.primaryLimeDark} style={{ marginTop: 32 }} />
        ) : (
          <>
            <Text style={styles.sectionTitle}>{t('hybrid.settings.section')}</Text>
            <Text style={styles.sectionHint}>{t('hybrid.settings.sectionHint')}</Text>

            <SeniorTourAnchor
              stepId="settings-vitals"
              titleKey="senior.tour.settingsVitals.title"
              bodyKey="senior.tour.settingsVitals.body"
              placement="bottom"
              wrapStyle={styles.rowCardWrap}
            >
              <RowSwitch label={t('caretaker.settings.vitals')} sub={t('caretaker.settings.vitalsSub')} value={settings.vitalsEntryEnabled} busy={savingKey === 'vitalsEntryEnabled'} onChange={v => void patch({ vitalsEntryEnabled: v }, 'vitalsEntryEnabled')} />
            </SeniorTourAnchor>

            <Text style={[styles.sectionTitle, styles.gap]}>{t('caretaker.settings.accessibility')}</Text>

            <SeniorTourAnchor
              stepId="settings-color-blind"
              titleKey="senior.tour.settingsColorBlind.title"
              bodyKey="senior.tour.settingsColorBlind.body"
              placement="bottom"
              afterStepId="settings-vitals"
              wrapStyle={styles.rowCardWrap}
            >
              <RowSwitch label={t('dependent.settings.colorBlind')} sub={t('dependent.settings.colorBlindSub')} value={settings.colorBlindFriendly} busy={savingKey === 'colorBlindFriendly'} onChange={v => void patch({ colorBlindFriendly: v }, 'colorBlindFriendly')} />
            </SeniorTourAnchor>

            <SeniorTourAnchor
              stepId="settings-high-contrast"
              titleKey="senior.tour.settingsHighContrast.title"
              bodyKey="senior.tour.settingsHighContrast.body"
              placement="bottom"
              afterStepId="settings-color-blind"
              wrapStyle={styles.rowCardWrap}
            >
              <RowSwitch label={t('dependent.settings.highContrast')} sub={t('dependent.settings.highContrastSub')} value={settings.highContrast} busy={savingKey === 'highContrast'} onChange={v => void patch({ highContrast: v }, 'highContrast')} />
            </SeniorTourAnchor>

            <Text style={[styles.sectionTitle, styles.gap]}>{t('caretaker.settings.languageSection')}</Text>

            <SeniorTourAnchor
              stepId="settings-language"
              titleKey="senior.tour.settingsLanguage.title"
              bodyKey="senior.tour.settingsLanguage.body"
              placement="bottom"
              afterStepId="settings-high-contrast"
              wrapStyle={styles.rowCardWrap}
            >
              <View style={styles.langBlock}>
                <Text style={styles.rowTitle}>{t('hybrid.settings.language')}</Text>
                <View style={styles.langRow}>
                  {(['pl', 'en'] as AppLanguage[]).map(lang => (
                    <Pressable key={lang} disabled={savingKey === 'lang'} onPress={() => void patch({ appLanguage: lang }, 'lang')} style={[styles.langChip, settings.appLanguage === lang && styles.langChipActive]}>
                      <Text style={[styles.langChipText, settings.appLanguage === lang && styles.langChipTextActive]}>{t(`caretaker.settings.language.${lang}`)}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </SeniorTourAnchor>

            <SeniorTourAnchor
              stepId="settings-reminder-sound"
              titleKey="senior.tour.settingsReminderSound.title"
              bodyKey="senior.tour.settingsReminderSound.body"
              placement="top"
              afterStepId="settings-language"
              wrapStyle={styles.soundSectionWrap}
            >
              <Text style={[styles.sectionTitle, styles.gap]}>{t('dependent.settings.reminderSound')}</Text>
              {NOTIFICATION_SOUND_CHOICE_IDS.slice(0, 1).map(soundId => {
                const label = t(`sounds.${soundId}.label`);
                const selected = settings.medicationSoundChoice === soundId;
                return (
                  <View key={soundId} style={styles.soundRow}>
                    <Pressable onPress={() => void patch({ medicationSoundChoice: soundId }, `sound-${soundId}`)} style={[styles.soundCard, selected && styles.soundCardSelected]}>
                      <MaterialIcons name={selected ? 'radio-button-checked' : 'radio-button-unchecked'} size={28} color={Theme.colors.primaryLimeDark} />
                      <View style={{ flex: 1 }}><Text style={styles.rowTitle}>{label}</Text></View>
                    </Pressable>
                    <Pressable onPress={() => void previewNotificationAsset(resolveMedicationSoundAsset(soundId))} style={styles.previewBtn}>
                      <MaterialIcons name="volume-up" size={28} color={Theme.colors.primaryLimeDark} />
                    </Pressable>
                  </View>
                );
              })}
            </SeniorTourAnchor>

            {NOTIFICATION_SOUND_CHOICE_IDS.slice(1).map(soundId => {
              const label = t(`sounds.${soundId}.label`);
              const selected = settings.medicationSoundChoice === soundId;
              return (
                <View key={soundId} style={styles.soundRow}>
                  <Pressable onPress={() => void patch({ medicationSoundChoice: soundId }, `sound-${soundId}`)} style={[styles.soundCard, selected && styles.soundCardSelected]}>
                    <MaterialIcons name={selected ? 'radio-button-checked' : 'radio-button-unchecked'} size={28} color={Theme.colors.primaryLimeDark} />
                    <View style={{ flex: 1 }}><Text style={styles.rowTitle}>{label}</Text></View>
                  </Pressable>
                  <Pressable onPress={() => void previewNotificationAsset(resolveMedicationSoundAsset(soundId))} style={styles.previewBtn}>
                    <MaterialIcons name="volume-up" size={28} color={Theme.colors.primaryLimeDark} />
                  </Pressable>
                </View>
              );
            })}

            <Pressable
              onPress={() => void handleLogout()}
              style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel={t('hybrid.logout')}
            >
              <MaterialIcons name="logout" size={24} color={Theme.colors.accentOrange} />
              <Text style={styles.logoutText}>{t('hybrid.logout')}</Text>
            </Pressable>
          </>
        )}
      </CaretakerTourScrollView>
    </View>
    </CaretakerTourScrollProvider>
  );
}

function RowSwitch({ label, sub, value, busy, onChange }: { label: string; sub: string; value: boolean; busy: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.rowCard}>
      <View style={{ flex: 1 }}><Text style={styles.rowTitle}>{label}</Text><Text style={styles.rowSub}>{sub}</Text></View>
      <Switch value={value} disabled={busy} onValueChange={onChange} trackColor={{ true: Theme.colors.primaryLimeDark, false: Theme.colors.border }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Theme.colors.background },
  scroll: { padding: Theme.spacing.l },
  rowCardWrap: { width: '100%' },
  soundSectionWrap: { width: '100%' },
  sectionTitle: { fontSize: Theme.typography.title, fontWeight: '800', color: Theme.colors.textDark, marginBottom: Theme.spacing.s },
  sectionHint: { fontSize: Theme.typography.caption, color: Theme.colors.textLight, marginBottom: Theme.spacing.m, lineHeight: 20 },
  gap: { marginTop: Theme.spacing.xl },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.m, backgroundColor: Theme.colors.surfaceWhite, borderRadius: Theme.borderRadius.large, borderWidth: 1, borderColor: Theme.colors.border, padding: Theme.spacing.m, marginBottom: Theme.spacing.m },
  rowTitle: { fontSize: Theme.typography.body, fontWeight: '700', color: Theme.colors.textDark },
  rowSub: { marginTop: 4, fontSize: Theme.typography.caption, color: Theme.colors.textLight, lineHeight: 20 },
  langBlock: { backgroundColor: Theme.colors.surfaceWhite, borderRadius: Theme.borderRadius.large, borderWidth: 1, borderColor: Theme.colors.border, padding: Theme.spacing.m, marginBottom: Theme.spacing.m },
  langRow: { flexDirection: 'row', gap: Theme.spacing.s, marginTop: Theme.spacing.s },
  langChip: { flex: 1, paddingVertical: 12, borderRadius: Theme.borderRadius.medium, borderWidth: 1, borderColor: Theme.colors.border, alignItems: 'center' },
  langChipActive: { borderColor: Theme.colors.primaryLimeDark, backgroundColor: 'rgba(69, 104, 130, 0.12)' },
  langChipText: { fontWeight: '700', color: Theme.colors.textLight },
  langChipTextActive: { color: Theme.colors.primaryLimeDark },
  soundRow: { flexDirection: 'row', gap: Theme.spacing.s, marginBottom: Theme.spacing.m },
  soundCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.s, backgroundColor: Theme.colors.surfaceWhite, borderRadius: Theme.borderRadius.large, borderWidth: 1, borderColor: Theme.colors.border, padding: Theme.spacing.m },
  soundCardSelected: { borderColor: Theme.colors.primaryLimeDark, borderWidth: 2 },
  previewBtn: { width: 56, borderRadius: Theme.borderRadius.medium, borderWidth: 1, borderColor: Theme.colors.border, backgroundColor: Theme.colors.surfaceWhite, alignItems: 'center', justifyContent: 'center' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.s,
    marginTop: Theme.spacing.xl,
    backgroundColor: Theme.colors.surfaceWhite,
    borderRadius: Theme.borderRadius.large,
    borderWidth: 1,
    borderColor: Theme.colors.accentOrange,
    paddingVertical: Theme.spacing.m,
    paddingHorizontal: Theme.spacing.l,
  },
  logoutBtnPressed: { opacity: 0.85 },
  logoutText: { fontSize: Theme.typography.body, fontWeight: '700', color: Theme.colors.accentOrange },
});
