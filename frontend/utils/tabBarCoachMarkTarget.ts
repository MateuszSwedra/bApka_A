import { Platform } from 'react-native';
import type { CoachMarkTarget } from '../components/caretaker/CaretakerCoachMarkOverlay';

export const TAB_BAR_CONTENT_HEIGHT = 56;

export function getTabBarBottomInset(bottomInset: number): number {
  return Platform.OS === 'android' ? Math.max(bottomInset, 28) : Math.max(bottomInset, 8);
}

export function getTabBarTotalHeight(bottomInset: number): number {
  return TAB_BAR_CONTENT_HEIGHT + getTabBarBottomInset(bottomInset);
}

/** Współrzędne dolnego paska zakładek (Expo Router Tabs). */
export function getTabBarCoachMarkTarget(
  width: number,
  height: number,
  bottomInset: number,
): CoachMarkTarget {
  const totalTabBarHeight = getTabBarTotalHeight(bottomInset);
  return {
    x: 0,
    y: height - totalTabBarHeight,
    width,
    height: totalTabBarHeight,
  };
}
