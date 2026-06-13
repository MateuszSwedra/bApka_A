import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../context/AuthContext';
import { OnboardingPalette } from '../constants/onboardingTheme';

// Punkt wejścia - decyduje czy pokazac welcome, login, czy panel zalogowanego usera.
export default function IndexRouter() {
  const { userRole, isReady } = useAuth();
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    if (!isReady) return;

    const route = async () => {
      let sessionToken: string | null = null;
      try {
        if (Platform.OS === 'web') {
          sessionToken = localStorage.getItem('userToken');
        } else {
          sessionToken = await SecureStore.getItemAsync('userToken');
        }
      } catch {
        sessionToken = null;
      }

      // 1) zalogowana sesja - token wystarczy; rola z AuthContext (odświeżona przez getMe)
      if (sessionToken && userRole) {
        if (userRole === 'CARETAKER') {
          router.replace('/(caretaker)');
        } else if (userRole === 'DEPENDENT') {
          router.replace('/(dependent)');
        } else if (userRole === 'HYBRID') {
          router.replace('/(hybrid)/(tabs)');
        } else {
          router.replace('/role-selection');
        }
        return;
      }

      if (sessionToken && !userRole) {
        router.replace('/role-selection');
        return;
      }

      // 2) onboarding: welcome -> zgody -> login (tylko przy pierwszym uruchomieniu)
      let hasSeenWelcome: string | null = null;
      let hasSeenConsents: string | null = null;
      try {
        if (Platform.OS === 'web') {
          hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
          hasSeenConsents = localStorage.getItem('hasSeenConsents');
        } else {
          hasSeenWelcome = await SecureStore.getItemAsync('hasSeenWelcome');
          hasSeenConsents = await SecureStore.getItemAsync('hasSeenConsents');
        }
      } catch {
        hasSeenWelcome = null;
        hasSeenConsents = null;
      }

      let needsDisplayName: string | null = null;
      let hasToken = false;
      try {
        if (Platform.OS === 'web') {
          needsDisplayName = localStorage.getItem('needsDisplayName');
          hasToken = !!localStorage.getItem('userToken');
        } else {
          needsDisplayName = await SecureStore.getItemAsync('needsDisplayName');
          hasToken = !!(await SecureStore.getItemAsync('userToken'));
        }
      } catch {
        needsDisplayName = null;
      }

      if (hasToken && needsDisplayName === 'true') {
        router.replace('/onboarding-name');
        setResolved(true);
        return;
      }

      if (hasSeenWelcome !== 'true') {
        router.replace('/welcome');
      } else if (hasSeenConsents !== 'true') {
        router.replace('/consents');
      } else {
        router.replace('/login');
      }
      setResolved(true);
    };

    route();
  }, [isReady, userRole]);

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
