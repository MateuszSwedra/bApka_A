import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  useWindowDimensions,
  Animated,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../constants/theme';
import {
  OnboardingPalette,
  OnboardingGradient,
} from '../constants/onboardingTheme';
import { useAuth } from '../context/AuthContext';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { requestPermissionAndSyncPushToken } from '../services/registerPushToken';
import { useTranslation } from 'react-i18next';

type Role = 'CARETAKER' | 'DEPENDENT' | 'HYBRID' | null;

async function resolveRole(hookRole: Role): Promise<Role> {
  if (hookRole) return hookRole;
  if (Platform.OS === 'web') {
    return (localStorage.getItem('userRole') as Role) || null;
  }
  try {
    const s = await SecureStore.getItemAsync('userRole');
    return (s as Role) || null;
  } catch {
    return null;
  }
}

function navigateToMainApp(role: Role) {
  if (role === 'CARETAKER') {
    router.replace('/(caretaker)');
  } else if (role === 'DEPENDENT') {
    router.replace('/enter-pin');
  } else if (role === 'HYBRID') {
    router.replace('/(hybrid)/(tabs)');
  } else {
    router.replace('/role-selection');
  }
}

export default function NotificationScreen() {
  const { t } = useTranslation();
  const { userRole } = useAuth();
  const [busy, setBusy] = useState(false);
  const [exitCover, setExitCover] = useState(false);
  const scaleCover = useRef(new Animated.Value(0)).current;
  const { width: winW, height: winH } = useWindowDimensions();
  const exitGradId = useMemo(
    () => `notifExit_${Math.random().toString(36).slice(2, 11)}`,
    [],
  );
  const insets = useSafeAreaInsets();
  const heroSize = Math.min(winW - 48, 320);
  const scrollMinHeight = Math.max(winH - insets.top - insets.bottom, 320);

  const roleForCopy =
    userRole ??
    (Platform.OS === 'web'
      ? ((localStorage.getItem('userRole') as Role) || null)
      : null);
  const isCaretaker = roleForCopy === 'CARETAKER';

  const finishToApp = async () => {
    const role = await resolveRole(userRole);
    navigateToMainApp(role);
  };

  const playExitCoverThenNavigate = () => {
    setExitCover(true);
    scaleCover.setValue(0.02);
    Animated.sequence([
      Animated.timing(scaleCover, {
        toValue: 1,
        duration: 1250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.delay(320),
    ]).start(() => {
      void finishToApp();
    });
  };

  const handleAllow = async () => {
    setBusy(true);
    try {
      if (Platform.OS !== 'web') {
        await requestPermissionAndSyncPushToken();
      }
    } catch (e) {
      console.warn('Notification permission', e);
    } finally {
      setBusy(false);
      playExitCoverThenNavigate();
    }
  };

  const handleSkip = async () => {
    await finishToApp();
  };

  const isInteractionLocked = busy || exitCover;

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollCentered,
          { minHeight: scrollMinHeight },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.column}>
          <Image
            source={require('../assets/images/notification-permission-hero.png')}
            style={[styles.heroImage, { width: heroSize, height: heroSize }]}
            contentFit="contain"
            accessibilityIgnoresInvertColors
          />

          <Text style={styles.title}>
            {isCaretaker ? t('notification.titleCaretaker') : t('notification.titleDependent')}
          </Text>
          <Text style={styles.subtitle}>
            {isCaretaker ? t('notification.subtitleCaretaker') : t('notification.subtitleDependent')}
          </Text>

          <View style={styles.ctaShadowWrap}>
            <Pressable
              onPress={() => void handleAllow()}
              disabled={isInteractionLocked}
              style={({ pressed }) => [
                styles.ctaPressable,
                pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
                isInteractionLocked && { opacity: 0.65 },
              ]}
            >
              <LinearGradient
                colors={[...OnboardingGradient.colors]}
                start={OnboardingGradient.start}
                end={OnboardingGradient.end}
                style={styles.primaryCta}
              >
                <Text style={styles.primaryCtaText}>
                  {busy ? t('notification.loading') : t('notification.cta')}
                </Text>
                <MaterialCommunityIcons
                  name="bell-ring-outline"
                  size={22}
                  color={OnboardingPalette.surface}
                  style={{ marginLeft: 8 }}
                />
              </LinearGradient>
            </Pressable>
          </View>

          <Pressable
            onPress={() => void handleSkip()}
            disabled={isInteractionLocked}
            style={({ pressed }) => [
              styles.riskLink,
              pressed && { opacity: 0.75 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('notification.skip')}
          >
            <Text style={styles.riskLinkText}>{t('notification.skip')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>

      {exitCover && (
        <View
          style={[styles.exitOverlay, { width: winW, height: winH }]}
          pointerEvents="auto"
        >
          {(() => {
            const squareSize = Math.max(winW, winH) * Math.SQRT2 * 1.14;
            const left = (winW - squareSize) / 2;
            const top = (winH - squareSize) / 2;
            const cx = squareSize / 2;
            const r = squareSize * 0.72;
            return (
              <Animated.View
                style={[
                  styles.exitDiamond,
                  {
                    width: squareSize,
                    height: squareSize,
                    left,
                    top,
                    transform: [{ rotate: '45deg' }, { scale: scaleCover }],
                  },
                ]}
              >
                <Svg width={squareSize} height={squareSize}>
                  <Defs>
                    <RadialGradient
                      id={exitGradId}
                      gradientUnits="userSpaceOnUse"
                      cx={cx}
                      cy={cx}
                      r={r}
                    >
                      <Stop offset="0" stopColor="#8eb4cc" />
                      <Stop offset="0.28" stopColor="#5c86a3" />
                      <Stop offset="0.62" stopColor="#456882" />
                      <Stop offset="1" stopColor="#1B3C53" />
                    </RadialGradient>
                  </Defs>
                  <Rect
                    x={0}
                    y={0}
                    width={squareSize}
                    height={squareSize}
                    fill={`url(#${exitGradId})`}
                  />
                </Svg>
              </Animated.View>
            );
          })()}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: OnboardingPalette.background,
  },
  exitOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
    overflow: 'hidden',
  },
  exitDiamond: {
    position: 'absolute',
    overflow: 'hidden',
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
    maxWidth: 440,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    marginBottom: 24,
    alignSelf: 'center',
    backgroundColor: 'transparent',
  },
  title: {
    width: '100%',
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '800',
    color: OnboardingPalette.textPrimary,
    textAlign: 'center',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  subtitle: {
    width: '100%',
    fontSize: 16,
    lineHeight: 24,
    color: OnboardingPalette.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 6,
  },
  ctaShadowWrap: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
    borderRadius: Theme.borderRadius.round,
    overflow: 'hidden',
    marginBottom: 18,
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
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  riskLink: {
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  riskLinkText: {
    fontSize: 16,
    fontWeight: '600',
    color: OnboardingPalette.primaryDark,
    textDecorationLine: 'underline',
    textDecorationColor: OnboardingPalette.accent,
    textAlign: 'center',
  },
});
