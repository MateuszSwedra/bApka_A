import { parseSoundChoiceId } from '../constants/notificationSounds';
import { setMedicationSoundChoice } from './notificationSoundPreferences';
import { setDaltonistFriendly, setHighContrast } from './seniorDisplayPreferences';
import { applyAppLanguage, normalizeAppLanguage, resolveEffectiveAppLanguage } from './appLanguage';

export type SeniorProfileSettings = {
  highContrast?: boolean;
  colorBlindFriendly?: boolean;
  medicationSoundChoice?: string;
  appLanguage?: string;
};

export async function applySeniorProfileSettings(profile: SeniorProfileSettings): Promise<void> {
  if (typeof profile.highContrast === 'boolean') {
    await setHighContrast(profile.highContrast);
  }
  if (typeof profile.colorBlindFriendly === 'boolean') {
    await setDaltonistFriendly(profile.colorBlindFriendly);
  }
  if (typeof profile.medicationSoundChoice === 'string') {
    await setMedicationSoundChoice(parseSoundChoiceId(profile.medicationSoundChoice));
  }
  if (typeof profile.appLanguage === 'string' && profile.appLanguage.trim().length > 0) {
    // Dla synchronizacji profilu (np. ustawienia zmienione przez opiekuna) język z backendu
    // jest źródłem prawdy i powinien nadpisać lokalną poprzednią preferencję.
    await applyAppLanguage(normalizeAppLanguage(profile.appLanguage));
    return;
  }
  const effectiveLang = await resolveEffectiveAppLanguage(profile.appLanguage);
  await applyAppLanguage(effectiveLang);
}
