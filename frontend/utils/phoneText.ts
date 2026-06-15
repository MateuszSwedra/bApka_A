import { Platform, type TextProps, type TextStyle } from 'react-native';

/** Zapobiega łamaniu słów w środku (Android/iOS) — bez zmniejszania czcionki. */
export function phoneIntactWordsTextProps(): Pick<
  TextProps,
  'textBreakStrategy' | 'lineBreakStrategyIOS'
> {
  if (Platform.OS === 'android') {
    return { textBreakStrategy: 'simple' };
  }
  if (Platform.OS === 'ios') {
    return { lineBreakStrategyIOS: 'standard' };
  }
  return {};
}

/** Style pomocnicze dla etykiet na telefonie (np. kafelki seniora). */
export function phoneIntactWordsStyle(): TextStyle {
  if (Platform.OS === 'web') return {};
  if (Platform.OS === 'android') {
    return { textBreakStrategy: 'simple' };
  }
  return { lineBreakStrategyIOS: 'standard' };
}
