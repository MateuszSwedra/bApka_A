import React, { useEffect, useRef } from 'react';
import { Platform, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCaretakerGuidedTourOptional } from '../../context/CaretakerGuidedTourContext';

const TAB_BAR_CONTENT_HEIGHT = 56;

/** Cel tour dla prawdziwego paska zakładek profilu podopiecznego (faza post). */
export function CaretakerTabBarTour() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const guidedTour = useCaretakerGuidedTourOptional();
  const tabBarRef = useRef<View>(null);

  const tabBarBottom =
    Platform.OS === 'android' ? Math.max(insets.bottom, 28) : Math.max(insets.bottom, 8);
  const totalTabBarHeight = TAB_BAR_CONTENT_HEIGHT + tabBarBottom;

  useEffect(() => {
    if (!guidedTour) return;
    guidedTour.registerTarget('dependent-tabs', tabBarRef);
    return () => guidedTour.unregisterTarget('dependent-tabs');
  }, [guidedTour]);

  return (
    <View
      ref={tabBarRef}
      collapsable={false}
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        bottom: 0,
        width,
        height: totalTabBarHeight,
        zIndex: 0,
      }}
    />
  );
}
