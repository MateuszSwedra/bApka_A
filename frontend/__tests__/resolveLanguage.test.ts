import { resolveDeviceLanguage } from '../i18n/resolveLanguage';

describe('resolveDeviceLanguage', () => {
  it('returns pl for Polish locale', () => {
    expect(resolveDeviceLanguage([{ languageCode: 'pl' }])).toBe('pl');
    expect(resolveDeviceLanguage([{ languageTag: 'pl-PL' }])).toBe('pl');
  });

  it('returns en for English and other languages', () => {
    expect(resolveDeviceLanguage([{ languageCode: 'en' }])).toBe('en');
    expect(resolveDeviceLanguage([{ languageCode: 'de' }])).toBe('en');
  });

  it('defaults to pl when locales empty', () => {
    expect(resolveDeviceLanguage([])).toBe('pl');
  });
});
