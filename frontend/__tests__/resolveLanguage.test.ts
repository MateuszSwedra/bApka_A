import { resolveDeviceLanguage } from '../i18n/resolveLanguage';

describe('resolveDeviceLanguage', () => {
  it('returns pl for Polish locale', () => {
    expect(resolveDeviceLanguage([{ languageCode: 'pl' }])).toBe('pl');
    expect(resolveDeviceLanguage([{ languageTag: 'pl-PL' }])).toBe('pl');
  });

  it('returns en for English locales', () => {
    expect(resolveDeviceLanguage([{ languageCode: 'en' }])).toBe('en');
    expect(resolveDeviceLanguage([{ languageTag: 'en-US' }])).toBe('en');
  });

  it('defaults to pl for unsupported or empty locales', () => {
    expect(resolveDeviceLanguage([{ languageCode: 'de' }])).toBe('pl');
    expect(resolveDeviceLanguage([])).toBe('pl');
  });
});
