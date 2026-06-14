import { Stack } from 'expo-router';
import { CaretakerLanguageSync } from '../../components/CaretakerLanguageSync';
import { CaretakerTourLockProvider } from '../../context/CaretakerTourLockContext';

export default function CaretakerLayout() {
  return (
    <CaretakerTourLockProvider>
      <CaretakerLanguageSync />
      <Stack screenOptions={{ headerShown: false }} />
    </CaretakerTourLockProvider>
  );
}
