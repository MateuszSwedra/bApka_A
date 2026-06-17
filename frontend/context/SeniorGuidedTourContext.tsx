import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform, useWindowDimensions, type View } from 'react-native';
import type { RefObject } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useAuth } from './AuthContext';
import { useCaretakerTourScrollLock } from './CaretakerTourLockContext';
import { getStoredRole } from '../services/sessionStorage';
import {
  isSeniorTourComplete,
  isSeniorTourSkipped,
  markSeniorTourStepsSeen,
  setSeniorTourComplete,
  skipSeniorTour,
  type SeniorTourStepId,
} from '../services/seniorTourState';
import {
  getSeniorGuidedTourSteps,
  type HybridTourTab,
  type SeniorGuidedTourStep,
} from '../components/tour/seniorTourPhases';
import { DriverTourOverlay } from '../components/tour/DriverTourOverlay';
import type { CoachMarkTarget } from '../components/caretaker/CaretakerCoachMarkOverlay';
import {
  delay,
  ensureCoachMarkTargetVisible,
  isCoachMarkHighlightVisible,
  measureTargetStable,
} from '../utils/ensureCoachMarkTargetVisible';
import { getTabBarCoachMarkTarget } from '../utils/tabBarCoachMarkTarget';

type SeniorGuidedTourContextValue = {
  active: boolean;
  registerTarget: (stepId: SeniorTourStepId, ref: RefObject<View | null>) => void;
  unregisterTarget: (stepId: SeniorTourStepId) => void;
  tryStartTour: () => void;
  isStepInActiveGuidedTour: (stepId: SeniorTourStepId) => boolean;
};

const SeniorGuidedTourContext = createContext<SeniorGuidedTourContextValue | null>(null);

const MAX_REVEAL_ATTEMPTS = 10;
const TAB_NAV_DELAY_MS = Platform.OS === 'web' ? 200 : 320;

function hasMeaningfulTargetShift(
  prev: CoachMarkTarget | null,
  next: CoachMarkTarget,
): boolean {
  if (!prev) return true;
  return (
    Math.abs(prev.x - next.x) > 1 ||
    Math.abs(prev.y - next.y) > 1 ||
    Math.abs(prev.width - next.width) > 1 ||
    Math.abs(prev.height - next.height) > 1
  );
}

function navigateToHybridTab(tab: HybridTourTab): void {
  const base = '/(hybrid)/(tabs)' as const;
  switch (tab) {
    case 'index':
      router.navigate(base);
      break;
    case 'calendar':
      router.navigate(`${base}/calendar` as never);
      break;
    case 'treatments':
      router.navigate(`${base}/treatments` as never);
      break;
    case 'insights':
      router.navigate(`${base}/insights` as never);
      break;
    default:
      break;
  }
}

export function SeniorGuidedTourProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { userRole, isReady } = useAuth();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [steps] = useState<SeniorGuidedTourStep[]>(() => getSeniorGuidedTourSteps());
  const [target, setTarget] = useState<CoachMarkTarget | null>(null);
  const [storedRole, setStoredRole] = useState<string | null>(null);

  const targetsRef = useRef<Map<SeniorTourStepId, RefObject<View | null>>>(new Map());
  const revealGenerationRef = useRef(0);

  useEffect(() => {
    void getStoredRole().then(setStoredRole);
  }, []);

  const registerTarget = useCallback(
    (stepId: SeniorTourStepId, ref: RefObject<View | null>) => {
      targetsRef.current.set(stepId, ref);
    },
    [],
  );

  const unregisterTarget = useCallback((stepId: SeniorTourStepId) => {
    targetsRef.current.delete(stepId);
  }, []);

  const currentStep = steps[stepIndex] ?? null;

  const revealCurrentStep = useCallback(async (): Promise<void> => {
    if (!currentStep) return;

    const generation = revealGenerationRef.current + 1;
    revealGenerationRef.current = generation;

    if (currentStep.tooltipLayoutMode === 'screenCenter' || !currentStep.targetStepId) {
      setTarget(null);
      return;
    }

    if (currentStep.usesProgrammaticTabBar) {
      setTarget(getTabBarCoachMarkTarget(width, height, insets.bottom));
      return;
    }

    const scrollOptions = {
      windowHeight: height,
      insets: { top: insets.top, bottom: insets.bottom },
      placement: currentStep.placement ?? 'auto',
      tooltipGap: currentStep.tooltipGap,
      reserveBottom: currentStep.reserveBottom ?? 72,
      tooltipEstimateHeight: currentStep.tooltipHeightEstimate,
    };

    for (let attempt = 0; attempt < MAX_REVEAL_ATTEMPTS; attempt += 1) {
      if (revealGenerationRef.current !== generation) return;

      const targetRef = targetsRef.current.get(currentStep.targetStepId);
      if (!targetRef?.current) {
        await delay(Platform.OS === 'web' ? 80 : 120);
        continue;
      }

      const measured = await ensureCoachMarkTargetVisible(targetRef, scrollOptions);
      if (revealGenerationRef.current !== generation) return;

      if (measured && isCoachMarkHighlightVisible(measured, scrollOptions)) {
        setTarget(measured);
        return;
      }

      if (attempt < MAX_REVEAL_ATTEMPTS - 1) {
        await delay(Platform.OS === 'web' ? 60 : 80);
      }
    }

    if (revealGenerationRef.current === generation) {
      if (currentStep.tooltipLayoutMode === 'screenCenterWithTarget') {
        const targetRef = targetsRef.current.get(currentStep.targetStepId);
        if (targetRef?.current) {
          targetRef.current.measureInWindow((x, y, w, h) => {
            if (w > 0 && h > 0) {
              setTarget({ x, y, width: w, height: h });
            }
          });
          return;
        }
      }
      setTarget(null);
    }
  }, [currentStep, height, insets.top, insets.bottom, width]);

  useEffect(() => {
    if (!active || !currentStep?.navigateToTab) return;
    navigateToHybridTab(currentStep.navigateToTab);
  }, [active, currentStep, stepIndex]);

  useEffect(() => {
    if (!active || !currentStep) return;

    setTarget(null);
    revealGenerationRef.current += 1;

    const needsTabNav = currentStep.navigateToTab != null;
    const startDelay = needsTabNav
      ? TAB_NAV_DELAY_MS
      : Platform.OS === 'web'
        ? 80
        : 120;

    const timerId = setTimeout(() => {
      void revealCurrentStep();
    }, startDelay);

    return () => clearTimeout(timerId);
  }, [active, currentStep, revealCurrentStep, stepIndex]);

  useEffect(() => {
    if (!active || !currentStep?.targetStepId || currentStep.tooltipLayoutMode === 'screenCenter') {
      return;
    }
    if (currentStep.usesProgrammaticTabBar) {
      return;
    }

    let cancelled = false;
    const targetRef = targetsRef.current.get(currentStep.targetStepId);
    if (!targetRef?.current) return;

    const tick = () => {
      void (async () => {
        const measured = await measureTargetStable(targetRef, 4, undefined, insets.top);
        if (!measured || cancelled) return;
        setTarget(prev => (hasMeaningfulTargetShift(prev, measured) ? measured : prev));
      })();
    };

    tick();
    const intervalId = setInterval(tick, Platform.OS === 'web' ? 200 : 260);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [active, currentStep, insets.top]);

  const finishTour = useCallback(async () => {
    const stepIds = steps.flatMap((s) => s.markSeenStepIds ?? []);
    if (stepIds.length > 0) {
      await markSeniorTourStepsSeen(stepIds);
    }
    await setSeniorTourComplete();

    revealGenerationRef.current += 1;
    setActive(false);
    setStepIndex(0);
    setTarget(null);
  }, [steps]);

  const handleSkip = useCallback(async () => {
    revealGenerationRef.current += 1;
    await skipSeniorTour();
    setActive(false);
    setStepIndex(0);
    setTarget(null);
  }, []);

  const handleNext = useCallback(async () => {
    if (!currentStep) return;

    const seenIds = currentStep.markSeenStepIds ?? [];
    if (seenIds.length > 0) {
      await markSeniorTourStepsSeen(seenIds);
    }

    if (stepIndex >= steps.length - 1) {
      await finishTour();
      return;
    }

    setStepIndex((i) => i + 1);
  }, [currentStep, finishTour, stepIndex, steps.length]);

  const handlePrev = useCallback(() => {
    if (stepIndex <= 0) return;
    setStepIndex((i) => i - 1);
  }, [stepIndex]);

  const tryStartTour = useCallback(() => {
    void (async () => {
      if (active) return;
      if (!isReady) return;

      const role = userRole ?? storedRole ?? (await getStoredRole());
      if (role !== 'HYBRID') return;
      if (await isSeniorTourSkipped()) return;
      if (await isSeniorTourComplete()) return;

      setStepIndex(0);
      setActive(true);
    })();
  }, [active, isReady, storedRole, userRole]);

  const isStepInActiveGuidedTour = useCallback(
    (stepId: SeniorTourStepId) => {
      if (!active || !currentStep?.targetStepId) return false;
      return currentStep.targetStepId === stepId;
    },
    [active, currentStep?.targetStepId],
  );

  const contextValue = useMemo(
    () => ({
      active,
      registerTarget,
      unregisterTarget,
      tryStartTour,
      isStepInActiveGuidedTour,
    }),
    [active, registerTarget, unregisterTarget, tryStartTour, isStepInActiveGuidedTour],
  );

  useCaretakerTourScrollLock(active);

  const reserveBottom = currentStep?.reserveBottom ?? 72;

  return (
    <SeniorGuidedTourContext.Provider value={contextValue}>
      {children}
      {active && currentStep ? (
        <DriverTourOverlay
          visible
          target={target}
          title={t(currentStep.titleKey)}
          body={t(currentStep.bodyKey)}
          placement={currentStep.placement}
          tooltipLayoutMode={currentStep.tooltipLayoutMode}
          showTargetHighlight
          reserveBottom={reserveBottom}
          clearanceAboveHighlight={currentStep.clearanceAboveHighlight}
          tooltipHeightEstimate={currentStep.tooltipHeightEstimate}
          tooltipGap={currentStep.tooltipGap}
          stepIndex={stepIndex}
          totalSteps={steps.length}
          onNext={() => void handleNext()}
          onPrev={stepIndex > 0 ? handlePrev : undefined}
          onSkip={() => void handleSkip()}
          maskId={`senior-guided-${currentStep.id}`}
          progressKey="senior.tour.guided.progress"
          skipKey="senior.tour.guided.skip"
          prevKey="senior.tour.guided.prev"
          nextKey="senior.tour.guided.next"
          doneKey="senior.tour.guided.done"
        />
      ) : null}
    </SeniorGuidedTourContext.Provider>
  );
}

export function useSeniorGuidedTour(): SeniorGuidedTourContextValue {
  const ctx = useContext(SeniorGuidedTourContext);
  if (!ctx) {
    throw new Error('useSeniorGuidedTour must be used within SeniorGuidedTourProvider');
  }
  return ctx;
}

export function useSeniorGuidedTourOptional(): SeniorGuidedTourContextValue | null {
  return useContext(SeniorGuidedTourContext);
}
