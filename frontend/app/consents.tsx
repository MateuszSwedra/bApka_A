import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Platform,
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

export type LegalLocale = 'pl' | 'en';
export type LegalDocKind = 'terms' | 'privacy';

export const LEGAL_DOCS: Record<LegalLocale, Record<LegalDocKind, { title: string; body: string }>> = {
  pl: {
    terms: {
      title: 'Regulamin korzystania',
      body: `Data wejścia w życie: 16.06.2026

1. Postanowienia ogólne
Niniejszy dokument określa zasady korzystania z aplikacji medycznej bApka. Rozpoczynając korzystanie z bApki, akceptujesz niniejszy Regulamin oraz naszą Politykę Prywatności. Jeśli nie zgadzasz się z ich postanowieniami, prosimy o niekorzystanie z aplikacji.

2. Ważne zastrzeżenie medyczne
Aplikacja bApka ma charakter wspomagający, informacyjny i analityczny. bApka nie jest urządzeniem medycznym sensu stricto, a zawarte w niej funkcje nie zastępują profesjonalnej porady lekarskiej, diagnozy ani leczenia. W przypadku jakichkolwiek problemów zdrowotnych lub pytań dotyczących stanu zdrowia, użytkownik powinien zawsze skonsultować się z wykwalifikowanym pracownikiem ochrony zdrowia.

3. Zasady korzystania z aplikacji
Użytkownik zobowiązuje się do korzystania z aplikacji zgodnie z jej przeznaczeniem, obowiązującym prawem oraz niniejszym Regulaminem.
Zabronione jest wprowadzanie do aplikacji treści o charakterze bezprawnym, a także podejmowanie działań mogących zakłócić jej funkcjonowanie.
Użytkownik ponosi odpowiedzialność za zachowanie poufności swoich danych logowania.

4. Dostępność i aktualizacje
Dokładamy wszelkich starań, aby aplikacja działała bez przerw, jednak ze względów technicznych nie możemy zagwarantować jej 100% niezawodności. Zastrzegamy sobie prawo do wprowadzania aktualizacji, zmian funkcji oraz czasowego zawieszenia działania bApki w celach konserwacyjnych.

5. Ograniczenie odpowiedzialności
Twórcy aplikacji bApka nie ponoszą odpowiedzialności za decyzje zdrowotne podejmowane przez użytkownika wyłącznie na podstawie danych wprowadzonych do aplikacji lub z niej uzyskanych.

6. Użytkownicy międzynarodowi
Aplikacja jest dystrybuowana globalnie (m.in. za pośrednictwem platformy Google Play). Niezależnie od miejsca zamieszkania użytkownika, w kwestiach nieuregulowanych niniejszym regulaminem zastosowanie mają przepisy prawa, z zastrzeżeniem bezwzględnie obowiązujących praw konsumenta w kraju zamieszkania użytkownika.

7. Kontakt
Wszelkie pytania, uwagi lub reklamacje dotyczące działania bApki prosimy kierować na adres: danpas@st.amu.edu.pl.`,
    },
    privacy: {
      title: 'Polityka prywatności',
      body: `Data wejścia w życie: 16.06.2026

Ochrona Twojej prywatności jest dla nas priorytetem. Chronimy Twoje dane i wykorzystujemy je wyłącznie w celu zapewnienia prawidłowego działania aplikacji bApka oraz w przypadkach wymaganych przez prawo.

Administratorem Twoich danych osobowych jest Daniel Pasternak, Dominika Wabich, Mateusz Swędra, Aleksandra Nowak, kontakt: danpas@st.amu.edu.pl

1. Jakie dane zbieramy i dlaczego?
Z uwagi na to, że bApka jest aplikacją medyczną, podchodzimy do Twoich danych ze szczególną ostrożnością:
- Dane medyczne i wrażliwe: zbieramy informacje dotyczące zdrowia wyłącznie na podstawie wyraźnej zgody (art. 9 ust. 2 lit. a RODO).
- Dane konta i profilu: np. e-mail, nazwa użytkownika do uwierzytelniania i obsługi konta.
- Anonimowe statystyki użycia: np. raporty błędów i statystyki kliknięć, aby poprawiać stabilność.

2. Jak chronimy Twoje dane?
Wszystkie dane, w tym informacje medyczne, są przesyłane i przechowywane z użyciem metod szyfrowania. Nie sprzedajemy danych osobowych ani medycznych podmiotom trzecim.

3. Gdzie przechowujemy dane?
Ponieważ aplikacja jest dostępna globalnie (m.in. przez Google Play), dane mogą być przetwarzane na serwerach w EOG lub poza nim. Transfery międzynarodowe odbywają się zgodnie z odpowiednimi klauzulami umownymi i wysokimi standardami bezpieczeństwa.`,
    },
  },
  en: {
    terms: {
      title: 'Terms of Service',
      body: `Effective Date: June 16, 2026

1. General Provisions
This document defines the rules for using the bApka medical application.
By starting to use bApka, you accept these Terms of Service and our Privacy Policy.
If you do not agree with their provisions, please do not use the application.

2. Important Medical Disclaimer
The bApka application has a supporting, informational, and analytical character.
bApka is not a medical device sensu stricto, and the features it contains do not replace professional medical advice, diagnosis, or treatment.
In case of any health problems or questions regarding your health, the user should always consult a qualified healthcare professional.

3. Rules for Using the Application
The user undertakes to use the application in accordance with its intended purpose, applicable law, and these Terms of Service.
It is forbidden to enter illegal content into the application, as well as to take actions that could disrupt its functioning.
The user is responsible for maintaining the confidentiality of their login details.

4. Availability and Updates
We make every effort to ensure the application works without interruption; however, for technical reasons, we cannot guarantee its 100% reliability.
We reserve the right to introduce updates, change features, and temporarily suspend the operation of bApka for maintenance purposes.

5. Limitation of Liability
The creators of the bApka application are not responsible for health decisions made by the user solely on the basis of data entered into or obtained from the application.

6. International Users
The application is distributed globally (including via Google Play).
Regardless of the user's place of residence, in matters not covered by these terms, the provisions of law apply, subject to mandatory consumer rights in the user's country of residence.

7. Contact
All questions, comments, or complaints regarding the operation of bApka should be directed to: danpas@st.amu.edu.pl.`,
    },
    privacy: {
      title: 'Privacy Policy',
      body: `Effective Date: June 16, 2026

Protecting your privacy is our priority. We protect your data and use it only to ensure proper operation of the bApka app and in cases required by law.
The administrators of your personal data are Daniel Pasternak, Dominika Wabich, Mateusz Swędra, and Aleksandra Nowak; contact: danpas@st.amu.edu.pl.

1. What data do we collect and why?
Because bApka is a medical application, we treat your data with special care:
- Medical and sensitive data: collected only with your explicit consent (Art. 9 sec. 2 lit. a GDPR).
- Account and profile data: e.g., email and username for authentication and account management.
- Anonymous usage statistics: e.g., crash reports and click statistics to improve app quality.

2. How do we protect your data?
All data, including sensitive medical information, is transmitted and stored using advanced encryption methods. We do not sell your personal or medical data to third parties.

3. Where do we store data?
Since the application is available internationally (including via Google Play), your data may be processed on servers within the EEA or outside of it. International transfers are carried out with appropriate contractual safeguards and high security standards.`,
    },
  },
};

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

  const handleBack = () => {
    router.replace('/welcome');
  };

  const canContinue = !granular || (analytics && tailored);

  const handleAccept = async () => {
    if (!canContinue) return;
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
            onPress={() => router.push('/legal-terms')}
            accessibilityRole="link"
          >
            {t('consents.linkTerms')}
          </Text>
          .{' '}
          <Text
            style={styles.link}
            onPress={() => router.push('/legal-privacy')}
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
          disabled={!canContinue}
          style={({ pressed }) => [
            styles.ctaShadowWrap,
            !canContinue && styles.ctaShadowWrapDisabled,
            pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
          ]}
        >
          {canContinue ? (
            <LinearGradient
              colors={[...OnboardingGradient.colors]}
              start={OnboardingGradient.start}
              end={OnboardingGradient.end}
              style={styles.ctaPrimary}
            >
              <Text style={styles.ctaPrimaryText}>{primaryLabel}</Text>
            </LinearGradient>
          ) : (
            <View style={[styles.ctaPrimary, styles.ctaPrimaryDisabled]}>
              <Text style={styles.ctaPrimaryText}>{primaryLabel}</Text>
            </View>
          )}
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
  legalCard: {
    backgroundColor: OnboardingPalette.surface,
    borderRadius: Theme.borderRadius.large,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: OnboardingPalette.border,
  },
  legalTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  legalTabBtn: {
    flex: 1,
    borderRadius: Theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: OnboardingPalette.border,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: OnboardingPalette.background,
    alignItems: 'center',
  },
  legalTabBtnActive: {
    backgroundColor: OnboardingPalette.primary + '1F',
    borderColor: OnboardingPalette.primary,
  },
  legalTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: OnboardingPalette.textSecondary,
    textAlign: 'center',
  },
  legalTabTextActive: {
    color: OnboardingPalette.primaryDark,
  },
  legalDocText: {
    fontSize: 14,
    lineHeight: 21,
    color: OnboardingPalette.textPrimary,
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
  consentError: {
    marginTop: 6,
    color: '#8A6B00',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
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
  ctaShadowWrapDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaPrimary: {
    borderRadius: Theme.borderRadius.round,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPrimaryDisabled: {
    backgroundColor: '#B8BEC7',
  },
  secondaryBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 8,
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: OnboardingPalette.primaryDark,
  },
  ctaPrimaryText: {
    color: OnboardingPalette.surface,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
