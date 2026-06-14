import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../constants/theme';
import { CaretakerTourAnchor } from '../../components/caretaker/CaretakerTourAnchor';

type DependentProfileHeaderProps = {
  title?: string;
  subtitle?: string;
  showSettings?: boolean;
  dependentId?: string;
  onBack?: () => void;
};

export function DependentProfileHeader({
  title,
  subtitle,
  showSettings = false,
  dependentId,
  onBack,
}: DependentProfileHeaderProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const paddingTop = Math.max(insets.top, Platform.OS === 'web' ? 12 : 0) + Theme.spacing.m;

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    router.push('/(caretaker)');
  };

  const openSettings = () => {
    if (!dependentId) return;
    router.push(`/(caretaker)/dependent/${dependentId}/settings` as any);
  };

  return (
    <View style={[styles.bar, { paddingTop }]}>
      <Pressable
        onPress={handleBack}
        style={styles.sideBtn}
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
      >
        <MaterialIcons name="arrow-back" size={26} color={Theme.colors.textDark} />
      </Pressable>
      <View style={styles.titleWrap}>
        <Text style={styles.title} numberOfLines={1}>
          {title?.trim() || t('caretaker.dependentHeader')}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {showSettings && dependentId ? (
        <CaretakerTourAnchor
          stepId="dependent-settings"
          titleKey="caretaker.tour.dependentSettings.title"
          bodyKey="caretaker.tour.dependentSettings.body"
          placement="bottom"
          afterStepId="dependent-tabs"
          reserveBottom={0}
        >
          <Pressable
            onPress={openSettings}
            style={({ pressed }) => [styles.settingsBtn, pressed && styles.settingsBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel={t('tabs.settings')}
          >
            <MaterialIcons name="settings" size={28} color={Theme.colors.primaryLimeDark} />
          </Pressable>
        </CaretakerTourAnchor>
      ) : (
        <View style={styles.sideBtnSpacer} />
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
  sideBtn: {
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sideBtnSpacer: {
    width: 48,
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
});
