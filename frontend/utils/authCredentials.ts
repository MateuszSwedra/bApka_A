/** Limity zsynchronizowane z backend/src/auth/auth-credentials.ts */
export const AUTH_EMAIL_MAX_LENGTH = 254;
export const AUTH_PASSWORD_MIN_LENGTH = 6;
export const AUTH_PASSWORD_MAX_LENGTH = 72;

const CONTROL_OR_SEPARATOR = /[\u0000-\u001F\u007F\u2028\u2029]/;
const EMAIL_PATTERN =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

export type AuthFieldIssue =
  | 'empty'
  | 'email_invalid'
  | 'password_short'
  | 'password_long'
  | 'password_invalid'
  | 'password_mismatch';

export function normalizeAuthEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidAuthEmail(email: string): boolean {
  if (!email || email.length > AUTH_EMAIL_MAX_LENGTH) return false;
  if (CONTROL_OR_SEPARATOR.test(email) || /\s/.test(email)) return false;
  if (email.includes('..')) return false;
  return EMAIL_PATTERN.test(email);
}

export function getLoginFieldIssue(emailRaw: string, password: string): AuthFieldIssue | null {
  if (!emailRaw.trim() || !password) return 'empty';
  if (CONTROL_OR_SEPARATOR.test(emailRaw)) return 'email_invalid';
  const email = normalizeAuthEmail(emailRaw);
  if (!isValidAuthEmail(email)) return 'email_invalid';
  if (CONTROL_OR_SEPARATOR.test(password)) return 'password_invalid';
  if (password.length > AUTH_PASSWORD_MAX_LENGTH) return 'password_long';
  return null;
}

export function getRegisterFieldIssue(
  emailRaw: string,
  password: string,
  passwordRepeat: string,
): AuthFieldIssue | null {
  if (!emailRaw.trim() || !password || !passwordRepeat) return 'empty';
  if (CONTROL_OR_SEPARATOR.test(emailRaw)) return 'email_invalid';
  const email = normalizeAuthEmail(emailRaw);
  if (!isValidAuthEmail(email)) return 'email_invalid';
  if (CONTROL_OR_SEPARATOR.test(password)) return 'password_invalid';
  if (password.length < AUTH_PASSWORD_MIN_LENGTH) return 'password_short';
  if (password.length > AUTH_PASSWORD_MAX_LENGTH) return 'password_long';
  if (password !== passwordRepeat) return 'password_mismatch';
  return null;
}
