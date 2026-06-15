import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '../constants/theme';
import {
  getNavigationBarBottomInset,
  getTabBarTotalHeight,
} from './safeAreaInsets';

type FabBottomOptions = {
  /** FAB nad dolną nawigacją zakładek (profil podopiecznego). */
  aboveTabBar?: boolean;
};

/** Odległość FAB od dołu ekranu (safe area lub nad tab barem). */
export function useFabBottomOffset(options?: FabBottomOptions): number {
  const insets = useSafeAreaInsets();
  const minInset = Platform.OS === 'android' ? 28 : 12;

  if (options?.aboveTabBar) {
    return getTabBarTotalHeight(insets.bottom) + Theme.spacing.xs;
  }

  return Math.max(getNavigationBarBottomInset(insets.bottom), minInset) + Theme.spacing.xl;
}
