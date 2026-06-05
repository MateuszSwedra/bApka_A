import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../constants/theme';
import { router } from 'expo-router';

type HybridProfileHeaderProps = {
  title?: string;
  subtitle?: string;
  showSettings?: boolean;
};

export function HybridProfileHeader({ title, subtitle, showSettings = true }: HybridProfileHeaderProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const paddingTop = Math.max(insets.top, Platform.OS === 'web' ? 12 : 0) + Theme.spacing.m;

  return (
    <View style={[styles.bar, { paddingTop }]}>
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
        <Pressable
          onPress={() => router.push('/(hybrid)/(tabs)/settings' as any)}
          style={styles.iconBtn}
          accessibilityLabel={t('tabs.settings')}
        >
          <MaterialIcons name="settings" size={26} color={Theme.colors.textDark} />
        </Pressable>
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
  iconBtn: {
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconSpacer: { width: 48 },
});
