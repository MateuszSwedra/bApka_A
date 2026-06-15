import { useMemo, useRef } from 'react';
import { Animated, PanResponder } from 'react-native';

/** Przeciągnięcie w dół na uchwycie / karcie — zamyka bottom sheet. */
export function useBottomSheetDismiss(onDismiss: () => void, dismissThreshold = 72) {
  const translateY = useRef(new Animated.Value(0)).current;

  const panHandlers = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) =>
          g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => {
          if (g.dy > 0) translateY.setValue(g.dy);
        },
        onPanResponderRelease: (_, g) => {
          if (g.dy > dismissThreshold || g.vy > 0.45) {
            translateY.setValue(0);
            onDismiss();
            return;
          }
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            friction: 8,
            tension: 90,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        },
      }).panHandlers,
    [dismissThreshold, onDismiss, translateY],
  );

  return { panHandlers, translateY };
}
