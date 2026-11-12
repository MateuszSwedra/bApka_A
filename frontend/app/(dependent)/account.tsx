import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { usersAPI } from '../../services/api';
import { ConfirmPhraseModal } from '../../components/ConfirmPhraseModal';
import { getScreenBottomPadding } from '../../utils/safeAreaInsets';
import {
  getConsentPreferences,
  setConsentPreferences,
} from '../../services/consentPreferences';
import { ConsentPreferencesCard } from '../../components/settings/ConsentPreferencesCard';
import { useDependentDisplay } from '../../context/DependentDisplayContext';

export default function DependentAccountScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const { colors } = useDependentDisplay();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [consentAnalytics, setConsentAnalytics] = useState(false);
  const [consentTailored, setConsentTailored] = useState(false);
  const [savingConsent, setSavingConsent] = useState(false);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') window.alert(`${title}: ${message}`);
    else Alert.alert(title, message);
  };

  const loadConsents = useCallback(async () => {
    try {
      const consents = await getConsentPreferences();
      setConsentAnalytics(consents.analytics);
      setConsentTailored(consents.tailoredContent);
    } catch {
      // zostaw domyślne wyłączone
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadConsents();
    }, [loadConsents]),
  );

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

  const onDelete = async () => {
    setBusy(true);
    try {
      await usersAPI.deleteMyAccount();
      setConfirmOpen(false);
      await logout({ skipPushClear: true });
      showAlert(t('common.success'), t('dependent.account.deleteSuccess'));
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('dependent.account.deleteError');
      showAlert(t('common.error'), msg || t('dependent.account.deleteError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.surfaceWhite, borderColor: colors.border }]}
          accessibilityLabel={t('common.back')}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.primaryLimeDark} />
        </Pressable>
        <Text style={[styles.title, { color: colors.textDark }]}>
          {t('dependent.account.sheetTitle')}
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: Theme.spacing.l,
          paddingBottom: getScreenBottomPadding(insets.bottom, Theme.spacing.xl),
        }}
      >
        <Text style={[styles.sectionTitle, { color: colors.textDark }]}>
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

        <Text style={[styles.sectionTitle, styles.sectionGap, { color: colors.textDark }]}>
          {t('caretaker.settings.dangerSection')}
        </Text>
        <View style={styles.warnCard}>
          <MaterialIcons name="warning-amber" size={32} color="#C62828" />
          <Text style={styles.warnText}>{t('dependent.account.deleteWarning')}</Text>
        </View>

        <Pressable
          onPress={() => router.push('/legal-account-deletion' as never)}
          style={({ pressed }) => [
            styles.linkRow,
            { backgroundColor: colors.surfaceWhite, borderColor: colors.border },
            pressed && { opacity: 0.85 },
          ]}
        >
          <MaterialIcons name="description" size={22} color={colors.primaryLimeDark} />
          <Text style={[styles.linkText, { color: colors.primaryLimeDark }]}>
            {t('dependent.account.policyLink')}
          </Text>
          <MaterialIcons name="chevron-right" size={22} color={colors.textLight} />
        </Pressable>

        <Pressable
          onPress={() => setConfirmOpen(true)}
          style={({ pressed }) => [styles.dangerBtn, pressed && { opacity: 0.9 }]}
        >
          <MaterialIcons name="delete-forever" size={22} color="#fff" />
          <Text style={styles.dangerBtnText}>{t('dependent.account.deleteCta')}</Text>
        </Pressable>
      </ScrollView>

      <ConfirmPhraseModal
        visible={confirmOpen}
        title={t('dependent.account.deleteTitle')}
        message={t('dependent.account.deleteWarning')}
        expectedPhrase={t('dependent.account.phraseDelete')}
        phraseHint={t('dependent.account.phraseHint')}
        confirmLabel={t('dependent.account.confirmDelete')}
        cancelLabel={t('common.cancel')}
        loading={busy}
        onCancel={() => !busy && setConfirmOpen(false)}
        onConfirm={onDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Theme.colors.background },
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
  title: {
    fontSize: Theme.typography.title,
    fontWeight: '800',
    color: Theme.colors.textDark,
  },
  sectionTitle: {
    fontSize: Theme.typography.title,
    fontWeight: '800',
    marginBottom: Theme.spacing.s,
  },
  sectionGap: {
    marginTop: Theme.spacing.l,
  },
  warnCard: {
    backgroundColor: '#FFEBEE',
    borderRadius: Theme.borderRadius.large,
    borderWidth: 1.5,
    borderColor: '#EF9A9A',
    padding: Theme.spacing.m,
    gap: Theme.spacing.s,
    marginBottom: Theme.spacing.l,
  },
  warnText: {
    fontSize: Theme.typography.body,
    fontWeight: '700',
    color: '#B71C1C',
    lineHeight: 22,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.s,
    backgroundColor: Theme.colors.surfaceWhite,
    borderRadius: Theme.borderRadius.large,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.m,
    marginBottom: Theme.spacing.l,
  },
  linkText: {
    flex: 1,
    fontSize: Theme.typography.body,
    fontWeight: '700',
    color: Theme.colors.primaryLimeDark,
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#C62828',
    borderRadius: Theme.borderRadius.large,
    paddingVertical: 16,
  },
  dangerBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: Theme.typography.body,
  },
});
