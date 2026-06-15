import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../constants/theme';
import {
  OnboardingPalette,
  OnboardingGradient,
} from '../constants/onboardingTheme';
import { usersAPI } from '../services/api';
import { useTranslation } from 'react-i18next';
import { useScreenBottomPadding } from '../utils/safeAreaInsets';

export default function ProfileReadyScreen() {
  const { t } = useTranslation();
  const { width: winW, height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollMinHeight = Math.max(winH - insets.top - insets.bottom, 320);
  const heroW = Math.min(winW * 0.88, 340);
  const heroH = Math.min(winH * 0.32, 280);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const bottomPadding = useScreenBottomPadding(Theme.spacing.l);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = (await usersAPI.getMe()) as { name?: string | null };
        if (!cancelled) {
          setDisplayName(me?.name?.trim() || null);
        }
      } catch {
        if (!cancelled) setDisplayName(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleContinue = () => {
    router.replace('/notification');
  };

  const greetingLine =
    displayName && displayName.length > 0
      ? t('profileReady.greeting', { name: displayName })
      : t('profileReady.greetingGeneric');

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollCentered,
          { minHeight: scrollMinHeight, paddingBottom: bottomPadding },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.column}>
          <Image
            source={require('../assets/images/profile-ready-hero.png')}
            style={[styles.heroImage, { width: heroW, height: heroH }]}
            contentFit="contain"
            accessibilityIgnoresInvertColors
          />

          {loading ? (
            <ActivityIndicator
              size="large"
              color={OnboardingPalette.primary}
              style={styles.loader}
            />
          ) : (
            <View style={styles.textBlock}>
              <Text style={styles.title}>{greetingLine}</Text>
              <Text style={styles.subtitle}>{t('profileReady.subtitle')}</Text>
            </View>
          )}

          <View style={styles.ctaShadowWrap}>
            <Pressable
              onPress={handleContinue}
              disabled={loading}
              style={({ pressed }) => [
                styles.ctaPressable,
                pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
                loading && { opacity: 0.65 },
              ]}
            >
              <LinearGradient
                colors={[...OnboardingGradient.colors]}
                start={OnboardingGradient.start}
                end={OnboardingGradient.end}
                style={styles.primaryCta}
              >
                <Text style={styles.primaryCtaText}>{t('profileReady.cta')}</Text>
                <MaterialCommunityIcons
                  name="arrow-right"
                  size={22}
                  color={OnboardingPalette.surface}
                  style={{ marginLeft: 8 }}
                />
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: OnboardingPalette.background,
  },
  scroll: {
    flex: 1,
    backgroundColor: OnboardingPalette.background,
  },
  scrollCentered: {
    flexGrow: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 28,
    paddingVertical: 24,
  },
  column: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    marginBottom: 16,
    alignSelf: 'center',
    backgroundColor: 'transparent',
  },
  textBlock: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 8,
    minHeight: 120,
    justifyContent: 'center',
  },
  loader: {
    marginVertical: 28,
  },
  title: {
    width: '100%',
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '800',
    color: OnboardingPalette.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 6,
  },
  subtitle: {
    width: '100%',
    fontSize: 17,
    lineHeight: 26,
    color: OnboardingPalette.textSecondary,
    textAlign: 'center',
    marginBottom: 28,
    paddingHorizontal: 12,
    maxWidth: 400,
  },
  ctaShadowWrap: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
    marginTop: 8,
    borderRadius: Theme.borderRadius.round,
    overflow: 'hidden',
    shadowColor: OnboardingPalette.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 5,
  },
  ctaPressable: {
    borderRadius: Theme.borderRadius.round,
    overflow: 'hidden',
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 17,
    paddingHorizontal: 28,
    borderRadius: Theme.borderRadius.round,
  },
  primaryCtaText: {
    color: OnboardingPalette.surface,
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
