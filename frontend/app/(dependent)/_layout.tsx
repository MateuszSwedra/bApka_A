import { Stack } from 'expo-router';
import { DependentDisplayProvider } from '../../context/DependentDisplayContext';

export default function DependentLayout() {
  return (
    <DependentDisplayProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </DependentDisplayProvider>
  );
}
