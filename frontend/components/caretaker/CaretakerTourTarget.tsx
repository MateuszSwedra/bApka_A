import React, { useEffect, useRef } from 'react';
import { View, type ViewStyle } from 'react-native';
import { useCaretakerGuidedTourOptional } from '../../context/CaretakerGuidedTourContext';
import type { CaretakerTourStepId } from '../../services/caretakerTourState';

type Props = {
  stepId: CaretakerTourStepId;
  children: React.ReactNode;
  wrapStyle?: ViewStyle;
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
