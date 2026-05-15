/**
 * Trzy presety dźwięku powiadomień (leki vs SOS — osobne mapowanie plików).
 * Pliki w `assets/sounds/` (OGG z Google Actions — krótkie sample).
 */
export type NotificationSoundChoiceId = 'default' | 'gentle' | 'strong';

export const NOTIFICATION_SOUND_CHOICES: {
  id: NotificationSoundChoiceId;
  label: string;
  description: string;
}[] = [
  {
    id: 'default',
    label: 'Domyślny systemowy',
    description: 'Standardowy dźwięk systemu przy powiadomieniu.',
  },
  {
    id: 'gentle',
    label: 'Łagodny',
    description: 'Krótki, dyskretny sygnał.',
  },
  {
    id: 'strong',
    label: 'Wyraźny',
    description: 'Bardziej zauważalny sygnał.',
  },
];

const medSoft = require('../assets/sounds/med_soft.ogg');
const medBright = require('../assets/sounds/med_bright.ogg');
const sosAlert = require('../assets/sounds/sos_alert.ogg');

/** Zasób do odtwarzania w podglądzie / późniejszym schedulingu (null = domyślny systemowy). */
export function resolveMedicationSoundAsset(
  id: NotificationSoundChoiceId,
): number | null {
  if (id === 'default') return null;
  if (id === 'gentle') return medSoft;
  return sosAlert;
}

export function resolveSosSoundAsset(id: NotificationSoundChoiceId): number | null {
  if (id === 'default') return null;
  if (id === 'gentle') return medSoft;
  return medBright;
}

export function parseSoundChoiceId(raw: string | null): NotificationSoundChoiceId {
  if (raw === 'gentle' || raw === 'strong') return raw;
  return 'default';
}
