import { createHash, randomBytes } from 'crypto';

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function randomTokenHex(bytes = 24): string {
  return randomBytes(bytes).toString('hex');
}

const HUMAN_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomFromAlphabet(length: number): string {
  const buf = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += HUMAN_ALPHABET[buf[i]! % HUMAN_ALPHABET.length];
  }
  return out;
}

export function randomPublicId(length = 4): string {
  return randomFromAlphabet(length);
}

export function randomClaimCode(length = 8): string {
  return randomFromAlphabet(length);
}
