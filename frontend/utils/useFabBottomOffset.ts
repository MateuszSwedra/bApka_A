import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '../constants/theme';

const TAB_BAR_HEIGHT = 56;

function tabBarSafeBottom(insetsBottom: number): number {
  return Platform.OS === 'android' ? Math.max(insetsBottom, 28) : Math.max(insetsBottom, 8);
}

type FabBottomOptions = {
  /** FAB nad dolną nawigacją zakładek (profil podopiecznego). */
  aboveTabBar?: boolean;
};

/** Odległość FAB od dołu ekranu (safe area lub nad tab barem). */
export function useFabBottomOffset(options?: FabBottomOptions): number {
  const insets = useSafeAreaInsets();
  const minInset = Platform.OS === 'android' ? 28 : 12;

  if (options?.aboveTabBar) {
    return TAB_BAR_HEIGHT + tabBarSafeBottom(insets.bottom) + Theme.spacing.m;
  }

  return Math.max(insets.bottom, minInset) + Theme.spacing.xl;
}
