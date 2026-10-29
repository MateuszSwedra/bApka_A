import { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { OnboardingPalette } from '../constants/onboardingTheme';

// Google wraca na bapka://oauthredirect lub com.bapka.app:/oauthredirect.
// Bez tej trasy Expo Router pokazuje „Unmatched Route” i potrafi urwać wymianę code→id_token.
WebBrowser.maybeCompleteAuthSession();

export default function OAuthRedirectScreen() {
  useEffect(() => {
    WebBrowser.maybeCompleteAuthSession();
    // Login zostaje w Stacku pod spodem — AuthSession dokończy wymianę tokenu.
    // Gdy cold-start bez aktywnej sesji OAuth, wracamy na logowanie.
    const t = setTimeout(() => {
      try {
        if (router.canDismiss()) {
          router.dismissAll();
        }
      } catch {
        /* ignore */
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
