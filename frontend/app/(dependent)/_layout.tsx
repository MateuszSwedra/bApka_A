import { Stack } from 'expo-router';
<<<<<<< HEAD
import { MedsProvider } from '../../context/MedsContext';

export default function DependentLayout() {
  return (
    <MedsProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </MedsProvider>
=======
import { DependentDisplayProvider } from '../../context/DependentDisplayContext';

export default function DependentLayout() {
  return (
    <DependentDisplayProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </DependentDisplayProvider>
>>>>>>> 9d58b9ae387549f7767c97bdc0516e0e4371b185
  );
}
