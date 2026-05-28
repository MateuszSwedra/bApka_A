import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../constants/theme';

export function DependentProfileHeader() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const paddingTop = Math.max(insets.top, Platform.OS === 'web' ? 12 : 0) + Theme.spacing.m;

  return (
    <View style={[styles.bar, { paddingTop }]}>
      <Pressable
        onPress={() => router.push('/(caretaker)')}
        style={styles.backBtn}
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
      >
        <MaterialIcons name="arrow-back" size={28} color={Theme.colors.textDark} />
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>
        {t('caretaker.dependentHeader')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.l,
    paddingBottom: Theme.spacing.m,
    backgroundColor: Theme.colors.surfaceWhite,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  backBtn: {
    padding: 4,
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    fontSize: Theme.typography.title,
    fontWeight: '800',
    color: Theme.colors.textDark,
    marginLeft: Theme.spacing.s,
  },
});
