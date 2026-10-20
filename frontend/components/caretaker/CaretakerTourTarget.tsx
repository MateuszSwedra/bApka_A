import React, { useEffect, useRef } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useCaretakerGuidedTourOptional } from '../../context/CaretakerGuidedTourContext';
import type { CaretakerTourStepId } from '../../services/caretakerTourState';

type Props = {
  stepId: CaretakerTourStepId;
  children: React.ReactNode;
  wrapStyle?: StyleProp<ViewStyle>;
};

/** Rejestruje element jako cel podświetlenia w guided tour (bez własnego overlay). */
export function CaretakerTourTarget({ stepId, children, wrapStyle }: Props) {
  const guidedTour = useCaretakerGuidedTourOptional();
  const ref = useRef<View>(null);

  useEffect(() => {
    if (!guidedTour) return;
    guidedTour.registerTarget(stepId, ref);
    return () => guidedTour.unregisterTarget(stepId);
  }, [guidedTour, stepId]);

  return (
    <View ref={ref} collapsable={false} style={wrapStyle}>
      {children}
    </View>
  );
}
