import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  type ViewStyle,
  Platform,
  useWindowDimensions,
  type ScrollView,
} from 'react-native';
import type { RefObject } from 'react';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useCaretakerTourScroll } from '../../context/CaretakerTourScrollContext';
import { getStoredRole } from '../../services/sessionStorage';
import {
  getSeniorTourStepSeen,
  setSeniorTourStepSeen,
  type SeniorTourStepId,
} from '../../services/seniorTourState';
import {
  delay,
  ensureCoachMarkTargetVisible,
  isCoachMarkHighlightVisible,
} from '../../utils/ensureCoachMarkTargetVisible';
import { CaretakerCoachMarkOverlay, type CoachMarkTarget } from '../caretaker/CaretakerCoachMarkOverlay';
import { useCaretakerTourScrollLock } from '../../context/CaretakerTourLockContext';

type Props = {
  stepId: SeniorTourStepId;
  titleKey: string;
  bodyKey: string;
  placement?: 'auto' | 'top' | 'bottom';
  children: React.ReactNode;
  wrapStyle?: ViewStyle;
  enabled?: boolean;
  afterStepId?: SeniorTourStepId;
  measureDelayMs?: number;
  tooltipGap?: number;
  reserveBottom?: number;
  scrollRef?: RefObject<ScrollView | null>;
  contentRef?: RefObject<View | null>;
  tooltipLayoutMode?: 'anchor' | 'screenCenter';
  clearanceAboveHighlight?: number;
};

const POLL_MS = 120;
const MAX_REVEAL_ATTEMPTS = 6;
const TAB_BAR_RESERVE = 72;

export function SeniorTourAnchor({
  stepId,
  titleKey,
  bodyKey,
  placement = 'auto',
  children,
  wrapStyle,
  enabled = true,
  afterStepId,
  measureDelayMs = 0,
  tooltipGap,
  reserveBottom = TAB_BAR_RESERVE,
  scrollRef: scrollRefOverride,
  contentRef: contentRefOverride,
  tooltipLayoutMode = 'anchor',
  clearanceAboveHighlight,
}: Props) {
  const { t } = useTranslation();
  const { userRole, isReady } = useAuth();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tourScroll = useCaretakerTourScroll();
  const containerRef = useRef<View>(null);
  const [visible, setVisible] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [target, setTarget] = useState<CoachMarkTarget | null>(null);
  const [storedRole, setStoredRole] = useState<string | null>(null);
  const pendingRef = useRef(false);

  useEffect(() => {
    void getStoredRole().then(setStoredRole);
  }, []);

  const isHybrid = userRole === 'HYBRID' || storedRole === 'HYBRID';

  const scrollOptions = useCallback(
    () => ({
      windowHeight: height,
      insets: { top: insets.top, bottom: insets.bottom },
      placement,
      tooltipGap,
      reserveBottom,
      scrollRef: scrollRefOverride ?? tourScroll?.scrollRef,
      contentRef: contentRefOverride ?? tourScroll?.contentRef,
    }),
    [
      height,
      insets.top,
      insets.bottom,
      placement,
      tooltipGap,
      reserveBottom,
      scrollRefOverride,
      contentRefOverride,
      tourScroll?.contentRef,
      tourScroll?.scrollRef,
    ],
  );

  const revealCoachMark = useCallback(async (): Promise<boolean> => {
    setPreparing(true);
    try {
      for (let attempt = 0; attempt < MAX_REVEAL_ATTEMPTS; attempt += 1) {
        const measured = await ensureCoachMarkTargetVisible(containerRef, scrollOptions());
        if (measured && isCoachMarkHighlightVisible(measured, scrollOptions())) {
          setTarget(measured);
          setVisible(true);
          return true;
        }
        if (attempt < MAX_REVEAL_ATTEMPTS - 1) {
          await delay(Platform.OS === 'web' ? 60 : 80);
        }
      }
      return false;
    } finally {
      setPreparing(false);
    }
  }, [scrollOptions]);

  const tryShow = useCallback(async () => {
    if (!enabled || pendingRef.current || visible || preparing) {
      return;
    }

    if (!isReady) {
      return;
    }

    const role = userRole ?? storedRole ?? (await getStoredRole());
    if (role !== storedRole) {
      setStoredRole(role);
    }
    if (role !== 'HYBRID') {
      return;
    }

    const seen = await getSeniorTourStepSeen(stepId);
    if (seen) return;

    if (afterStepId) {
      const afterSeen = await getSeniorTourStepSeen(afterStepId);
      if (!afterSeen) return;
    }

    pendingRef.current = true;

    const runReveal = () => {
      void revealCoachMark().finally(() => {
        pendingRef.current = false;
      });
    };

    if (measureDelayMs <= 0) {
      runReveal();
    } else {
      setTimeout(runReveal, measureDelayMs);
    }
  }, [
    afterStepId,
    enabled,
    isReady,
    measureDelayMs,
    preparing,
    revealCoachMark,
    stepId,
    userRole,
    visible,
    storedRole,
  ]);

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
    if (!visible && !preparing && isReady && isHybrid) {
      void tryShow();
    }
  }, [isReady, isHybrid, userRole, storedRole, enabled, visible, preparing, tryShow]);

  const dismiss = useCallback(async () => {
    await setSeniorTourStepSeen(stepId);
    setVisible(false);
    setTarget(null);
  }, [stepId]);

  useCaretakerTourScrollLock(visible || preparing);

  return (
    <>
      <View ref={containerRef} collapsable={false} style={wrapStyle}>
        {children}
      </View>
      <CaretakerCoachMarkOverlay
        visible={visible}
        target={target}
        title={t(titleKey)}
        body={t(bodyKey)}
        placement={placement}
        onDismiss={() => void dismiss()}
        maskId={`senior-coach-${stepId}`}
        tooltipGap={tooltipGap}
        reserveBottom={reserveBottom}
        tooltipLayoutMode={tooltipLayoutMode}
        clearanceAboveHighlight={clearanceAboveHighlight}
      />
    </>
  );
}
