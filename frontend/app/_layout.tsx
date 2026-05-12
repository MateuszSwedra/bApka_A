import { Stack } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';
import { NotificationConsentCoordinator } from '../components/NotificationConsentCoordinator';

export default function RootLayout() {
  return (
    <AuthProvider>
      <NotificationConsentCoordinator>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="role-selection" />
          <Stack.Screen name="senior-type" />
          <Stack.Screen name="(caretaker)" />
          <Stack.Screen name="(dependent)" />
          <Stack.Screen name="(hybrid)" />
        </Stack>
      </NotificationConsentCoordinator>
    </AuthProvider>
  );
}
