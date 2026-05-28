import { Stack } from 'expo-router';

export default function AddMedStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="frequency" />
      <Stack.Screen name="timing" />
      <Stack.Screen name="schedule" />
    </Stack>
  );
}
