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
      // 1) zalogowana sesja - prosto do panelu
      if (userRole) {
        if (userRole === 'CARETAKER') {
          router.replace('/(caretaker)');
        } else if (userRole === 'DEPENDENT') {
          router.replace('/(dependent)');
        } else if (userRole === 'HYBRID') {
          router.replace('/(hybrid)');
        } else {
          router.replace('/role-selection');
        }
        return;
      }

      // 2) sprawdzamy czy onboarding zostal juz pokazany
      let hasSeenWelcome: string | null = null;
      try {
        if (Platform.OS === 'web') {
          hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
        } else {
          hasSeenWelcome = await SecureStore.getItemAsync('hasSeenWelcome');
        }
      } catch {
        hasSeenWelcome = null;
      }

      if (hasSeenWelcome === 'true') {
        router.replace('/login');
      } else {
        router.replace('/welcome');
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
