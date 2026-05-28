import {
  NOTIFICATION_SOUND_CHOICE_IDS,
  parseSoundChoiceId,
  resolveMedicationSoundAsset,
  resolveSosSoundAsset,
} from '../constants/notificationSounds';

describe('notificationSounds', () => {
  it('exposes three preset ids', () => {
    expect(NOTIFICATION_SOUND_CHOICE_IDS).toEqual(['default', 'gentle', 'strong']);
  });

  it('parseSoundChoiceId normalizes input', () => {
    expect(parseSoundChoiceId('gentle')).toBe('gentle');
    expect(parseSoundChoiceId('strong')).toBe('strong');
    expect(parseSoundChoiceId('invalid')).toBe('default');
    expect(parseSoundChoiceId(null)).toBe('default');
  });

  it('resolveMedicationSoundAsset returns null for default', () => {
    expect(resolveMedicationSoundAsset('default')).toBeNull();
    expect(resolveMedicationSoundAsset('gentle')).not.toBeNull();
  });

  it('resolveSosSoundAsset uses bright tone for strong', () => {
    expect(resolveSosSoundAsset('strong')).not.toBeNull();
    expect(resolveSosSoundAsset('default')).toBeNull();
  });
});
