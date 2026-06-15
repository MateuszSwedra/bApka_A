import { Dimensions, Platform, StatusBar } from 'react-native';

export type CoachMarkRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Modal (statusBarTranslucent) rysuje od góry ekranu fizycznego.
 * measureInWindow na Androidzie często zwraca Y względem okna aplikacji poniżej paska statusu.
 */
export function getAndroidCoachMarkYOffset(_safeAreaTop = 0): number {
  if (Platform.OS !== 'android') return 0;

  const screenH = Dimensions.get('screen').height;
  const windowH = Dimensions.get('window').height;
  const gap = screenH - windowH;
  if (gap > 4) return gap;

  // Edge-to-edge (np. S24): measureInWindow i Modal są w tej samej przestrzeni — bez korekty.
  const statusBar = StatusBar.currentHeight ?? 0;
  if (statusBar > 0 && gap > 0) return statusBar;

  return 0;
}

export function getCoachMarkOverlayHeight(windowHeight: number, safeAreaTop = 0): number {
  return windowHeight + getAndroidCoachMarkYOffset(safeAreaTop);
}

export function adjustCoachMarkTargetForOverlay(
  target: CoachMarkRect,
  safeAreaTop: number,
): CoachMarkRect {
  const offsetY = getAndroidCoachMarkYOffset(safeAreaTop);
  if (offsetY <= 0) return target;

  return {
    ...target,
    y: target.y + offsetY,
  };
}
