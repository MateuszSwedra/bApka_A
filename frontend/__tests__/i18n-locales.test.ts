import pl from '../i18n/locales/pl.json';
import en from '../i18n/locales/en.json';

/** Rekurencyjnie zbiera klucze liści w obiekcie JSON. */
function leafKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...leafKeys(v as Record<string, unknown>, path));
    } else {
      keys.push(path);
    }
  }
  return keys.sort();
}

describe('i18n locales', () => {
  const plKeys = leafKeys(pl as Record<string, unknown>);
  const enKeys = leafKeys(en as Record<string, unknown>);

  it('pl and en have the same translation keys', () => {
    expect(enKeys).toEqual(plKeys);
  });

  it('calendar month arrays have 12 entries', () => {
    expect(pl.calendar.monthNames).toHaveLength(12);
    expect(en.calendar.monthNames).toHaveLength(12);
  });

  it('sound presets exist in both languages', () => {
    expect(pl.sounds.default.label).toBeTruthy();
    expect(en.sounds.default.label).toBeTruthy();
    expect(pl.sounds.gentle.description).toBeTruthy();
    expect(en.sounds.gentle.description).toBeTruthy();
  });
});
