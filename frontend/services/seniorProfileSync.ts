import { parseSoundChoiceId } from '../constants/notificationSounds';
import { setMedicationSoundChoice } from './notificationSoundPreferences';
import { setDaltonistFriendly, setHighContrast } from './seniorDisplayPreferences';
import { applyAppLanguage, resolveEffectiveAppLanguage } from './appLanguage';

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
  const effectiveLang = await resolveEffectiveAppLanguage(profile.appLanguage);
  await applyAppLanguage(effectiveLang);
}
