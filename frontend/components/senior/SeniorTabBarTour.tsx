import React, { useCallback, useEffect, useState } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useCaretakerTourScrollLock } from '../../context/CaretakerTourLockContext';
import { getStoredRole } from '../../services/sessionStorage';
import { getSeniorTourStepSeen, setSeniorTourStepSeen } from '../../services/seniorTourState';
import { CaretakerCoachMarkOverlay, type CoachMarkTarget } from '../caretaker/CaretakerCoachMarkOverlay';

const TAB_BAR_CONTENT_HEIGHT = 56;
const POLL_MS = 120;

export function SeniorTabBarTour() {
  const { t } = useTranslation();
  const { userRole, isReady } = useAuth();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [target, setTarget] = useState<CoachMarkTarget | null>(null);
  const [storedRole, setStoredRole] = useState<string | null>(null);

  useEffect(() => {
    void getStoredRole().then(setStoredRole);
  }, []);

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

  const tryShow = useCallback(async () => {
    if (visible) return;
    if (!isReady) return;

    const role = userRole ?? storedRole ?? (await getStoredRole());
    if (role !== 'HYBRID') return;
    if (await getSeniorTourStepSeen('hybrid-tabs')) return;
    if (!(await getSeniorTourStepSeen('today-plan'))) return;

    updateTarget();
    setVisible(true);
  }, [isReady, storedRole, updateTarget, userRole, visible]);

  useFocusEffect(
    useCallback(() => {
      void tryShow();
      const intervalId = setInterval(() => {
        void tryShow();
      }, POLL_MS);
      return () => clearInterval(intervalId);
    }, [tryShow]),
  );

  useEffect(() => {
    if (visible) updateTarget();
  }, [visible, width, height, updateTarget]);

  const dismiss = useCallback(async () => {
    await setSeniorTourStepSeen('hybrid-tabs');
    setVisible(false);
  }, []);

  useCaretakerTourScrollLock(visible);

  return (
    <CaretakerCoachMarkOverlay
      visible={visible}
      target={target}
      title={t('senior.tour.hybridTabs.title')}
      body={t('senior.tour.hybridTabs.body')}
      placement="top"
      clearanceAboveHighlight={24}
      tooltipHeightEstimate={220}
      reserveBottom={totalTabBarHeight}
      onDismiss={() => void dismiss()}
      maskId="senior-coach-hybrid-tabs"
    />
  );
}
