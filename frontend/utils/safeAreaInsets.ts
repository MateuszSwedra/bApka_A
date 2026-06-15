import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '../constants/theme';

/** Wysokość rzędu z ikonami i etykietami (bez strefy systemowej). */
export const TAB_BAR_CONTENT_HEIGHT = 56;
export const TAB_BAR_TOP_PADDING = 8;

/** Kolor paska pod przyciskami nawigacji systemowej (Android). */
export const ANDROID_NAV_BAR_COLOR = '#000000';

/** Bufor nad raportowanym insetem — ogonki liter / zaokrąglenia ekranu. */
export const TAB_BAR_NAV_EXTRA_BUFFER = Platform.OS === 'android' ? 8 : 4;

/** Dolna strefa pod ikonami tab bara (nad przyciskami systemowymi). */
export function getTabBarNavSpacerHeight(insetsBottom: number): number {
  if (Platform.OS !== 'android') {
    return Math.max(insetsBottom, 8);
  }
  const base = insetsBottom > 0 ? insetsBottom : 28;
  return base + TAB_BAR_NAV_EXTRA_BUFFER;
}

export function getNavigationBarBottomInset(insetsBottom: number): number {
  return getTabBarNavSpacerHeight(insetsBottom);
}

export function getTabBarTotalHeight(insetsBottom: number): number {
  return TAB_BAR_CONTENT_HEIGHT + TAB_BAR_TOP_PADDING + getTabBarNavSpacerHeight(insetsBottom);
}

export function getScreenBottomPadding(
  insetsBottom: number,
  extra = Theme.spacing.m,
): number {
  return getTabBarNavSpacerHeight(insetsBottom) + extra;
}

export function getTabScreenScrollBottomPadding(
  insetsBottom: number,
  extra = Theme.spacing.l,
): number {
  return getTabBarTotalHeight(insetsBottom) + extra;
}

export function useScreenBottomPadding(extra = Theme.spacing.m): number {
  const insets = useSafeAreaInsets();
  return getScreenBottomPadding(insets.bottom, extra);
}

export function useTabScreenScrollBottomPadding(extra = Theme.spacing.l): number {
  const insets = useSafeAreaInsets();
  return getTabScreenScrollBottomPadding(insets.bottom, extra);
}
