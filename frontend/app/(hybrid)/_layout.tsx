import { Stack } from 'expo-router';
import { DependentDisplayProvider } from '../../context/DependentDisplayContext';
import { CaretakerTourLockProvider } from '../../context/CaretakerTourLockContext';
import { SeniorGuidedTourProvider } from '../../context/SeniorGuidedTourContext';

export default function HybridRootLayout() {
  return (
    <CaretakerTourLockProvider>
    <DependentDisplayProvider>
    <SeniorGuidedTourProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="add-med/[dependentId]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="add-treatment/[dependentId]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="edit-treatment/[treatmentId]" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </SeniorGuidedTourProvider>
    </DependentDisplayProvider>
    </CaretakerTourLockProvider>
  );
}
