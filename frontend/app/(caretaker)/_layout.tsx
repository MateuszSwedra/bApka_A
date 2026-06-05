import { Stack } from 'expo-router';
import { CaretakerLanguageSync } from '../../components/CaretakerLanguageSync';

export default function CaretakerLayout() {
  return (
    <>
      <CaretakerLanguageSync />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
