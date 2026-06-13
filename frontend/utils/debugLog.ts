/** Opcjonalny log deweloperski - domyślnie wyłączony (bez żądań sieciowych). */
export function debugLog(
  _location: string,
  _message: string,
  _data: Record<string, unknown>,
  _hypothesisId: string,
): void {
  // no-op
}
