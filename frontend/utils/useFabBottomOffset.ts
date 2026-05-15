import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '../constants/theme';

/** Odległość FAB od dołu ekranu (nad paskiem gestów systemu). */
export function useFabBottomOffset(): number {
  const insets = useSafeAreaInsets();
  const minInset = Platform.OS === 'android' ? 28 : 12;
  return Math.max(insets.bottom, minInset) + Theme.spacing.xl;
}
