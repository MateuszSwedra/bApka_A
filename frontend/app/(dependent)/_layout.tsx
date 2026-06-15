import { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Stack, router } from 'expo-router';
import { DependentDisplayProvider } from '../../context/DependentDisplayContext';
import { usersAPI } from '../../services/api';
import { dependentNeedsCaretakerPin, type MeProfile } from '../../services/postAuthRouting';
import { Theme } from '../../constants/theme';

export default function DependentLayout() {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void usersAPI
      .getMe()
      .then(me => {
        if (cancelled) return;
        const profile = me as MeProfile;
        if (dependentNeedsCaretakerPin(profile, profile.role ?? 'DEPENDENT')) {
          router.replace('/enter-pin');
          return;
        }
        setAllowed(true);
      })
      .catch(() => {
        if (cancelled) return;
        router.replace('/enter-pin');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!allowed) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Theme.colors.primaryLimeDark} />
      </View>
    );
  }

  return (
    <DependentDisplayProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </DependentDisplayProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.colors.background,
  },
});
