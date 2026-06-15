import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../constants/theme';
import { router } from 'expo-router';
import { SeniorTourTarget } from '../senior/SeniorTourTarget';

type HybridProfileHeaderProps = {
  title?: string;
  subtitle?: string;
  showSettings?: boolean;
  showBack?: boolean;
  onBack?: () => void;
};

export function HybridProfileHeader({
  title,
  subtitle,
  showSettings = false,
  showBack = false,
  onBack,
}: HybridProfileHeaderProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const paddingTop = Math.max(insets.top, Platform.OS === 'web' ? 12 : 0) + Theme.spacing.m;

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    router.push('/(hybrid)/(tabs)/' as any);
  };

  return (
    <View style={[styles.bar, { paddingTop }]}>
      {showBack ? (
        <Pressable
          onPress={handleBack}
          style={styles.sideBtn}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <MaterialIcons name="arrow-back" size={26} color={Theme.colors.textDark} />
        </Pressable>
      ) : (
        <View style={styles.iconSpacer} />
      )}
      <View style={styles.titleWrap}>
        <Text style={styles.title} numberOfLines={1}>
          {title?.trim() || t('hybrid.panelTitle')}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {showSettings ? (
        <SeniorTourTarget stepId="hybrid-settings">
          <Pressable
            onPress={() => router.push('/(hybrid)/(tabs)/settings' as any)}
            style={({ pressed }) => [styles.settingsBtn, pressed && styles.settingsBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel={t('tabs.settings')}
          >
            <MaterialIcons name="settings" size={28} color={Theme.colors.primaryLimeDark} />
          </Pressable>
        </SeniorTourTarget>
      ) : (
        <View style={styles.iconSpacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.m,
    paddingBottom: Theme.spacing.m,
    backgroundColor: 'transparent',
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
    fontSize: Theme.typography.title,
    fontWeight: '800',
    color: Theme.colors.textDark,
    letterSpacing: -0.2,
  },
  subtitle: {
    marginTop: 2,
    textAlign: 'center',
    fontSize: Theme.typography.caption,
    fontWeight: '500',
    color: Theme.colors.textLight,
  },
  settingsBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Theme.colors.surfaceWhite,
    borderWidth: 2,
    borderColor: Theme.colors.primaryLimeDark,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Theme.colors.shadowNeutral,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  settingsBtnPressed: {
    opacity: 0.85,
    backgroundColor: Theme.colors.surfaceWarmHighlight,
  },
  sideBtn: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconSpacer: { width: 48 },
});
