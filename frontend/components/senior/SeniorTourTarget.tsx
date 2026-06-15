import React, { useEffect, useRef } from 'react';
import { View, type ViewStyle } from 'react-native';
import { useSeniorGuidedTourOptional } from '../../context/SeniorGuidedTourContext';
import type { SeniorTourStepId } from '../../services/seniorTourState';

type Props = {
  stepId: SeniorTourStepId;
  children: React.ReactNode;
  wrapStyle?: ViewStyle;
};

/** Rejestruje element jako cel podświetlenia w guided tour (bez własnego overlay). */
export function SeniorTourTarget({ stepId, children, wrapStyle }: Props) {
  const guidedTour = useSeniorGuidedTourOptional();
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
