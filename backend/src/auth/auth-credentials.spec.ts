import {
  AUTH_PASSWORD_MAX_LENGTH,
  getAuthCredentialIssue,
  isValidAuthEmail,
  normalizeAuthEmail,
} from './auth-credentials';

describe('auth-credentials', () => {
  it('normalizes email', () => {
    expect(normalizeAuthEmail('  Foo@Bar.COM ')).toBe('foo@bar.com');
  });

  it('accepts typical emails', () => {
    expect(isValidAuthEmail('a@b.co')).toBe(true);
    expect(isValidAuthEmail('user.name+tag@example.com')).toBe(true);
  });

  it('rejects malformed or hostile emails', () => {
    expect(isValidAuthEmail('bad')).toBe(false);
    expect(isValidAuthEmail('a@b')).toBe(false);
    expect(isValidAuthEmail('a@@b.com')).toBe(false);
    expect(isValidAuthEmail('a@b..com')).toBe(false);
    expect(isValidAuthEmail('a@b. com')).toBe(false);
    expect(isValidAuthEmail('a<script>@b.com')).toBe(false);
    expect(getAuthCredentialIssue('a@b.com\u0000', '123456')).toBe('email_invalid');
  });

  it('validates password length bounds', () => {
    expect(getAuthCredentialIssue('a@b.com', '12345')).toBe('password_short');
    expect(getAuthCredentialIssue('a@b.com', 'x'.repeat(AUTH_PASSWORD_MAX_LENGTH + 1))).toBe(
      'password_long',
    );
    expect(getAuthCredentialIssue('a@b.com', '123456')).toBeNull();
  });

  it('rejects control characters in password', () => {
    expect(getAuthCredentialIssue('a@b.com', '12345\n6')).toBe('password_invalid');
  });
});
