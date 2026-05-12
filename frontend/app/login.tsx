import React, { useState, useEffect, useCallback } from 'react';
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
  Image,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../constants/theme';
import {
  OnboardingPalette,
  OnboardingGradient,
} from '../constants/onboardingTheme';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import * as SecureStore from 'expo-secure-store';

type AuthMode = 'pick' | 'register' | 'signIn';

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}: ${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function LoginScreen() {
  const [mode, setMode] = useState<AuthMode>('pick');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordRepeat, setPasswordRepeat] = useState('');
  const [loading, setLoading] = useState<'idle' | 'login' | 'register'>('idle');
  const { setUserSession, userRole, isReady } = useAuth();
  const isBusy = loading !== 'idle';

  useEffect(() => {
    if (isReady && userRole) {
      if (userRole === 'CARETAKER') {
        router.replace('/(caretaker)');
      } else if (userRole === 'DEPENDENT') {
        router.replace('/(dependent)');
      } else if (userRole === 'HYBRID') {
        router.replace('/(hybrid)');
      } else {
        router.replace('/role-selection');
      }
    }
  }, [isReady, userRole]);

  const goPick = useCallback(() => {
    setMode('pick');
    setPassword('');
    setPasswordRepeat('');
    setLoading('idle');
  }, []);

  const goRegister = useCallback(() => {
    setMode('register');
    setPassword('');
    setPasswordRepeat('');
  }, []);

  const goSignIn = useCallback(() => {
    setMode('signIn');
    setPassword('');
    setPasswordRepeat('');
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      showAlert('Błąd', 'Wpisz e-mail i hasło');
      return;
    }

    setLoading('login');
    try {
      const response = await authAPI.login({
        email: email.trim(),
        password,
      });
      await setUserSession(response.access_token, response.user.role);
    } catch {
      showAlert('Błąd logowania', 'Nieprawidłowy e-mail lub hasło');
    } finally {
      setLoading('idle');
    }
  };

  const handleRegister = async () => {
    const em = email.trim();
    if (!em || !password || !passwordRepeat) {
      showAlert('Błąd', 'Uzupełnij wszystkie pola');
      return;
    }
    if (password !== passwordRepeat) {
      showAlert('Błąd', 'Hasła muszą być takie same');
      return;
    }
    if (password.length < 6) {
      showAlert('Błąd', 'Hasło powinno mieć co najmniej 6 znaków');
      return;
    }

    setLoading('register');
    try {
      const response = await authAPI.register({ email: em, password });
      if (Platform.OS === 'web') {
        localStorage.setItem('userToken', response.access_token);
        localStorage.removeItem('userRole');
        localStorage.setItem('needsDisplayName', 'true');
      } else {
        await SecureStore.setItemAsync('userToken', response.access_token);
        await SecureStore.deleteItemAsync('userRole');
        await SecureStore.setItemAsync('needsDisplayName', 'true');
      }
      router.replace('/onboarding-name');
    } catch {
      showAlert(
        'Błąd rejestracji',
        'Użytkownik już istnieje lub dane są niepoprawne.',
      );
    } finally {
      setLoading('idle');
    }
  };

  const renderField = (
    icon: keyof typeof MaterialCommunityIcons.glyphMap,
    placeholder: string,
    value: string,
    onChangeText: (t: string) => void,
    options?: { secure?: boolean; keyboard?: 'default' | 'email-address' },
  ) => (
    <View style={styles.field}>
      <MaterialCommunityIcons
        name={icon}
        size={22}
        color={OnboardingPalette.primary}
        style={styles.fieldIcon}
      />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={options?.secure}
        keyboardType={options?.keyboard ?? 'default'}
        autoCapitalize="none"
        autoCorrect={false}
        placeholderTextColor={OnboardingPalette.textSecondary}
      />
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {(mode === 'register' || mode === 'signIn') && (
        <View style={styles.formBackdrop} pointerEvents="none">
          <Image
            source={
              mode === 'register'
                ? require('../assets/images/auth-register-hero.png')
                : require('../assets/images/auth-login-hero.png')
            }
            style={styles.formBackdropImage}
            resizeMode="contain"
          />
          <LinearGradient
            colors={[
              'transparent',
              'rgba(249, 243, 239, 0.55)',
              OnboardingPalette.background,
            ]}
            locations={[0, 0.42, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.formBackdropBottomFade}
          />
        </View>
      )}

      {mode !== 'pick' && (
        <Pressable
          onPress={goPick}
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
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          mode === 'pick' && styles.scrollPick,
          (mode === 'register' || mode === 'signIn') && styles.scrollFormCentered,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {mode === 'pick' && (
          <View style={styles.pickColumn}>
            <View style={styles.heroRing}>
              <LinearGradient
                colors={[
                  'rgba(69, 104, 130, 0.24)',
                  'rgba(233, 164, 61, 0.18)',
                  'rgba(27, 60, 83, 0.14)',
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroRingGradient}
              >
                <View style={styles.heroRingInner}>
                  <Image
                    source={require('../assets/images/auth-hero.png')}
                    style={styles.heroPickImage}
                    resizeMode="contain"
                  />
                </View>
              </LinearGradient>
            </View>

            <Text style={styles.brand}>bApka</Text>
            <Text style={styles.titlePick}>Witaj</Text>
            <Text style={styles.subtitlePick}>
              Wybierz, czy zakładasz nowe konto, czy wracasz do aplikacji.
            </Text>

            <View style={styles.pickActions}>
              <View style={styles.ctaShadowWrap}>
                <Pressable
                  onPress={goRegister}
                  style={({ pressed }) => [
                    styles.ctaPressable,
                    pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
                  ]}
                >
                  <LinearGradient
                    colors={[...OnboardingGradient.colors]}
                    start={OnboardingGradient.start}
                    end={OnboardingGradient.end}
                    style={styles.primaryCta}
                  >
                    <Text style={styles.primaryCtaText}>Załóż konto</Text>
                    <MaterialCommunityIcons
                      name="account-plus-outline"
                      size={22}
                      color={OnboardingPalette.surface}
                      style={{ marginLeft: 8 }}
                    />
                  </LinearGradient>
                </Pressable>
              </View>

              <Pressable
                onPress={goSignIn}
                style={({ pressed }) => [
                  styles.outlineCta,
                  pressed && { opacity: 0.88 },
                ]}
              >
                <Text style={styles.outlineCtaText}>Zaloguj się</Text>
              </Pressable>
            </View>
          </View>
        )}

        {mode === 'register' && (
          <>
            <View style={styles.formInlineHeroCard}>
              <Image
                source={require('../assets/images/auth-register-hero.png')}
                style={styles.formInlineHero}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.formTitle}>Rejestracja</Text>
            <Text style={styles.formHint}>
              Podaj e-mail i hasło. Na kolejnym kroku wybierzesz rolę w aplikacji.
            </Text>

            <View style={styles.formCard}>
              {renderField('email-outline', 'E-mail', email, setEmail, {
                keyboard: 'email-address',
              })}
              {renderField('lock-outline', 'Hasło', password, setPassword, {
                secure: true,
              })}
              {renderField(
                'lock-check-outline',
                'Powtórz hasło',
                passwordRepeat,
                setPasswordRepeat,
                { secure: true },
              )}
            </View>

            <View style={styles.ctaShadowWrap}>
              <Pressable
                onPress={() => void handleRegister()}
                disabled={isBusy}
                style={({ pressed }) => [
                  styles.ctaPressable,
                  pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
                  isBusy && { opacity: 0.65 },
                ]}
              >
                <LinearGradient
                  colors={[...OnboardingGradient.colors]}
                  start={OnboardingGradient.start}
                  end={OnboardingGradient.end}
                  style={styles.primaryCta}
                >
                  <Text style={styles.primaryCtaText}>
                    {loading === 'register' ? 'Chwileczkę…' : 'Utwórz konto'}
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>

            <Pressable onPress={goSignIn} style={styles.switchModeLink}>
              <Text style={styles.switchModeText}>
                Masz już konto?{' '}
                <Text style={styles.switchModeBold}>Zaloguj się</Text>
              </Text>
            </Pressable>
          </>
        )}

        {mode === 'signIn' && (
          <>
            <View style={styles.formInlineHeroCard}>
              <Image
                source={require('../assets/images/auth-login-hero.png')}
                style={styles.formInlineHero}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.formTitle}>Logowanie</Text>
            <Text style={styles.formHint}>
              Wpisz dane użyte przy rejestracji.
            </Text>

            <View style={styles.formCard}>
              {renderField('email-outline', 'E-mail', email, setEmail, {
                keyboard: 'email-address',
              })}
              {renderField('lock-outline', 'Hasło', password, setPassword, {
                secure: true,
              })}
            </View>

            <View style={styles.ctaShadowWrap}>
              <Pressable
                onPress={() => void handleLogin()}
                disabled={isBusy}
                style={({ pressed }) => [
                  styles.ctaPressable,
                  pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
                  isBusy && { opacity: 0.65 },
                ]}
              >
                <LinearGradient
                  colors={[...OnboardingGradient.colors]}
                  start={OnboardingGradient.start}
                  end={OnboardingGradient.end}
                  style={styles.primaryCta}
                >
                  <Text style={styles.primaryCtaText}>
                    {loading === 'login' ? 'Logowanie…' : 'Zaloguj się'}
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>

            <Pressable onPress={goRegister} style={styles.switchModeLink}>
              <Text style={styles.switchModeText}>
                Nie masz konta?{' '}
                <Text style={styles.switchModeBold}>Załóż konto</Text>
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: OnboardingPalette.background,
  },
  formBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    overflow: 'hidden',
  },
  formBackdropImage: {
    position: 'absolute',
    top: SCREEN_H * 0.02,
    width: SCREEN_W * 1.35,
    height: SCREEN_H * 0.58,
    left: (SCREEN_W - SCREEN_W * 1.35) / 2,
    opacity: 1,
  },
  formBackdropBottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SCREEN_H * 0.55,
  },
  formInlineHeroCard: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderRadius: Theme.borderRadius.large,
    borderWidth: 1,
    borderColor: OnboardingPalette.border,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 10,
    shadowColor: OnboardingPalette.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  formInlineHero: {
    width: 240,
    height: 150,
    alignSelf: 'center',
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
    zIndex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  scrollPick: {
    justifyContent: 'center',
    minHeight: SCREEN_H - (Platform.OS === 'ios' ? 100 : 72),
    paddingTop: 8,
    paddingBottom: 24,
  },
  scrollFormCentered: {
    paddingTop: 92,
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: SCREEN_H - (Platform.OS === 'ios' ? 56 : 40),
    paddingBottom: 48,
  },
  pickColumn: {
    width: '100%',
    alignItems: 'center',
  },
  heroRing: {
    width: 244,
    height: 244,
    borderRadius: 122,
    overflow: 'hidden',
    alignSelf: 'center',
    marginBottom: 22,
    shadowColor: OnboardingPalette.primaryDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 6,
  },
  heroRingGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 122,
    padding: 12,
  },
  heroRingInner: {
    flex: 1,
    borderRadius: 110,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(210, 193, 182, 0.55)',
  },
  heroPickImage: {
    width: 198,
    height: 198,
  },
  pickActions: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    marginTop: 8,
  },
  brand: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 3,
    color: OnboardingPalette.primary,
    marginBottom: 6,
  },
  titlePick: {
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '800',
    color: OnboardingPalette.textPrimary,
    letterSpacing: 0.2,
    marginBottom: 10,
  },
  subtitlePick: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    color: OnboardingPalette.textSecondary,
    marginBottom: 28,
    paddingHorizontal: 12,
    maxWidth: 360,
  },
  formTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: OnboardingPalette.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(249, 243, 239, 0.9)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  formHint: {
    fontSize: 14,
    lineHeight: 20,
    color: OnboardingPalette.textPrimary,
    textAlign: 'center',
    marginBottom: 22,
    paddingHorizontal: 8,
    opacity: 0.85,
    textShadowColor: 'rgba(249, 243, 239, 0.95)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: Theme.borderRadius.large,
    padding: 18,
    marginBottom: 20,
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
    marginBottom: 12,
  },
  fieldIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    color: OnboardingPalette.textPrimary,
  },
  ctaShadowWrap: {
    borderRadius: Theme.borderRadius.round,
    overflow: 'hidden',
    marginBottom: 16,
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
  outlineCta: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: Theme.borderRadius.round,
    borderWidth: 2,
    borderColor: OnboardingPalette.primaryDark,
    backgroundColor: 'transparent',
    marginTop: 14,
  },
  outlineCtaText: {
    fontSize: 17,
    fontWeight: '700',
    color: OnboardingPalette.primaryDark,
  },
  switchModeLink: {
    alignSelf: 'center',
    paddingVertical: 10,
  },
  switchModeText: {
    fontSize: 15,
    color: OnboardingPalette.textSecondary,
    textAlign: 'center',
  },
  switchModeBold: {
    fontWeight: '800',
    color: OnboardingPalette.primaryDark,
    textDecorationLine: 'underline',
    textDecorationColor: OnboardingPalette.accent,
  },
});
