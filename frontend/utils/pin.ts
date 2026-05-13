/** Usuwa wszystko poza cyframi (spacje, myślniki itd.), max 6 cyfr. */
export function normalizePinInput(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 6);
}
