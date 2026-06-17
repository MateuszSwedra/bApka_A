import { useEffect } from 'react';
import { router } from 'expo-router';

export default function DependentSettingsScreen() {
  useEffect(() => {
    router.replace('/(dependent)' as never);
  }, []);

  return null;
}
