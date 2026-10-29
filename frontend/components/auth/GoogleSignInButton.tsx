import React, { useEffect, useCallback, useMemo, useRef } from 'react';
import { Pressable, Text, StyleSheet, Platform, ActivityIndicator, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { type AuthSessionResult } from 'expo-auth-session';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { OnboardingPalette } from '../../constants/onboardingTheme';
import { Theme } from '../../constants/theme';
import {
  getGoogleAndroidClientId,
  getGoogleRedirectUri,
  getGoogleWebClientId,
  isGoogleSignInConfigured,
} from '../../constants/googleAuth';

WebBrowser.maybeCompleteAuthSession();

type Props = {
  onIdToken: (idToken: string) => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
};

function extractIdToken(response: AuthSessionResult | null): string | null {
  if (!response || response.type !== 'success') return null;
  const fromAuth = response.authentication?.idToken?.trim();
  if (fromAuth) return fromAuth;
  const fromParams = response.params?.id_token?.trim();
  return fromParams || null;
}

export function GoogleSignInButton({ onIdToken, disabled, loading }: Props) {
  const { t } = useTranslation();
  const handledRef = useRef<string | null>(null);
  const onIdTokenRef = useRef(onIdToken);
  onIdTokenRef.current = onIdToken;

  const deliver = useCallback((idToken: string) => {
    if (!idToken || handledRef.current === idToken) return;
    handledRef.current = idToken;
    void onIdTokenRef.current(idToken);
  }, []);

  const webClientId = getGoogleWebClientId();
  const androidClientId = getGoogleAndroidClientId();

  const googleConfig = useMemo(() => {
    const base = {
      scopes: ['openid', 'profile', 'email'],
      selectAccount: true,
    };
    if (Platform.OS === 'web') {
      return { ...base, webClientId };
    }
    if (Platform.OS === 'android') {
      return {
        ...base,
        webClientId,
        androidClientId,
        redirectUri: getGoogleRedirectUri(),
      };
    }
    return null;
  }, [webClientId, androidClientId]);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(
    googleConfig ?? { webClientId: undefined },
  );

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const idToken = extractIdToken(response);
    if (idToken) deliver(idToken);
  }, [response, deliver]);

  const handlePress = useCallback(() => {
    handledRef.current = null;
    void promptAsync(
      Platform.OS === 'web'
        ? { windowName: '_self' }
        : { showInRecents: true },
    ).then((result) => {
      if (Platform.OS === 'web') return;
      const idToken = extractIdToken(result);
      if (idToken) deliver(idToken);
    }).catch(() => {
    });
  }, [promptAsync, deliver]);

  if (!isGoogleSignInConfigured() || !googleConfig) {
    return null;
  }

  const busy = disabled || loading || !request;

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={handlePress}
        disabled={busy}
        style={({ pressed }) => [styles.button, pressed && { opacity: 0.9 }, busy && styles.buttonDisabled]}
        accessibilityRole="button"
        accessibilityLabel={t('auth.google.cta')}
      >
        {loading ? (
          <ActivityIndicator color={OnboardingPalette.primaryDark} />
        ) : (
          <>
            <MaterialCommunityIcons name="google" size={22} color={OnboardingPalette.primaryDark} />
            <Text style={styles.label}>{t('auth.google.cta')}</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', marginTop: 4, marginBottom: Theme.spacing.m },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 15,
    borderRadius: Theme.borderRadius.round,
    borderWidth: 2,
    borderColor: OnboardingPalette.primaryDark,
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  buttonDisabled: { opacity: 0.55 },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: OnboardingPalette.primaryDark,
  },
});
