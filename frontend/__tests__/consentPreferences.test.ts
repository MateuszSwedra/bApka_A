jest.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

import { parseConsentPreferences } from '../services/consentPreferences';

describe('parseConsentPreferences', () => {
  it('defaults when empty', () => {
    expect(parseConsentPreferences(null)).toEqual({
      allAccepted: false,
      analytics: false,
      tailoredContent: false,
      at: '',
    });
  });

  it('parses stored flags', () => {
    expect(
      parseConsentPreferences(
        JSON.stringify({
          allAccepted: true,
          analytics: true,
          tailoredContent: false,
          at: '2026-01-01',
        }),
      ),
    ).toEqual({
      allAccepted: true,
      analytics: true,
      tailoredContent: false,
      at: '2026-01-01',
    });
  });
});
