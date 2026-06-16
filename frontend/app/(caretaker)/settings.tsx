import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../constants/theme';
import { usersAPI } from '../../services/api';
import {
  applyAppLanguagePreference,
  getStoredAppLanguagePreference,
  normalizeAppLanguagePreference,
  type AppLanguagePreference,
} from '../../services/appLanguage';

export default function CaretakerSettingsScreen() {
  const { t } = useTranslation();
  const [language, setLanguage] = useState<AppLanguagePreference>('system');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const me = await usersAPI.getMe();
      const storedPreference = await getStoredAppLanguagePreference();
      setLanguage(storedPreference ?? normalizeAppLanguagePreference(me?.appLanguage));
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
      if (saving) return;
      setSaving(true);
      try {
        const resolved = await applyAppLanguagePreference(next);
        await usersAPI.updateSettings({ appLanguage: resolved });
        setLanguage(next);
      } catch {
        Alert.alert(t('common.error'), t('caretaker.settings.saveError'));
      } finally {
        setSaving(false);
      }
    },
    [saving, t],
  );

  return (
    <View style={styles.root}>
      <View style={styles.header}>
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
        <View style={styles.card}>
          <Text style={styles.rowTitle}>{t('caretaker.settings.caretakerLanguage')}</Text>
          <Text style={styles.rowSub}>{t('caretaker.settings.caretakerLanguageSub')}</Text>
          <View style={styles.langRow}>
            {(['system', 'pl', 'en'] as AppLanguagePreference[]).map(lang => {
              const selected = language === lang;
              return (
                <Pressable
                  key={lang}
                  disabled={saving}
                  onPress={() => void saveLanguage(lang)}
                  style={[
                    styles.langChip,
                    selected && styles.langChipActive,
                    saving && { opacity: 0.6 },
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    padding: Theme.spacing.l,
  },
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
  card: {
    backgroundColor: Theme.colors.surfaceWhite,
    borderRadius: Theme.borderRadius.large,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.m,
  },
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
});
