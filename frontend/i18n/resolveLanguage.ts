export type AppLanguage = 'pl' | 'en';

export type LocaleLike = {
  languageCode?: string | null;
  languageTag?: string | null;
};

/** Wybór języka aplikacji na podstawie locale urządzenia (testowalne bez expo). */
export function resolveDeviceLanguage(
  locales: LocaleLike[] = [],
): AppLanguage {
  const locale = locales[0];
  const code =
    locale?.languageCode?.toLowerCase() ??
    locale?.languageTag?.split(/[-_]/)[0]?.toLowerCase() ??
    'pl';
  if (code === 'pl' || code.startsWith('pl')) return 'pl';
  return 'en';
}
