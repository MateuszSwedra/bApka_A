import { normalizePinInput } from '../utils/pin';

describe('normalizePinInput', () => {
  it('strips non-digits', () => {
    expect(normalizePinInput('12-34 56')).toBe('123456');
  });

  it('limits to 6 digits', () => {
    expect(normalizePinInput('1234567890')).toBe('123456');
  });

  it('returns empty for letters only', () => {
    expect(normalizePinInput('abcdef')).toBe('');
  });
});
