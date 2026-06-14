import '../i18n';
import '../services/sosBootstrap';
import { Stack, usePathname } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../context/AuthContext';
import { MedsProvider } from '../context/MedsContext';
import {
  ensureSosAlarmChannel,
  openSosAlarmFromColdStart,
  registerSosAlarmHandlers,
} from '../services/sosAlarmHandlers';
import { useAuth } from '../context/AuthContext';
import { getStoredRole } from '../services/sessionStorage';
import { enforcePushPermissionsOnResume } from '../services/pushPermissionGuard';
import { useTranslation } from 'react-i18next';
import { parseSosPayload, presentSosAlarm } from '../services/presentSosAlarm';
import { routeIncomingPush } from '../services/incomingPushRouter';

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data as Record<string, unknown> | undefined;
    const isSos = data?.type === 'sos';

    if (isSos) {
      const content = notification.request.content;
      const params = parseSosPayload(data);
      if (params) {
        presentSosAlarm({
          ...params,
          title:
            content.title ??
            (typeof data?.title === 'string' ? data.title : null) ??
            'SOS!',
          body:
            params.body ||
            content.body ||
            (typeof data?.body === 'string' ? data.body : '') ||
            '',
        });
      }
    } else {
      void routeIncomingPush(data);
    }

    return {
      shouldShowAlert: !isSos,
      shouldPlaySound: !isSos,
      shouldSetBadge: false,
      shouldShowBanner: !isSos,
      shouldShowList: !isSos,
    };
  },
});

function SosAlarmBootstrap() {
  useEffect(() => {
    const unsubscribe = registerSosAlarmHandlers();
    const timer = setTimeout(() => {
      void openSosAlarmFromColdStart();
    }, 400);

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void openSosAlarmFromColdStart();
      }
    });

    return () => {
      clearTimeout(timer);
      appStateSub.remove();
      unsubscribe();
    };
  }, []);
  return null;
}

function PushPermissionGuard() {
  const { isReady, userRole } = useAuth();
  const pathname = usePathname();
  const { t } = useTranslation();

  useEffect(() => {
    if (!isReady || Platform.OS === 'web') return;

    const check = async () => {
      const role = userRole ?? ((await getStoredRole()) as typeof userRole);
      await enforcePushPermissionsOnResume(pathname, role, {
        fsiTitle: t('notification.fsiTitle'),
        fsiMessage: t('notification.fsiMessage'),
        fsiOpenSettings: t('notification.fsiOpenSettings'),
        fsiLater: t('notification.fsiLater'),
      });
    };

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check();
    });
    return () => sub.remove();
  }, [isReady, userRole, pathname, t]);

  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
    <AuthProvider>
      <MedsProvider>
      <PushPermissionGuard />
      <SosAlarmBootstrap />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
        <Stack.Screen name="consents" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="login" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen
          name="onboarding-name"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen name="role-selection" />
        <Stack.Screen
          name="profile-ready"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="notification"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen name="senior-type" />
        <Stack.Screen name="enter-pin" />
        <Stack.Screen name="notification-sound-settings" options={{ headerShown: false }} />
        <Stack.Screen
          name="sos-alarm"
          options={{ animation: 'fade', presentation: 'fullScreenModal', gestureEnabled: false }}
        />
        <Stack.Screen name="(caretaker)" />
        <Stack.Screen name="(dependent)" />
        <Stack.Screen name="(hybrid)" />
      </Stack>
      </MedsProvider>
    </AuthProvider>
    </SafeAreaProvider>
  );
}
