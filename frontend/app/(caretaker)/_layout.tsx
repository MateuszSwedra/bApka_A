import { Stack } from 'expo-router';
import { CaretakerLanguageSync } from '../../components/CaretakerLanguageSync';
import { CaretakerTourLockProvider } from '../../context/CaretakerTourLockContext';
import { CaretakerGuidedTourProvider } from '../../context/CaretakerGuidedTourContext';

export default function CaretakerLayout() {
  return (
    <CaretakerTourLockProvider>
      <CaretakerGuidedTourProvider>
        <CaretakerLanguageSync />
        <Stack screenOptions={{ headerShown: false }} />
      </CaretakerGuidedTourProvider>
    </CaretakerTourLockProvider>
  );
}
