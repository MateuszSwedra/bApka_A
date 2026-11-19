import { createHash, randomBytes } from 'crypto';

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function randomTokenHex(bytes = 24): string {
  return randomBytes(bytes).toString('hex');
}

/** Krótki publiczny ID do SoftAP (np. bApka-A1B2). */
export function randomPublicId(length = 4): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const buf = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += alphabet[buf[i]! % alphabet.length];
  }
  return out;
}
