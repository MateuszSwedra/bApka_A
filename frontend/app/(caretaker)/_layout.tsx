import { Stack } from 'expo-router';
import { MedsProvider } from '../../context/MedsContext';

export default function CaretakerLayout() {
  return (
    <MedsProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </MedsProvider>
  );
}
