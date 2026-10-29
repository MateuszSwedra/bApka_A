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

import {
  ACCOUNT_DELETION_DOCS,
  type LegalLocale,
} from '../constants/accountDeletionLegal';
import { Theme } from '../constants/theme';
import { OnboardingPalette } from '../constants/onboardingTheme';
import { getScreenBottomPadding } from '../utils/safeAreaInsets';

export default function LegalAccountDeletionScreen() {
  const { i18n, t } = useTranslation();
  const insets = useSafeAreaInsets();
  const bottomPadding = getScreenBottomPadding(insets.bottom, Theme.spacing.m);

  const locale: LegalLocale = i18n.language?.toLowerCase().startsWith('pl') ? 'pl' : 'en';
  const doc = ACCOUNT_DELETION_DOCS[locale];

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
        accessibilityLabel={t('common.back')}
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: OnboardingPalette.navy,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Theme.spacing.l,
    paddingTop: 8,
  },
  hero: {
    width: '100%',
    height: 140,
    marginBottom: Theme.spacing.m,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: OnboardingPalette.navy,
    marginBottom: Theme.spacing.m,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: Theme.spacing.l,
    borderWidth: 1,
    borderColor: 'rgba(27,60,83,0.08)',
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
    color: OnboardingPalette.navy,
    marginBottom: Theme.spacing.m,
  },
});
