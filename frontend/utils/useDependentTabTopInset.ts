import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '../constants/theme';

/** Górny odstęp zakładek bez wspólnego paska profilu (status bar + mały margines). */
export function useDependentTabTopInset(): number {
  const insets = useSafeAreaInsets();
  const minTop = Platform.OS === 'web' ? 12 : Platform.OS === 'android' ? 8 : 0;
  return Math.max(insets.top, minTop) + Theme.spacing.s;
}
