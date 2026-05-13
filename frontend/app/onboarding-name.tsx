import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Pressable,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../constants/theme';
import {
  OnboardingPalette,
  OnboardingGradient,
} from '../constants/onboardingTheme';
import { usersAPI } from '../services/api';

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}: ${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function OnboardingNameScreen() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      showAlert('Błąd', 'Wpisz co najmniej 2 znaki — np. imię lub zwracane imię.');
      return;
    }
    if (trimmed.length > 80) {
      showAlert('Błąd', 'To pole może mieć co najwyżej 80 znaków.');
      return;
    }

    setLoading(true);
    try {
      await usersAPI.updateDisplayName(trimmed);
      if (Platform.OS === 'web') {
        localStorage.removeItem('needsDisplayName');
      } else {
        await SecureStore.deleteItemAsync('needsDisplayName');
      }
      router.replace('/role-selection');
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : 'Nie udało się zapisać. Sprawdź połączenie.';
      showAlert('Błąd', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, styles.scrollNameCentered]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.nameColumn}>
          <Image
            source={require('../assets/images/onboarding-name-hero.png')}
            style={styles.nameHeroImage}
            contentFit="contain"
            accessibilityIgnoresInvertColors
          />
          <Text style={styles.title}>Jak mamy się do Ciebie zwracać?</Text>
          <Text style={styles.subtitle}>
            To imię lub zwrot zobaczysz Ty oraz osoby połączone z Tobą w aplikacji
            — np. na powitaniu lub przy współdzieleniu opieki.
          </Text>

          <View style={styles.formCard}>
            <View style={styles.field}>
              <MaterialCommunityIcons
                name="account-heart-outline"
                size={22}
                color={OnboardingPalette.primary}
                style={styles.fieldIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Np. Ania, Pani Basia, Tato…"
                value={name}
                onChangeText={setName}
                autoCapitalize="sentences"
                autoCorrect
                maxLength={80}
                placeholderTextColor={OnboardingPalette.textSecondary}
              />
            </View>
          </View>

          <View style={styles.ctaShadowWrap}>
            <Pressable
              onPress={() => void handleContinue()}
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
                <Text style={styles.primaryCtaText}>
                  {loading ? 'Zapisujemy…' : 'Dalej'}
                </Text>
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
  nameHeroImage: {
    width: Math.min(SCREEN_W - 48, 400),
    height: Math.min(SCREEN_H * 0.26, 220),
    alignSelf: 'center',
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
  scroll: {
    flex: 1,
    backgroundColor: OnboardingPalette.background,
  },
  scrollContent: {
    flexGrow: 1,
    width: '100%',
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  scrollNameCentered: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: SCREEN_H,
    paddingTop: Platform.OS === 'ios' ? 20 : 12,
    paddingBottom: 32,
  },
  nameColumn: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    alignItems: 'center',
  },
  title: {
    width: '100%',
    fontSize: 26,
    fontWeight: '800',
    color: OnboardingPalette.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
    textShadowColor: 'rgba(249, 243, 239, 0.9)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  subtitle: {
    width: '100%',
    fontSize: 15,
    lineHeight: 22,
    color: OnboardingPalette.textPrimary,
    textAlign: 'center',
    marginBottom: 28,
    opacity: 0.88,
    textShadowColor: 'rgba(249, 243, 239, 0.95)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  formCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: Theme.borderRadius.large,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: OnboardingPalette.border,
    shadowColor: OnboardingPalette.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: OnboardingPalette.background,
    borderRadius: Theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: OnboardingPalette.border,
    paddingHorizontal: 14,
  },
  fieldIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 17,
    color: OnboardingPalette.textPrimary,
  },
  ctaShadowWrap: {
    width: '100%',
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
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
