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
  ScrollView,
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
import {
  applyAppLanguage,
  getStoredAppLanguagePreference,
  normalizeAppLanguage,
  resolveLanguageFromPreference,
  type AppLanguagePreference,
} from '../../../services/appLanguage';
import type { AppLanguage } from '../../../i18n/resolveLanguage';
import { applySeniorProfileSettings } from '../../../services/seniorProfileSync';
import { useDependentDisplay } from '../../../context/DependentDisplayContext';
import { useTabScreenScrollBottomPadding } from '../../../utils/safeAreaInsets';
import {
  getConsentPreferences,
  setConsentPreferences,
} from '../../../services/consentPreferences';
import { ConsentPreferencesCard } from '../../../components/settings/ConsentPreferencesCard';
import { ConfirmPhraseModal } from '../../../components/ConfirmPhraseModal';

type SelfSettings = {
  highContrast: boolean;
  colorBlindFriendly: boolean;
  appLanguage: AppLanguage;
  medicationSoundChoice: NotificationSoundChoiceId;
};

const DEFAULT: SelfSettings = {
  highContrast: false,
  colorBlindFriendly: false,
  appLanguage: 'pl',
  medicationSoundChoice: 'default',
};

export default function HybridSettingsScreen() {
  const { t } = useTranslation();
  const scrollBottomPadding = useTabScreenScrollBottomPadding();
  const { logout } = useAuth();
  const { colors, syncLocalPreferences } = useDependentDisplay();
  const [displayName, setDisplayName] = useState('');
  const [settings, setSettings] = useState<SelfSettings>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [consentAnalytics, setConsentAnalytics] = useState(false);
  const [consentTailored, setConsentTailored] = useState(false);
  const [savingConsent, setSavingConsent] = useState(false);
  const [selfDeleteOpen, setSelfDeleteOpen] = useState(false);
  const [busyDelete, setBusyDelete] = useState(false);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') window.alert(`${title}: ${message}`);
    else Alert.alert(title, message);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [me, storedPreference, consents] = await Promise.all([
        usersAPI.getMe(),
        getStoredAppLanguagePreference(),
        getConsentPreferences(),
      ]);
      setDisplayName(me?.name?.trim() || me?.email || '');
      const preference: AppLanguagePreference =
        storedPreference ?? normalizeAppLanguage(me?.appLanguage);
      setSettings({
        highContrast: me?.highContrast ?? false,
        colorBlindFriendly: me?.colorBlindFriendly ?? false,
        appLanguage: resolveLanguageFromPreference(preference),
        medicationSoundChoice: (me?.medicationSoundChoice ?? 'default') as NotificationSoundChoiceId,
      });
      setConsentAnalytics(consents.analytics);
      setConsentTailored(consents.tailoredContent);
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

  const saveConsent = async (next: { analytics: boolean; tailoredContent: boolean }) => {
    if (savingConsent) return;
    const prev = { analytics: consentAnalytics, tailoredContent: consentTailored };
    setConsentAnalytics(next.analytics);
    setConsentTailored(next.tailoredContent);
    setSavingConsent(true);
    try {
      await setConsentPreferences(next);
    } catch {
      setConsentAnalytics(prev.analytics);
      setConsentTailored(prev.tailoredContent);
      showAlert(t('common.error'), t('settings.consents.saveError'));
    } finally {
      setSavingConsent(false);
    }
  };

  const onDeleteSelf = async () => {
    setBusyDelete(true);
    try {
      await usersAPI.deleteMyAccount();
      setSelfDeleteOpen(false);
      await logout({ skipPushClear: true });
      showAlert(t('common.success'), t('hybrid.settings.deleteSuccess'));
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('hybrid.settings.deleteError');
      showAlert(t('common.error'), msg || t('hybrid.settings.deleteError'));
    } finally {
      setBusyDelete(false);
    }
  };

  const patch = async (patchData: Partial<SelfSettings>, key: string) => {
    setSavingKey(key);
    try {
      const updated = await usersAPI.updateSettings(patchData);
      setSettings(prev => ({ ...prev, ...patchData }));
      await applySeniorProfileSettings(updated ?? patchData);
      await syncLocalPreferences();
      if (patchData.appLanguage) {
        await applyAppLanguage(patchData.appLanguage);
        await usersAPI.updateSettings({ appLanguage: patchData.appLanguage });
      }
    } catch {
      Alert.alert(t('common.error'), t('caretaker.settings.saveError'));
      void load();
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <HybridProfileHeader
        title={t('tabs.settings')}
        subtitle={displayName}
        showSettings={false}
        showBack
        onBack={() => router.push('/(hybrid)/(tabs)/' as any)}
      />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: scrollBottomPadding }]}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primaryLimeDark} style={{ marginTop: 32 }} />
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textDark }]}>{t('hybrid.settings.section')}</Text>
            <Text style={[styles.sectionHint, { color: colors.textLight }]}>{t('hybrid.settings.sectionHint')}</Text>

            <Text style={[styles.sectionTitle, styles.gap, { color: colors.textDark }]}>{t('caretaker.settings.accessibility')}</Text>

            <View style={styles.rowCardWrap}>
              <RowSwitch colors={colors} label={t('dependent.settings.colorBlind')} sub={t('dependent.settings.colorBlindSub')} value={settings.colorBlindFriendly} busy={savingKey === 'colorBlindFriendly'} onChange={v => void patch({ colorBlindFriendly: v }, 'colorBlindFriendly')} />
            </View>

            <View style={styles.rowCardWrap}>
              <RowSwitch colors={colors} label={t('dependent.settings.highContrast')} sub={t('dependent.settings.highContrastSub')} value={settings.highContrast} busy={savingKey === 'highContrast'} onChange={v => void patch({ highContrast: v }, 'highContrast')} />
            </View>

            <Text style={[styles.sectionTitle, styles.gap, { color: colors.textDark }]}>{t('caretaker.settings.languageSection')}</Text>

            <View style={styles.rowCardWrap}>
              <View style={[styles.langBlock, { backgroundColor: colors.surfaceWhite, borderColor: colors.border }]}>
                <Text style={[styles.rowTitle, { color: colors.textDark }]}>{t('hybrid.settings.language')}</Text>
                <View style={styles.langRow}>
                  {(['pl', 'en'] as AppLanguage[]).map(lang => (
                    <Pressable key={lang} disabled={savingKey === 'lang'} onPress={() => void patch({ appLanguage: lang }, 'lang')} style={[styles.langChip, { borderColor: colors.border }, settings.appLanguage === lang && { borderColor: colors.primaryLimeDark, backgroundColor: 'rgba(69, 104, 130, 0.12)' }]}>
                      <Text style={[styles.langChipText, { color: colors.textLight }, settings.appLanguage === lang && { color: colors.primaryLimeDark }]}>{t(`caretaker.settings.language.${lang}`)}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.soundSectionWrap}>
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
            </View>

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

            <Text style={[styles.sectionTitle, styles.gap, { color: colors.textDark }]}>
              {t('settings.consents.title')}
            </Text>
            <ConsentPreferencesCard
              analytics={consentAnalytics}
              tailoredContent={consentTailored}
              busy={savingConsent}
              colors={{
                surface: colors.surfaceWhite,
                border: colors.border,
                text: colors.textDark,
                textMuted: colors.textLight,
                trackOn: colors.primaryLimeDark,
                trackOff: colors.border,
              }}
              onChangeAnalytics={value =>
                void saveConsent({ analytics: value, tailoredContent: consentTailored })
              }
              onChangeTailored={value =>
                void saveConsent({ analytics: consentAnalytics, tailoredContent: value })
              }
            />

            <Text style={[styles.sectionTitle, styles.gap, { color: colors.textDark }]}>
              {t('hybrid.settings.dangerSection')}
            </Text>
            <Text style={[styles.sectionHint, { color: colors.textLight }]}>
              {t('hybrid.settings.dangerHint')}
            </Text>
            <Pressable
              onPress={() => setSelfDeleteOpen(true)}
              style={({ pressed }) => [styles.dangerBtn, pressed && { opacity: 0.9 }]}
            >
              <MaterialIcons name="delete-forever" size={22} color="#fff" />
              <Text style={styles.dangerBtnText}>{t('hybrid.settings.deleteMyAccount')}</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/legal-account-deletion' as never)}
              style={({ pressed }) => [styles.policyLink, pressed && { opacity: 0.85 }]}
            >
              <MaterialIcons name="description" size={20} color={colors.primaryLimeDark} />
              <Text style={[styles.policyLinkText, { color: colors.primaryLimeDark }]}>
                {t('hybrid.settings.deletionPolicyLink')}
              </Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.textLight} />
            </Pressable>
          </>
        )}
      </ScrollView>

      <ConfirmPhraseModal
        visible={selfDeleteOpen}
        title={t('hybrid.settings.deleteSelfTitle')}
        message={t('hybrid.settings.deleteSelfMessage')}
        expectedPhrase={t('hybrid.settings.phraseDelete')}
        phraseHint={t('hybrid.settings.phraseHint')}
        confirmLabel={t('hybrid.settings.confirmDelete')}
        cancelLabel={t('common.cancel')}
        loading={busyDelete}
        onCancel={() => !busyDelete && setSelfDeleteOpen(false)}
        onConfirm={onDeleteSelf}
      />
    </View>
  );
}

function RowSwitch({
  colors,
  label,
  sub,
  value,
  busy,
  onChange,
}: {
  colors: { primaryLimeDark: string; border: string; surfaceWhite: string; textDark: string; textLight: string };
  label: string;
  sub: string;
  value: boolean;
  busy: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={[styles.rowCard, { backgroundColor: colors.surfaceWhite, borderColor: colors.border }]}>
      <View style={{ flex: 1 }}><Text style={[styles.rowTitle, { color: colors.textDark }]}>{label}</Text><Text style={[styles.rowSub, { color: colors.textLight }]}>{sub}</Text></View>
      <Switch value={value} disabled={busy} onValueChange={onChange} trackColor={{ true: colors.primaryLimeDark, false: colors.border }} />
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
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#C62828',
    borderRadius: Theme.borderRadius.large,
    paddingVertical: 16,
    marginBottom: Theme.spacing.m,
  },
  dangerBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: Theme.typography.body,
  },
  policyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.s,
    backgroundColor: Theme.colors.surfaceWhite,
    borderRadius: Theme.borderRadius.large,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.m,
  },
  policyLinkText: {
    flex: 1,
    fontSize: Theme.typography.body,
    fontWeight: '700',
  },
});
