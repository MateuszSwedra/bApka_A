/** Resolves JWT signing secret; fails fast when missing (no hardcoded fallback). */
export function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error(
      'JWT_SECRET is required. Set it in backend/.env (see .env.example).',
    );
  }
  return secret;
}

export function resolveJwtExpiresIn(): string {
  return process.env.JWT_EXPIRES_IN?.trim() || '7d';
}
