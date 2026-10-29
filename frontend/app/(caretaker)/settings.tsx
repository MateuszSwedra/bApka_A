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
  Modal,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { usersAPI } from '../../services/api';
import { ConfirmPhraseModal } from '../../components/ConfirmPhraseModal';
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
import { isUserUuid } from '../../utils/resolveMedsTargetUserId';

type DependentLite = { id: string; email: string; name?: string };

export default function CaretakerSettingsScreen() {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [language, setLanguage] = useState<AppLanguagePreference>('system');
  const [medSound, setMedSound] = useState<NotificationSoundChoiceId>('default');
  const [sosSound, setSosSound] = useState<NotificationSoundChoiceId>('default');
  const [loading, setLoading] = useState(true);
  const [savingLang, setSavingLang] = useState(false);
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const [dependents, setDependents] = useState<DependentLite[]>([]);
  const [pickSeniorOpen, setPickSeniorOpen] = useState(false);
  const [selfDeleteOpen, setSelfDeleteOpen] = useState(false);
  const [seniorDeleteTarget, setSeniorDeleteTarget] = useState<DependentLite | null>(null);
  const [busyDelete, setBusyDelete] = useState(false);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') window.alert(`${title}: ${message}`);
    else Alert.alert(title, message);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [me, storedPreference, med, sos, deps] = await Promise.all([
        usersAPI.getMe(),
        getStoredAppLanguagePreference(),
        getMedicationSoundChoice(),
        getSosSoundChoice(),
        usersAPI.getDependents().catch(() => []),
      ]);
      setLanguage(storedPreference ?? normalizeAppLanguagePreference(me?.appLanguage));
      setMedSound(med);
      setSosSound(sos);
      const list = Array.isArray(deps) ? deps : [];
      setDependents(
        list.filter((d): d is DependentLite => !!d?.id && isUserUuid(String(d.id))),
      );
    } catch {
      Alert.alert(t('common.error'), t('caretaker.settings.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const onDeleteSelf = async () => {
    setBusyDelete(true);
    try {
      await usersAPI.deleteMyAccount();
      setSelfDeleteOpen(false);
      showAlert(t('common.success'), t('caretaker.settings.deleteSuccess'));
      await logout();
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('caretaker.settings.deleteError');
      showAlert(t('common.error'), msg || t('caretaker.settings.deleteError'));
    } finally {
      setBusyDelete(false);
    }
  };

  const onDeleteSenior = async () => {
    if (!seniorDeleteTarget) return;
    setBusyDelete(true);
    try {
      await usersAPI.deleteDependentAccount(seniorDeleteTarget.id);
      setSeniorDeleteTarget(null);
      showAlert(t('common.success'), t('caretaker.settings.deleteSuccess'));
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('caretaker.settings.deleteError');
      showAlert(t('common.error'), msg || t('caretaker.settings.deleteError'));
    } finally {
      setBusyDelete(false);
    }
  };

  const openDeleteSenior = () => {
    if (dependents.length === 0) {
      showAlert(t('common.error'), t('caretaker.settings.deleteSeniorNone'));
      return;
    }
    if (dependents.length === 1) {
      setSeniorDeleteTarget(dependents[0]);
      return;
    }
    setPickSeniorOpen(true);
  };

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

          <Text style={[styles.sectionTitle, styles.sectionGap]}>
            {t('caretaker.settings.dangerSection')}
          </Text>
          <Text style={styles.sectionHint}>{t('caretaker.settings.dangerHint')}</Text>

          <Pressable
            onPress={() => setSelfDeleteOpen(true)}
            style={({ pressed }) => [styles.dangerBtn, pressed && { opacity: 0.9 }]}
          >
            <MaterialIcons name="delete-forever" size={22} color="#fff" />
            <Text style={styles.dangerBtnText}>{t('caretaker.settings.deleteMyAccount')}</Text>
          </Pressable>

          <Pressable
            onPress={openDeleteSenior}
            style={({ pressed }) => [styles.dangerBtnOutline, pressed && { opacity: 0.9 }]}
          >
            <MaterialIcons name="person-off" size={22} color="#C62828" />
            <Text style={styles.dangerBtnOutlineText}>
              {t('caretaker.settings.deleteSeniorAccount')}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/legal-account-deletion' as never)}
            style={({ pressed }) => [styles.policyLink, pressed && { opacity: 0.85 }]}
          >
            <MaterialIcons name="description" size={20} color={Theme.colors.primaryLimeDark} />
            <Text style={styles.policyLinkText}>{t('caretaker.settings.deletionPolicyLink')}</Text>
            <MaterialIcons name="chevron-right" size={20} color={Theme.colors.textLight} />
          </Pressable>
        </ScrollView>
      )}

      <ConfirmPhraseModal
        visible={selfDeleteOpen}
        title={t('caretaker.settings.deleteSelfTitle')}
        message={t('caretaker.settings.deleteSelfMessage')}
        expectedPhrase={t('caretaker.settings.phraseDelete')}
        phraseHint={t('caretaker.settings.phraseHint')}
        confirmLabel={t('caretaker.settings.confirmDelete')}
        cancelLabel={t('common.cancel')}
        loading={busyDelete}
        onCancel={() => !busyDelete && setSelfDeleteOpen(false)}
        onConfirm={onDeleteSelf}
      />

      <ConfirmPhraseModal
        visible={!!seniorDeleteTarget}
        title={t('caretaker.settings.deleteSeniorTitle')}
        message={t('caretaker.settings.deleteSeniorMessage', {
          name:
            seniorDeleteTarget?.name?.trim() ||
            seniorDeleteTarget?.email ||
            t('caretaker.dependentFallbackName'),
        })}
        expectedPhrase={t('caretaker.settings.phraseDelete')}
        phraseHint={t('caretaker.settings.phraseHint')}
        confirmLabel={t('caretaker.settings.confirmDelete')}
        cancelLabel={t('common.cancel')}
        loading={busyDelete}
        onCancel={() => !busyDelete && setSeniorDeleteTarget(null)}
        onConfirm={onDeleteSenior}
      />

      <Modal
        visible={pickSeniorOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickSeniorOpen(false)}
      >
        <View style={styles.pickOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPickSeniorOpen(false)} />
          <View style={styles.pickCard}>
            <Text style={styles.pickTitle}>{t('caretaker.settings.deleteSeniorPickTitle')}</Text>
            {dependents.map(d => (
              <Pressable
                key={d.id}
                onPress={() => {
                  setPickSeniorOpen(false);
                  setSeniorDeleteTarget(d);
                }}
                style={({ pressed }) => [styles.pickRow, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.pickRowText}>{d.name?.trim() || d.email}</Text>
                <MaterialIcons name="chevron-right" size={22} color={Theme.colors.textLight} />
              </Pressable>
            ))}
            <Pressable onPress={() => setPickSeniorOpen(false)} style={styles.pickCancel}>
              <Text style={styles.pickCancelText}>{t('common.cancel')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#C62828',
    borderRadius: Theme.borderRadius.large,
    paddingVertical: 15,
    marginBottom: Theme.spacing.m,
  },
  dangerBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: Theme.typography.body,
  },
  dangerBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Theme.colors.surfaceWhite,
    borderRadius: Theme.borderRadius.large,
    borderWidth: 2,
    borderColor: '#C62828',
    paddingVertical: 14,
    marginBottom: Theme.spacing.m,
  },
  dangerBtnOutlineText: {
    color: '#C62828',
    fontWeight: '800',
    fontSize: Theme.typography.body,
  },
  policyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.s,
    paddingVertical: Theme.spacing.m,
  },
  policyLinkText: {
    flex: 1,
    fontSize: Theme.typography.body,
    fontWeight: '700',
    color: Theme.colors.primaryLimeDark,
  },
  pickOverlay: {
    flex: 1,
    backgroundColor: 'rgba(27, 60, 83, 0.55)',
    justifyContent: 'center',
    padding: Theme.spacing.l,
  },
  pickCard: {
    backgroundColor: Theme.colors.surfaceWhite,
    borderRadius: Theme.borderRadius.xlarge,
    padding: Theme.spacing.l,
  },
  pickTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Theme.colors.textDark,
    marginBottom: Theme.spacing.m,
  },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  pickRowText: {
    flex: 1,
    fontSize: Theme.typography.body,
    fontWeight: '700',
    color: Theme.colors.textDark,
  },
  pickCancel: {
    marginTop: Theme.spacing.m,
    alignItems: 'center',
    paddingVertical: 12,
  },
  pickCancelText: {
    fontWeight: '700',
    color: Theme.colors.textLight,
  },
});
