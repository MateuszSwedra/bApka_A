import { Stack } from 'expo-router';
import { MedsProvider } from '../../context/MedsContext';

export default function DependentLayout() {
  return (
    <MedsProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </MedsProvider>
  );
}
