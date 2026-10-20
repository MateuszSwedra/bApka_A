/**
 * Globalny motyw UI - wartości zsynchronizowane z onboardingiem / logowaniem
 * (`onboardingTheme.ts`: niebieski #456882 / #1B3C53, pomarańcz #E9A43D, tło #F9F3EF).
 * Nazwy `primaryLime*` zachowane dla kompatybilności z istniejącymi importami (dawniej zieleń).
 */
export const Theme = {
  colors: {
    primaryLime: '#C8E0F0',
    primaryLimeDark: '#456882',
    accentOrange: '#E9A43D',
    background: '#FFFFFF',
    surfaceGrey: '#F9F3EF',
    surfaceWhite: '#FFFFFF',
    textDark: '#1B3C53',
    textLight: 'rgba(27, 60, 83, 0.65)',
    border: 'rgba(27, 60, 83, 0.14)',
    success: '#456882',
    badgeSuccessBackground: 'rgba(69, 104, 130, 0.14)',
    badgeWarningBackground: 'rgba(233, 164, 61, 0.2)',
    surfaceSoftOrange: 'rgba(233, 164, 61, 0.18)',
    surfaceWarmHighlight: '#FFF8F6',
    schedulePendingBackground: 'rgba(233, 164, 61, 0.14)',
    schedulePendingText: '#B8761A',
    shadowNeutral: 'rgba(27, 60, 83, 0.12)',
    /** Tło siatki kalendarza opiekuna (jaśniejsze, między bielą a beżem). */
    calendarCanvas: '#F7F6F4',
    /** Kafelek dnia - beż (spójny z surfaceGrey). */
    calendarCell: '#F9F3EF',
  },
  typography: {
    huge: 48,
    largeTitle: 32,
    title: 20,
    body: 16,
    caption: 14,
    small: 12,
  },
  borderRadius: {
    small: 8,
    medium: 12,
    large: 16,
    xlarge: 24,
    round: 9999,
  },
  spacing: {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
    xxl: 48,
  },
};
