import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Platform,
  Linking,
  Switch,
} from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../constants/theme';
import {
  OnboardingPalette,
  OnboardingGradient,
} from '../constants/onboardingTheme';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getScreenBottomPadding } from '../utils/safeAreaInsets';

/** Placeholdery - podmień na docelowe URL-e produkcyjne. */
const TERMS_URL = 'https://bapka.app/warunki-korzystania';
const PRIVACY_URL = 'https://bapka.app/polityka-prywatnosci';

async function persistConsentFlags(
  allAccepted: boolean,
  analytics: boolean,
  tailored: boolean,
) {
  const payload = JSON.stringify({
    allAccepted,
    analytics,
    tailoredContent: tailored,
    at: new Date().toISOString(),
  });
  if (Platform.OS === 'web') {
    localStorage.setItem('consentPrefs', payload);
  } else {
    await SecureStore.setItemAsync('consentPrefs', payload);
  }
}

async function markConsentsSeen() {
  if (Platform.OS === 'web') {
    localStorage.setItem('hasSeenConsents', 'true');
  } else {
    await SecureStore.setItemAsync('hasSeenConsents', 'true');
  }
}

export default function ConsentsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const footerBottomPadding = getScreenBottomPadding(insets.bottom, Theme.spacing.m);
  const scrollBottomPadding = footerBottomPadding + 120;
  const [granular, setGranular] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [tailored, setTailored] = useState(true);

  const openUrl = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  const handleBack = () => {
    router.replace('/welcome');
  };

  const handleAccept = async () => {
    try {
      if (!granular) {
        await persistConsentFlags(true, true, true);
      } else {
        await persistConsentFlags(false, analytics, tailored);
      }
      await markConsentsSeen();
      router.replace('/login');
    } catch {
      await markConsentsSeen();
      router.replace('/login');
    }
  };

  const primaryLabel = granular ? t('consents.ctaSave') : t('consents.ctaAcceptAll');

  return (
    <View style={styles.screen}>
      <Pressable
        onPress={handleBack}
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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <Image
          source={require('../assets/images/consent-hero.png')}
          style={styles.hero}
          resizeMode="contain"
        />

        <Text style={styles.title}>{t('consents.title')}</Text>

        <Text style={styles.sectionTitle}>{t('consents.privacy.title')}</Text>
        <Text style={styles.body}>{t('consents.privacy.body')}</Text>

        <Text style={styles.sectionTitle}>{t('consents.analytics.title')}</Text>
        <Text style={styles.body}>{t('consents.analytics.body')}</Text>

        <Text style={styles.body}>
          {t('consents.legal.body')}{' '}
          <Text
            style={styles.link}
            onPress={() => openUrl(TERMS_URL)}
            accessibilityRole="link"
          >
            {t('consents.linkTerms')}
          </Text>
          .{' '}
          <Text
            style={styles.link}
            onPress={() => openUrl(PRIVACY_URL)}
            accessibilityRole="link"
          >
            {t('consents.linkPrivacy')}
          </Text>
        </Text>

        {granular && (
          <View style={styles.granularCard}>
            <Text style={styles.granularHeading}>{t('consents.granular.title')}</Text>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>{t('consents.granular.analytics')}</Text>
              <Switch
                value={analytics}
                onValueChange={setAnalytics}
                trackColor={{
                  false: OnboardingPalette.surfaceMuted,
                  true: OnboardingPalette.primary + '99',
                }}
                thumbColor={OnboardingPalette.surface}
              />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>{t('consents.granular.tailored')}</Text>
              <Switch
                value={tailored}
                onValueChange={setTailored}
                trackColor={{
                  false: OnboardingPalette.surfaceMuted,
                  true: OnboardingPalette.primary + '99',
                }}
                thumbColor={OnboardingPalette.surface}
              />
            </View>
            <Pressable onPress={() => setGranular(false)} style={styles.backLink}>
              <Text style={styles.backLinkText}>{t('consents.granular.backSimple')}</Text>
            </Pressable>
          </View>
        )}

        <Text style={styles.withdrawNote}>{t('consents.withdrawNote')}</Text>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: footerBottomPadding }]}>
        <Pressable
          onPress={() => void handleAccept()}
          style={({ pressed }) => [
            styles.ctaShadowWrap,
            pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
          ]}
        >
          <LinearGradient
            colors={[...OnboardingGradient.colors]}
            start={OnboardingGradient.start}
            end={OnboardingGradient.end}
            style={styles.ctaPrimary}
          >
            <Text style={styles.ctaPrimaryText}>{primaryLabel}</Text>
          </LinearGradient>
        </Pressable>

        {!granular && (
          <Pressable
            onPress={() => setGranular(true)}
            style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.75 }]}
          >
            <Text style={styles.secondaryBtnText}>{t('consents.ctaSettings')}</Text>
          </Pressable>
        )}
      </View>
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
    height: 160,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: OnboardingPalette.textPrimary,
    textAlign: 'center',
    marginBottom: 28,
    letterSpacing: 0.2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: OnboardingPalette.textPrimary,
    marginBottom: 10,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: OnboardingPalette.textSecondary,
    marginBottom: 22,
  },
  link: {
    color: OnboardingPalette.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  granularCard: {
    backgroundColor: OnboardingPalette.surface,
    borderRadius: Theme.borderRadius.large,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: OnboardingPalette.border,
  },
  granularHeading: {
    fontSize: 17,
    fontWeight: '800',
    color: OnboardingPalette.textPrimary,
    marginBottom: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  switchLabel: {
    flex: 1,
    fontSize: 15,
    color: OnboardingPalette.textPrimary,
    lineHeight: 22,
  },
  backLink: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  backLinkText: {
    fontSize: 15,
    fontWeight: '600',
    color: OnboardingPalette.primary,
  },
  withdrawNote: {
    fontSize: 13,
    lineHeight: 20,
    color: OnboardingPalette.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: OnboardingPalette.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: OnboardingPalette.border,
  },
  ctaShadowWrap: {
    borderRadius: Theme.borderRadius.round,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: OnboardingPalette.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 5,
  },
  ctaPrimary: {
    borderRadius: Theme.borderRadius.round,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPrimaryText: {
    color: OnboardingPalette.surface,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: OnboardingPalette.primaryDark,
  },
});
