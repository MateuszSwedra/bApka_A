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
import { Image as ExpoImage } from 'expo-image';
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
import { useTranslation } from 'react-i18next';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton';

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
  const { t } = useTranslation();
  const [mode, setMode] = useState<AuthMode>('pick');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordRepeat, setPasswordRepeat] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordRepeat, setShowPasswordRepeat] = useState(false);
  const [loading, setLoading] = useState<'idle' | 'login' | 'register'>('idle');
  const { setUserSession, userRole, isReady } = useAuth();
  const isBusy = loading !== 'idle';

  useEffect(() => {
    if (!isReady || !userRole) return;
    let cancelled = false;
    const go = async () => {
      let token: string | null = null;
      try {
        if (Platform.OS === 'web') {
          token = localStorage.getItem('userToken');
        } else {
          token = await SecureStore.getItemAsync('userToken');
        }
      } catch {
        token = null;
      }
      if (cancelled || !token) return;
      if (userRole === 'CARETAKER') {
        router.replace('/(caretaker)');
      } else if (userRole === 'DEPENDENT') {
        router.replace('/(dependent)');
      } else if (userRole === 'HYBRID') {
        router.replace('/(hybrid)/(tabs)');
      } else {
        router.replace('/role-selection');
      }
    };
    void go();
    return () => {
      cancelled = true;
    };
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

  const markNeedsDisplayName = async () => {
    if (Platform.OS === 'web') {
      localStorage.setItem('needsDisplayName', 'true');
    } else {
      await SecureStore.setItemAsync('needsDisplayName', 'true');
    }
  };

  const handleGoogleIdToken = useCallback(
    async (idToken: string) => {
      setLoading('login');
      try {
        const response = await authAPI.loginGoogle(idToken);
        if (!response.user?.name?.trim()) {
          await markNeedsDisplayName();
        }
        await setUserSession(response.access_token, response.user.role);
        if (!response.user?.name?.trim()) {
          router.replace('/onboarding-name');
          return;
        }
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : t('auth.google.errorFallback');
        showAlert(t('auth.errorLoginTitle'), msg);
      } finally {
        setLoading('idle');
      }
    },
    [setUserSession, t],
  );

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      showAlert(t('common.error'), t('auth.validationEmailPassword'));
      return;
    }

    setLoading('login');
    try {
      const response = await authAPI.login({
        email: email.trim(),
        password,
      });
      await setUserSession(response.access_token, response.user.role);
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : t('auth.errorLoginFallback');
      showAlert(t('auth.errorLoginTitle'), msg);
    } finally {
      setLoading('idle');
    }
  };

  const handleRegister = async () => {
    const em = email.trim();
    if (!em || !password || !passwordRepeat) {
      showAlert(t('common.error'), t('auth.validationAllFields'));
      return;
    }
    if (password !== passwordRepeat) {
      showAlert(t('common.error'), t('auth.validationPasswordMatch'));
      return;
    }
    if (password.length < 6) {
      showAlert(t('common.error'), t('auth.validationPasswordLength'));
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
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : t('auth.errorRegisterFallback');
      showAlert(t('auth.errorRegisterTitle'), msg);
    } finally {
      setLoading('idle');
    }
  };

  const renderField = (
    icon: keyof typeof MaterialCommunityIcons.glyphMap,
    placeholder: string,
    value: string,
    onChangeText: (t: string) => void,
    options?: {
      secure?: boolean;
      keyboard?: 'default' | 'email-address';
      visible?: boolean;
      onToggleVisible?: () => void;
    },
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
        secureTextEntry={options?.secure && !options?.visible}
        keyboardType={options?.keyboard ?? 'default'}
        autoCapitalize="none"
        autoCorrect={false}
        placeholderTextColor={OnboardingPalette.textSecondary}
      />
      {options?.secure && options.onToggleVisible ? (
        <Pressable
          onPress={options.onToggleVisible}
          style={styles.passwordToggle}
          accessibilityRole="button"
          accessibilityLabel={
            options.visible ? t('auth.a11yHidePassword') : t('auth.a11yShowPassword')
          }
        >
          <MaterialCommunityIcons
            name={options.visible ? 'eye-off-outline' : 'eye-outline'}
            size={22}
            color={OnboardingPalette.textSecondary}
          />
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {mode === 'register' && (
        <View style={styles.registerBackdrop} pointerEvents="none">
          <ExpoImage
            source={require('../assets/images/auth-register-hero.png')}
            style={styles.registerBackdropImage}
            contentFit="contain"
          />
          <LinearGradient
            colors={[
              OnboardingPalette.background,
              'rgba(249, 243, 239, 0.82)',
              'rgba(249, 243, 239, 0.35)',
              'rgba(249, 243, 239, 0)',
            ]}
            locations={[0, 0.28, 0.52, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.registerBackdropGradient}
          />
        </View>
      )}

      {mode !== 'pick' && (
        <Pressable
          onPress={goPick}
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
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          mode === 'pick' && styles.scrollPick,
          mode === 'register' && styles.scrollRegister,
          mode === 'signIn' && styles.scrollFormCentered,
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

            <Text style={styles.brand}>{t('brand.name')}</Text>
            <Text style={styles.titlePick}>{t('auth.pick.title')}</Text>
            <Text style={styles.subtitlePick}>{t('auth.pick.subtitle')}</Text>

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
                    <Text style={styles.primaryCtaText}>{t('auth.pick.register')}</Text>
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
                <Text style={styles.outlineCtaText}>{t('auth.pick.signIn')}</Text>
              </Pressable>

              <GoogleSignInButton
                onIdToken={handleGoogleIdToken}
                disabled={isBusy}
                loading={loading === 'login'}
              />
            </View>
          </View>
        )}

        {mode === 'register' && (
          <View style={styles.formColumn}>
            <Text style={styles.formTitle}>{t('auth.register.title')}</Text>
            <Text style={styles.formHint}>{t('auth.register.hint')}</Text>

            <View style={styles.formCard}>
              {renderField('email-outline', t('auth.fieldEmail'), email, setEmail, {
                keyboard: 'email-address',
              })}
              {renderField('lock-outline', t('auth.fieldPassword'), password, setPassword, {
                secure: true,
                visible: showPassword,
                onToggleVisible: () => setShowPassword(v => !v),
              })}
              {renderField(
                'lock-check-outline',
                t('auth.fieldPasswordRepeat'),
                passwordRepeat,
                setPasswordRepeat,
                {
                  secure: true,
                  visible: showPasswordRepeat,
                  onToggleVisible: () => setShowPasswordRepeat(v => !v),
                },
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
                    {loading === 'register' ? t('auth.loadingRegister') : t('auth.ctaRegister')}
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>

            <Pressable onPress={goSignIn} style={styles.switchModeLink}>
              <Text style={styles.switchModeText}>
                {t('auth.hasAccount')}{' '}
                <Text style={styles.switchModeBold}>{t('auth.pick.signIn')}</Text>
              </Text>
            </Pressable>
          </View>
        )}

        {mode === 'signIn' && (
          <View style={styles.formColumn}>
            <View style={styles.formHero}>
              <ExpoImage
                source={require('../assets/images/auth-login-hero.png')}
                style={styles.formHeroImage}
                contentFit="contain"
              />
            </View>
            <Text style={styles.formTitle}>{t('auth.signIn.title')}</Text>
            <Text style={styles.formHint}>{t('auth.signIn.hint')}</Text>

            <View style={styles.formCard}>
              {renderField('email-outline', t('auth.fieldEmail'), email, setEmail, {
                keyboard: 'email-address',
              })}
              {renderField('lock-outline', t('auth.fieldPassword'), password, setPassword, {
                secure: true,
                visible: showPassword,
                onToggleVisible: () => setShowPassword(v => !v),
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
                    {loading === 'login' ? t('auth.loadingLogin') : t('auth.ctaLogin')}
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>

            <GoogleSignInButton
              onIdToken={handleGoogleIdToken}
              disabled={isBusy}
              loading={loading === 'login'}
            />

            <Pressable onPress={goRegister} style={styles.switchModeLink}>
              <Text style={styles.switchModeText}>
                {t('auth.noAccount')}{' '}
                <Text style={styles.switchModeBold}>{t('auth.pick.register')}</Text>
              </Text>
            </Pressable>
          </View>
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
  registerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    overflow: 'hidden',
  },
  registerBackdropImage: {
    position: 'absolute',
    bottom: -SCREEN_H * 0.04,
    width: SCREEN_W * 1.28,
    height: SCREEN_H * 0.5,
    left: (SCREEN_W - SCREEN_W * 1.28) / 2,
  },
  registerBackdropGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  formHero: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  formHeroImage: {
    width: Math.min(SCREEN_W - 48, 400),
    height: Math.min(SCREEN_H * 0.24, 200),
    borderRadius: Theme.borderRadius.large,
    backgroundColor: 'transparent',
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
    backgroundColor: 'transparent',
  },
  scrollContent: {
    flexGrow: 1,
    width: '100%',
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  scrollPick: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: SCREEN_H,
    paddingTop: Platform.OS === 'ios' ? 12 : 8,
    paddingBottom: 32,
  },
  scrollRegister: {
    paddingTop: Platform.OS === 'ios' ? 88 : 76,
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: SCREEN_H - (Platform.OS === 'ios' ? 56 : 40),
    paddingBottom: Math.max(48, SCREEN_H * 0.14),
  },
  scrollFormCentered: {
    paddingTop: Platform.OS === 'ios' ? 88 : 76,
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: SCREEN_H - (Platform.OS === 'ios' ? 56 : 40),
    paddingBottom: 48,
  },
  formColumn: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  pickColumn: {
    width: '100%',
    maxWidth: 440,
    alignItems: 'center',
    alignSelf: 'center',
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
  passwordToggle: {
    padding: 6,
    marginLeft: 4,
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
