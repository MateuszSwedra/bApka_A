import { useEffect } from 'react';
import { router } from 'expo-router';

/** Ustawienia seniora są zarządzane przez opiekuna - przekierowanie na ekran główny. */
export default function DependentSettingsRedirect() {
  useEffect(() => {
    router.replace('/(dependent)' as any);
  }, []);
  return null;
}
