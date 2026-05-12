import { Stack } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';

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
        <Stack.Screen name="senior-type" />
        <Stack.Screen name="(caretaker)" />
        <Stack.Screen name="(dependent)" />
        <Stack.Screen name="(hybrid)" />
      </Stack>
    </AuthProvider>
  );
}
