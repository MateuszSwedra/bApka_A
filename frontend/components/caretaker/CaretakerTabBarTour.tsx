import React, { useCallback, useEffect, useState } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useCaretakerTourScrollLock } from '../../context/CaretakerTourLockContext';
import {
  getCaretakerTourStepSeen,
  setCaretakerTourStepSeen,
} from '../../services/caretakerTourState';
import { getCoachMarkOverlayHeight } from '../../utils/coachMarkCoordinates';
import { getTabBarTotalHeight } from '../../utils/safeAreaInsets';
import {
  CaretakerCoachMarkOverlay,
  type CoachMarkTarget,
} from './CaretakerCoachMarkOverlay';

/** Zgodne z tabBarStyle w dependent/[id]/_layout.tsx */

export function CaretakerTabBarTour() {
  const { t } = useTranslation();
  const { userRole } = useAuth();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [target, setTarget] = useState<CoachMarkTarget | null>(null);

  const tabBarBottom = getTabBarTotalHeight(insets.bottom);
  const totalTabBarHeight = tabBarBottom;

  const updateTarget = useCallback(() => {
    const overlayHeight = getCoachMarkOverlayHeight(height, insets.top);
    setTarget({
      x: 0,
      y: overlayHeight - totalTabBarHeight,
      width,
      height: totalTabBarHeight,
    });
  }, [height, insets.top, totalTabBarHeight, width]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        if (userRole !== 'CARETAKER') return;
        if (await getCaretakerTourStepSeen('dependent-tabs')) return;
        setTimeout(() => {
          if (!cancelled) {
            updateTarget();
            setVisible(true);
          }
        }, Platform.OS === 'web' ? 80 : 120);
      })();
      return () => {
        cancelled = true;
      };
    }, [updateTarget, userRole]),
  );

  useEffect(() => {
    if (visible) updateTarget();
  }, [visible, width, height, updateTarget]);

  const dismiss = useCallback(async () => {
    await setCaretakerTourStepSeen('dependent-tabs');
    setVisible(false);
  }, []);

  useCaretakerTourScrollLock(visible);

  return (
    <CaretakerCoachMarkOverlay
      visible={visible}
      target={target}
      title={t('caretaker.tour.dependentTabs.title')}
      body={t('caretaker.tour.dependentTabs.body')}
      placement="top"
      clearanceAboveHighlight={24}
      tooltipHeightEstimate={240}
      reserveBottom={totalTabBarHeight}
      onDismiss={() => void dismiss()}
      onShow={() => updateTarget()}
      maskId="coach-dependent-tabs"
    />
  );
}
