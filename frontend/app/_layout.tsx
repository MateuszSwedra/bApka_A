import { Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from '../context/AuthContext';
import { Theme } from '../constants/theme';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function RootLayout() {
  return (
    <AuthProvider>
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
        <Stack.Screen
          name="notification-sound-settings"
          options={{
            title: 'Dźwięki powiadomień',
            headerShown: true,
            headerStyle: { backgroundColor: Theme.colors.surfaceWhite },
            headerTintColor: Theme.colors.textDark,
          }}
        />
        <Stack.Screen name="(caretaker)" />
        <Stack.Screen name="(dependent)" />
        <Stack.Screen name="(hybrid)" />
      </Stack>
    </AuthProvider>
  );
}
