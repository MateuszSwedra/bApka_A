import {
  AUTH_PASSWORD_MAX_LENGTH,
  getLoginFieldIssue,
  getRegisterFieldIssue,
  isValidAuthEmail,
  normalizeAuthEmail,
} from '../utils/authCredentials';

describe('authCredentials', () => {
  it('normalizes email', () => {
    expect(normalizeAuthEmail('  A@B.PL ')).toBe('a@b.pl');
  });

  it('rejects bad emails', () => {
    expect(isValidAuthEmail('not-an-email')).toBe(false);
    expect(isValidAuthEmail('a@b')).toBe(false);
  });

  it('validates login fields', () => {
    expect(getLoginFieldIssue('', '')).toBe('empty');
    expect(getLoginFieldIssue('bad', 'secret1')).toBe('email_invalid');
    expect(getLoginFieldIssue('a@b.com', 'x'.repeat(AUTH_PASSWORD_MAX_LENGTH + 1))).toBe(
      'password_long',
    );
    expect(getLoginFieldIssue('a@b.com', 'secret1')).toBeNull();
  });

  it('validates register fields', () => {
    expect(getRegisterFieldIssue('a@b.com', '123456', '123457')).toBe('password_mismatch');
    expect(getRegisterFieldIssue('a@b.com', '123', '123')).toBe('password_short');
    expect(getRegisterFieldIssue('a@b.com', '123456', '123456')).toBeNull();
  });
});
