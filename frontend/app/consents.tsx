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

/** Placeholdery — podmień na docelowe URL-e produkcyjne. */
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

  const primaryLabel = granular ? 'Zapisz i kontynuuj' : 'Akceptuję wszystko';

  return (
    <View style={styles.screen}>
      <Pressable
        onPress={handleBack}
        style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.85 }]}
        accessibilityRole="button"
        accessibilityLabel="Wróć"
      >
        <MaterialCommunityIcons
          name="chevron-left"
          size={28}
          color={OnboardingPalette.surface}
        />
      </Pressable>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Image
          source={require('../assets/images/consent-hero.png')}
          style={styles.hero}
          resizeMode="contain"
        />

        <Text style={styles.title}>Twój komfort jest najważniejszy</Text>

        <Text style={styles.sectionTitle}>Zapewnienie prywatności</Text>
        <Text style={styles.body}>
          Aby zapewnić pełną funkcjonalność aplikacji, potrzebujemy Twojej zgody na
          odpowiedzialne przetwarzanie danych osobowych oraz informacji o zdrowiu,
          które nam powierzasz.
        </Text>

        <Text style={styles.sectionTitle}>
          Ulepszanie doświadczenia dla Ciebie i innych
        </Text>
        <Text style={styles.body}>
          Korzystamy z narzędzi analitycznych, które pomagają nam poznawać popularne
          funkcje, ulepszać aplikację i promować ją wśród innych użytkowników na
          podstawie Twojego korzystania z niej — zgodnie z opisem w{' '}
          <Text
            style={styles.link}
            onPress={() => openUrl(PRIVACY_URL)}
            accessibilityRole="link"
          >
            Polityce prywatności bApka
          </Text>
          . Możemy też wyświetlać treści sponsorowane dopasowane do Twoich preferencji.
        </Text>

        <Text style={styles.body}>
          Korzystając z przycisków na dole ekranu akceptujesz{' '}
          <Text
            style={styles.link}
            onPress={() => openUrl(TERMS_URL)}
            accessibilityRole="link"
          >
            Warunki korzystania z serwisu bApka
          </Text>{' '}
          oraz potwierdzasz zapoznanie się z{' '}
          <Text
            style={styles.link}
            onPress={() => openUrl(PRIVACY_URL)}
            accessibilityRole="link"
          >
            Polityką prywatności bApka
          </Text>
          . Szczegółowe ustawienia zgód możesz zmienić po wybraniu „Przejdź do
          ustawień”.
        </Text>

        {granular && (
          <View style={styles.granularCard}>
            <Text style={styles.granularHeading}>Wybór zgód</Text>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>
                Analityka i ulepszanie aplikacji (anonimowe statystyki)
              </Text>
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
              <Text style={styles.switchLabel}>
                Spersonalizowane treści i rekomendacje
              </Text>
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
              <Text style={styles.backLinkText}>Wróć do widoku uproszczonego</Text>
            </Pressable>
          </View>
        )}

        <Text style={styles.withdrawNote}>
          Zgodę mogę wycofać w każdej chwili w ustawieniach aplikacji bApka.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
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
            <Text style={styles.secondaryBtnText}>Przejdź do ustawień</Text>
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
    paddingBottom: 160,
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
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
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
