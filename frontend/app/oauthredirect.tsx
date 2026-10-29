import { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { OnboardingPalette } from '../constants/onboardingTheme';

WebBrowser.maybeCompleteAuthSession();

export default function OAuthRedirectScreen() {
  useEffect(() => {
    WebBrowser.maybeCompleteAuthSession();
    const t = setTimeout(() => {
      try {
        if (router.canDismiss()) {
          router.dismissAll();
        }
      } catch {
      }
      router.replace('/login');
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={OnboardingPalette.navy} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: OnboardingPalette.background,
  },
});
