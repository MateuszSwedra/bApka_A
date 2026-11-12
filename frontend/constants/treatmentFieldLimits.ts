/** Limity pól apteczki (UI). Backend dopuszcza więcej — tu twardszy limit. */
export const TREATMENT_NAME_MAX_LENGTH = 20;
export const TREATMENT_DESCRIPTION_MAX_LENGTH = 100;
/** Max cyfr w polu ilości tabletek w opakowaniu / stanie. */
export const TREATMENT_PILLS_MAX_DIGITS = 5;

export function clampTreatmentPillsInput(raw: string): string {
  return raw.replace(/[^0-9]/g, '').slice(0, TREATMENT_PILLS_MAX_DIGITS);
}
