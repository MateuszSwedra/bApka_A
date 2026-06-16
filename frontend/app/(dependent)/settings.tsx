import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, Switch } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../constants/theme';
import { usersAPI } from '../../services/api';
import { applySeniorProfileSettings } from '../../services/seniorProfileSync';
import { useDependentDisplay } from '../../context/DependentDisplayContext';
import {
  applyAppLanguagePreference,
  getStoredAppLanguagePreference,
  normalizeAppLanguagePreference,
  type AppLanguagePreference,
} from '../../services/appLanguage';

type SelfSettings = {
  highContrast: boolean;
  colorBlindFriendly: boolean;
  appLanguage: AppLanguagePreference;
};

export default function DependentSettingsScreen() {
  const { t } = useTranslation();
  const { colors, syncLocalPreferences } = useDependentDisplay();
  const [settings, setSettings] = useState<SelfSettings>({
    highContrast: false,
    colorBlindFriendly: false,
    appLanguage: 'system',
  });
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const me = await usersAPI.getMe();
      const storedPreference = await getStoredAppLanguagePreference();
      setSettings({
        highContrast: me?.highContrast ?? false,
        colorBlindFriendly: me?.colorBlindFriendly ?? false,
        appLanguage: storedPreference ?? normalizeAppLanguagePreference(me?.appLanguage),
      });
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

  const patch = useCallback(
    async (patchData: Partial<SelfSettings>, key: string) => {
      setSavingKey(key);
      try {
        const partial: Record<string, unknown> = { ...patchData };
        if (patchData.appLanguage) {
          const resolved = await applyAppLanguagePreference(patchData.appLanguage);
          partial.appLanguage = resolved;
        }
        const updated = await usersAPI.updateSettings(partial);
        setSettings(prev => ({ ...prev, ...patchData }));
        await applySeniorProfileSettings(updated ?? partial);
        await syncLocalPreferences();
      } catch {
        Alert.alert(t('common.error'), t('caretaker.settings.saveError'));
        void load();
      } finally {
        setSavingKey(null);
      }
    },
    [load, t],
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.replace('/(dependent)' as any)}
          style={({ pressed }) => [styles.backBtn, { backgroundColor: colors.surfaceWhite, borderColor: colors.border }, pressed && styles.backBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.primaryLimeDark} />
        </Pressable>
        <Text style={[styles.title, { color: colors.textDark }]}>{t('dependent.settings.title')}</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primaryLimeDark} style={{ marginTop: 32 }} />
      ) : (
        <>
          <Text style={[styles.sectionTitle, { color: colors.textDark }]}>{t('dependent.settings.accessibility')}</Text>
          <View style={[styles.rowCard, { backgroundColor: colors.surfaceWhite, borderColor: colors.border }]}>
            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, { color: colors.textDark }]}>{t('dependent.settings.colorBlind')}</Text>
              <Text style={[styles.rowSub, { color: colors.textLight }]}>{t('dependent.settings.colorBlindSub')}</Text>
            </View>
            <Switch
              value={settings.colorBlindFriendly}
              disabled={savingKey === 'colorBlindFriendly'}
              onValueChange={v => void patch({ colorBlindFriendly: v }, 'colorBlindFriendly')}
              trackColor={{ true: colors.primaryLimeDark, false: colors.border }}
            />
          </View>
          <View style={[styles.rowCard, { backgroundColor: colors.surfaceWhite, borderColor: colors.border }]}>
            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, { color: colors.textDark }]}>{t('dependent.settings.highContrast')}</Text>
              <Text style={[styles.rowSub, { color: colors.textLight }]}>{t('dependent.settings.highContrastSub')}</Text>
            </View>
            <Switch
              value={settings.highContrast}
              disabled={savingKey === 'highContrast'}
              onValueChange={v => void patch({ highContrast: v }, 'highContrast')}
              trackColor={{ true: colors.primaryLimeDark, false: colors.border }}
            />
          </View>

          <Text style={[styles.sectionTitle, styles.sectionGap, { color: colors.textDark }]}>{t('caretaker.settings.languageSection')}</Text>
          <View style={[styles.rowCardColumn, { backgroundColor: colors.surfaceWhite, borderColor: colors.border }]}>
            <Text style={[styles.rowTitle, { color: colors.textDark }]}>{t('hybrid.settings.language')}</Text>
            <View style={styles.langRow}>
              {(['system', 'pl', 'en'] as AppLanguagePreference[]).map(lang => {
                const selected = settings.appLanguage === lang;
                return (
                  <Pressable
                    key={lang}
                    disabled={savingKey === 'lang'}
                    onPress={() => void patch({ appLanguage: lang }, 'lang')}
                    style={[styles.langChip, { borderColor: colors.border }, selected && { borderColor: colors.primaryLimeDark, backgroundColor: 'rgba(69, 104, 130, 0.12)' }]}
                  >
                    <Text style={[styles.langChipText, { color: colors.textLight }, selected && { color: colors.primaryLimeDark }]}>
                      {t(`caretaker.settings.language.${lang}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Theme.colors.background, padding: Theme.spacing.l },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.l,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
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
  sectionTitle: {
    fontSize: Theme.typography.title,
    fontWeight: '800',
    color: Theme.colors.textDark,
    marginBottom: Theme.spacing.s,
  },
  sectionGap: { marginTop: Theme.spacing.xl },
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
  rowCardColumn: {
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
});
