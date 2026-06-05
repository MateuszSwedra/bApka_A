import { Stack } from 'expo-router';
import { DependentDisplayProvider } from '../../context/DependentDisplayContext';

export default function HybridRootLayout() {
  return (
    <DependentDisplayProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="add-med/[dependentId]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="add-treatment/[dependentId]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="edit-treatment/[treatmentId]" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </DependentDisplayProvider>
  );
}
