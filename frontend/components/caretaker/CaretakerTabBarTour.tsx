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
import {
  CaretakerCoachMarkOverlay,
  type CoachMarkTarget,
} from './CaretakerCoachMarkOverlay';

/** Zgodne z tabBarStyle w dependent/[id]/_layout.tsx */
const TAB_BAR_CONTENT_HEIGHT = 56;

export function CaretakerTabBarTour() {
  const { t } = useTranslation();
  const { userRole } = useAuth();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [target, setTarget] = useState<CoachMarkTarget | null>(null);

  const tabBarBottom =
    Platform.OS === 'android' ? Math.max(insets.bottom, 28) : Math.max(insets.bottom, 8);
  const totalTabBarHeight = TAB_BAR_CONTENT_HEIGHT + tabBarBottom;

  const updateTarget = useCallback(() => {
    setTarget({
      x: 0,
      y: height - totalTabBarHeight,
      width,
      height: totalTabBarHeight,
    });
  }, [height, totalTabBarHeight, width]);

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
      maskId="coach-dependent-tabs"
    />
  );
}
