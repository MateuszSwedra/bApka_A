import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../constants/theme';
import {
  OnboardingPalette,
  OnboardingGradient,
} from '../constants/onboardingTheme';
import { usersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');
const HERO_W = Math.min(SCREEN_W * 0.88, 340);
const HERO_H = Math.min(SCREEN_H * 0.34, 280);

export default function ProfileReadyScreen() {
  const { userRole } = useAuth();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
    if (userRole === 'CARETAKER') {
      router.replace('/(caretaker)');
    } else if (userRole === 'DEPENDENT') {
      router.replace('/senior-type');
    } else {
      router.replace('/role-selection');
    }
  };

  const greetingLine =
    displayName && displayName.length > 0
      ? `Miło nam Cię poznać, ${displayName}!`
      : 'Miło nam Cię poznać!';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, styles.scrollCentered]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.column}>
          <Image
            source={require('../assets/images/profile-ready-hero.png')}
            style={styles.heroImage}
            resizeMode="contain"
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
              <Text style={styles.subtitle}>Twój profil został utworzony.</Text>
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
                <Text style={styles.primaryCtaText}>Kontynuuj</Text>
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
  },
  scrollContent: {
    flexGrow: 1,
    width: '100%',
    paddingHorizontal: 28,
    paddingBottom: 40,
  },
  scrollCentered: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: SCREEN_H - (Platform.OS === 'ios' ? 52 : 36),
    paddingTop: Platform.OS === 'ios' ? 16 : 10,
    paddingBottom: 8,
  },
  column: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    alignItems: 'center',
  },
  heroImage: {
    width: HERO_W,
    height: HERO_H,
    marginBottom: 8,
    alignSelf: 'center',
  },
  textBlock: {
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  loader: {
    marginVertical: 28,
  },
  title: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '800',
    color: OnboardingPalette.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 6,
  },
  subtitle: {
    fontSize: 17,
    lineHeight: 26,
    color: OnboardingPalette.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 12,
    maxWidth: 400,
  },
  ctaShadowWrap: {
    width: '100%',
    maxWidth: 360,
    marginTop: 4,
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
