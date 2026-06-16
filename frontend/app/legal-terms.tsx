import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LEGAL_DOCS, type LegalLocale } from './consents';
import { Theme } from '../constants/theme';
import {
  OnboardingPalette,
  OnboardingGradient,
} from '../constants/onboardingTheme';
import { getScreenBottomPadding } from '../utils/safeAreaInsets';

export default function LegalTermsScreen() {
  const { i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const bottomPadding = getScreenBottomPadding(insets.bottom, Theme.spacing.m);

  const locale: LegalLocale = i18n.language?.toLowerCase().startsWith('pl') ? 'pl' : 'en';
  const doc = LEGAL_DOCS[locale].terms;

  const paragraphs = doc.body
    .split('\n\n')
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <View style={styles.screen}>
      <Pressable
        onPress={() => router.back()}
        style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.85 }]}
        accessibilityRole="button"
        accessibilityLabel="Back"
      >
        <MaterialCommunityIcons
          name="chevron-left"
          size={28}
          color={OnboardingPalette.surface}
        />
      </Pressable>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomPadding + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Image
          source={require('../assets/images/consent-hero.png')}
          style={styles.hero}
          resizeMode="contain"
        />

        <Text style={styles.title}>{doc.title}</Text>

        <View style={styles.card}>
          {paragraphs.map((p, idx) => (
            <Text key={idx} style={styles.paragraph}>
              {p}
            </Text>
          ))}
        </View>

        <View style={{ height: 16 }} />

        <View style={styles.footerHint}>
          <View style={styles.footerPill}>
            <Text style={styles.footerPillText}>
              {locale === 'pl' ? 'Możesz wrócić i zapisać zgody.' : 'You can go back and save consents.'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: OnboardingPalette.background,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
  },
  backBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 36,
    left: 16,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: OnboardingPalette.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: OnboardingPalette.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 52,
  },
  hero: {
    width: '100%',
    maxWidth: 280,
    height: 140,
    alignSelf: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: OnboardingPalette.textPrimary,
    textAlign: 'center',
    marginBottom: 18,
  },
  card: {
    backgroundColor: OnboardingPalette.surface,
    borderRadius: Theme.borderRadius.large,
    padding: 16,
    borderWidth: 1,
    borderColor: OnboardingPalette.border,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 21,
    color: OnboardingPalette.textPrimary,
    marginBottom: 14,
  },
  footerHint: {
    alignItems: 'center',
    marginTop: 6,
  },
  footerPill: {
    backgroundColor: OnboardingPalette.surfaceMuted,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  footerPillText: {
    color: OnboardingPalette.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
});

