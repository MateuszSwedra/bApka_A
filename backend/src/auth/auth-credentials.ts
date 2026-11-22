
export const AUTH_EMAIL_MAX_LENGTH = 254;

export const AUTH_EMAIL_LOCAL_MAX_LENGTH = 64;
export const AUTH_PASSWORD_MIN_LENGTH = 6;
export const AUTH_PASSWORD_MAX_LENGTH = 72;
export const AUTH_GOOGLE_ID_TOKEN_MAX_LENGTH = 4096;

const CONTROL_OR_SEPARATOR = /[\u0000-\u001F\u007F\u2028\u2029]/;

const EMAIL_PATTERN =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

export function normalizeAuthEmail(email: unknown): string {
  if (typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

export function isValidAuthEmail(email: string): boolean {
  if (!email || email.length > AUTH_EMAIL_MAX_LENGTH) return false;
  if (CONTROL_OR_SEPARATOR.test(email) || /\s/.test(email)) return false;
  if (email.includes('..')) return false;

  const at = email.lastIndexOf('@');
  if (at <= 0 || at === email.length - 1) return false;
  const local = email.slice(0, at);
  if (local.length > AUTH_EMAIL_LOCAL_MAX_LENGTH) return false;
  if (local.startsWith('.') || local.endsWith('.')) return false;

  return EMAIL_PATTERN.test(email);
}

export function isValidAuthPassword(password: unknown): password is string {
  if (typeof password !== 'string') return false;
  if (CONTROL_OR_SEPARATOR.test(password)) return false;
  if (password.length < AUTH_PASSWORD_MIN_LENGTH) return false;
  if (password.length > AUTH_PASSWORD_MAX_LENGTH) return false;
  return true;
}

export type AuthCredentialIssue =
  | 'email_invalid'
  | 'password_short'
  | 'password_long'
  | 'password_invalid';

export function getAuthCredentialIssue(
  emailRaw: unknown,
  passwordRaw: unknown,
): AuthCredentialIssue | null {
  if (typeof emailRaw === 'string' && CONTROL_OR_SEPARATOR.test(emailRaw)) {
    return 'email_invalid';
  }
  const email = normalizeAuthEmail(emailRaw);
  if (!isValidAuthEmail(email)) return 'email_invalid';

  if (typeof passwordRaw !== 'string' || CONTROL_OR_SEPARATOR.test(passwordRaw)) {
    return 'password_invalid';
  }
  if (passwordRaw.length < AUTH_PASSWORD_MIN_LENGTH) return 'password_short';
  if (passwordRaw.length > AUTH_PASSWORD_MAX_LENGTH) return 'password_long';
  return null;
}

export function authCredentialErrorMessage(issue: AuthCredentialIssue): string {
  switch (issue) {
    case 'email_invalid':
      return 'Podaj prawidłowy adres e-mail (max. 254 znaki).';
    case 'password_short':
      return `Hasło musi mieć co najmniej ${AUTH_PASSWORD_MIN_LENGTH} znaków.`;
    case 'password_long':
      return `Hasło może mieć co najwyżej ${AUTH_PASSWORD_MAX_LENGTH} znaków.`;
    case 'password_invalid':
      return 'Hasło zawiera niedozwolone znaki.';
    default:
      return 'Nieprawidłowe dane logowania.';
  }
}
