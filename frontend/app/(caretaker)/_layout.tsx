import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { CaretakerLanguageSync } from '../../components/CaretakerLanguageSync';
import { CaretakerTourLockProvider } from '../../context/CaretakerTourLockContext';
import { useAuth } from '../../context/AuthContext';
import { getStoredRole } from '../../services/sessionStorage';
import { resolvePostAuthRoute } from '../../services/postAuthRouting';
import { usersAPI } from '../../services/api';
import { Theme } from '../../constants/theme';

export default function CaretakerLayout() {
  const { userRole, isReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isReady) return;

    let cancelled = false;

    const guard = async () => {
      const role = userRole ?? ((await getStoredRole()) as typeof userRole);
      if (role === 'CARETAKER' || role === 'HYBRID') return;

      let me = null;
      try {
        me = await usersAPI.getMe();
      } catch {
        /* offline */
      }

      if (cancelled) return;

      const destination = await resolvePostAuthRoute(me, {
        storedRole: role,
        skipNotificationCheck: true,
      });
      router.replace(destination as Parameters<typeof router.replace>[0]);
    };

    void guard();
    return () => {
      cancelled = true;
    };
  }, [isReady, userRole, router]);

  if (!isReady || (userRole && userRole !== 'CARETAKER' && userRole !== 'HYBRID')) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Theme.colors.background }}>
        <ActivityIndicator size="large" color={Theme.colors.primaryLimeDark} />
      </View>
    );
  }

  return (
    <CaretakerTourLockProvider>
      <CaretakerLanguageSync />
      <Stack screenOptions={{ headerShown: false }} />
    </CaretakerTourLockProvider>
  );
}
