import React, { useEffect, useCallback, useMemo } from 'react';
import { Pressable, Text, StyleSheet, Platform, ActivityIndicator, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { OnboardingPalette } from '../../constants/onboardingTheme';
import { Theme } from '../../constants/theme';
import {
  getGoogleAndroidClientId,
  getGoogleWebClientId,
  isGoogleSignInConfigured,
} from '../../constants/googleAuth';

WebBrowser.maybeCompleteAuthSession();

type Props = {
  onIdToken: (idToken: string) => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
};

export function GoogleSignInButton({ onIdToken, disabled, loading }: Props) {
  const { t } = useTranslation();

  const webClientId = getGoogleWebClientId();
  const androidClientId = getGoogleAndroidClientId();

  const googleConfig = useMemo(() => {
    if (Platform.OS === 'web') {
      return { webClientId };
    }
    if (Platform.OS === 'android') {
      return { webClientId, androidClientId };
    }
    return null;
  }, [webClientId, androidClientId]);

  const [request, response, promptAsync] = Google.useAuthRequest(
    googleConfig ?? { webClientId: undefined },
  );

  useEffect(() => {
    if (response?.type !== 'success') return;
    const idToken = response.authentication?.idToken;
    if (idToken) {
      void onIdToken(idToken);
    }
  }, [response, onIdToken]);

  const handlePress = useCallback(() => {
    void promptAsync({ showInRecents: true });
  }, [promptAsync]);

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
