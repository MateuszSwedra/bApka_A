import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '../constants/theme';
import {
  getNavigationBarBottomInset,
} from './safeAreaInsets';

type FabBottomOptions = {
  /** Ekran wewnątrz dolnych zakładek — FAB tuż nad tab barem (mała przerwa). */
  aboveTabBar?: boolean;
};

/** Mały odstęp FAB od dolnej krawędzi ekranu zakładki (tab bar jest poza tym obszarem). */
const FAB_TAB_SCREEN_GAP = 12;

/** Odległość FAB od dołu ekranu. */
export function useFabBottomOffset(options?: FabBottomOptions): number {
  const insets = useSafeAreaInsets();
  const minInset = Platform.OS === 'android' ? 28 : 12;

  if (options?.aboveTabBar) {
    return FAB_TAB_SCREEN_GAP;
  }

  return Math.max(getNavigationBarBottomInset(insets.bottom), minInset) + Theme.spacing.xl;
}
