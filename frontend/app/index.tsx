import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../context/AuthContext';
import { OnboardingPalette } from '../constants/onboardingTheme';
import { isAuthApiError, usersAPI } from '../services/api';
import { getStoredRole, getStoredToken, clearSessionStorage, persistSession } from '../services/sessionStorage';
import { resolvePostAuthRoute, type MeProfile } from '../services/postAuthRouting';

async function readNeedsDisplayName(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem('needsDisplayName') === 'true';
    }
    return (await SecureStore.getItemAsync('needsDisplayName')) === 'true';
  } catch {
    return false;
  }
}

async function readOnboardingFlags(): Promise<{ hasSeenWelcome: boolean; hasSeenConsents: boolean }> {
  try {
    if (Platform.OS === 'web') {
      return {
        hasSeenWelcome: localStorage.getItem('hasSeenWelcome') === 'true',
        hasSeenConsents: localStorage.getItem('hasSeenConsents') === 'true',
      };
    }
    const [hasSeenWelcome, hasSeenConsents] = await Promise.all([
      SecureStore.getItemAsync('hasSeenWelcome'),
      SecureStore.getItemAsync('hasSeenConsents'),
    ]);
    return {
      hasSeenWelcome: hasSeenWelcome === 'true',
      hasSeenConsents: hasSeenConsents === 'true',
    };
  } catch {
    return { hasSeenWelcome: false, hasSeenConsents: false };
  }
}

function routeToGuestOnboarding(hasSeenWelcome: boolean, hasSeenConsents: boolean) {
  if (!hasSeenWelcome) {
    router.replace('/welcome');
  } else if (!hasSeenConsents) {
    router.replace('/consents');
  } else {
    router.replace('/login');
  }
}

// Punkt wejścia — sesja z tokenem ma pierwszeństwo przed ekranem powitalnym.
export default function IndexRouter() {
  const { isReady } = useAuth();

  useEffect(() => {
    if (!isReady) return;

    const route = async () => {
      const sessionToken = await getStoredToken();

      if (sessionToken) {
        let me: MeProfile | null = null;
        try {
          me = (await usersAPI.getMe()) as MeProfile;
          if (me?.role) {
            await persistSession(sessionToken, me.role);
          }
        } catch (e) {
          if (isAuthApiError(e)) {
            await clearSessionStorage();
            const { hasSeenWelcome, hasSeenConsents } = await readOnboardingFlags();
            routeToGuestOnboarding(hasSeenWelcome, hasSeenConsents);
            return;
          }
          /* sieć niedostępna — kontynuuj z zapisaną rolą */
        }

        const storedRole = await getStoredRole();
        const needsDisplayName = await readNeedsDisplayName();
        const destination = await resolvePostAuthRoute(me, {
          needsDisplayName,
          storedRole,
        });
        router.replace(destination as Parameters<typeof router.replace>[0]);
        return;
      }

      const { hasSeenWelcome, hasSeenConsents } = await readOnboardingFlags();
      routeToGuestOnboarding(hasSeenWelcome, hasSeenConsents);
    };

    void route();
  }, [isReady]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={OnboardingPalette.navy} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: OnboardingPalette.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
