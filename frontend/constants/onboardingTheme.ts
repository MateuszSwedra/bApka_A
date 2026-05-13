/**
 * Paleta onboardingu — ta sama baza co `Theme` w `theme.ts` (spójna marka w całej aplikacji).
 */
export const OnboardingPalette = {
  /** Główne tło ekranów */
  background: '#F9F3EF',
  /** Elementy dekoracyjne / drugi plan */
  surfaceMuted: '#D2C1B6',
  surface: '#FFFFFF',
  textPrimary: '#1B3C53',
  textSecondary: 'rgba(27, 60, 83, 0.65)',
  /** Średni ton marki (gradient + akcenty) */
  primary: '#456882',
  /** Ciemny ton marki */
  primaryDark: '#1B3C53',
  /** Alias pod istniejące importy `navy` */
  navy: '#1B3C53',
  /** Małe akcenty (obramowania, ikony) */
  accent: '#E9A43D',
  /** Alias pod istniejące importy `orange` */
  orange: '#E9A43D',
  border: 'rgba(27, 60, 83, 0.14)',
} as const;

/** Główny motyw marki — gradient */
export const OnboardingGradient = {
  colors: ['#456882', '#1B3C53'] as const,
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
};
