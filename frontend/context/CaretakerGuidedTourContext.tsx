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
  isCaretakerPostTourComplete,
  isCaretakerPreTourComplete,
  isCaretakerTourSkipped,
  markCaretakerTourStepsSeen,
  setCaretakerPostTourComplete,
  setCaretakerPreTourComplete,
  skipCaretakerTour,
  type CaretakerTourStepId,
} from '../services/caretakerTourState';
import {
  CARETAKER_POST_TOUR_STEPS,
  CARETAKER_PRE_TOUR_STEPS,
  type CaretakerGuidedTourPhase,
  type CaretakerGuidedTourStep,
  type DependentTourTab,
  getPostTourSteps,
  getPreTourSteps,
  stepUsesMockTabs,
} from '../components/tour/caretakerTourPhases';
import { DriverTourOverlay } from '../components/tour/DriverTourOverlay';
import type { CoachMarkTarget } from '../components/caretaker/CaretakerCoachMarkOverlay';
import {
  delay,
  ensureCoachMarkTargetVisible,
  isCoachMarkHighlightVisible,
} from '../utils/ensureCoachMarkTargetVisible';
import { getTabBarCoachMarkTarget } from '../utils/tabBarCoachMarkTarget';

type CaretakerGuidedTourContextValue = {
  phase: CaretakerGuidedTourPhase | null;
  active: boolean;
  currentStepUsesMockTabs: boolean;
  registerTarget: (stepId: CaretakerTourStepId, ref: RefObject<View | null>) => void;
  unregisterTarget: (stepId: CaretakerTourStepId) => void;
  tryStartPreTour: () => void;
  tryStartPostTour: (dependentId: string) => void;
  isStepInActiveGuidedTour: (stepId: CaretakerTourStepId) => boolean;
};

const CaretakerGuidedTourContext = createContext<CaretakerGuidedTourContextValue | null>(
  null,
);

const MAX_REVEAL_ATTEMPTS = 10;
const TAB_NAV_DELAY_MS = Platform.OS === 'web' ? 200 : 320;

function navigateToDependentTab(dependentId: string, tab: DependentTourTab): void {
  const base = `/(caretaker)/dependent/${dependentId}` as const;
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

export function CaretakerGuidedTourProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { userRole, isReady } = useAuth();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [phase, setPhase] = useState<CaretakerGuidedTourPhase | null>(null);
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [steps, setSteps] = useState<CaretakerGuidedTourStep[]>([]);
  const [target, setTarget] = useState<CoachMarkTarget | null>(null);
  const [storedRole, setStoredRole] = useState<string | null>(null);

  const targetsRef = useRef<Map<CaretakerTourStepId, RefObject<View | null>>>(new Map());
  const revealGenerationRef = useRef(0);
  const dependentIdRef = useRef<string | null>(null);

  useEffect(() => {
    void getStoredRole().then(setStoredRole);
  }, []);

  const registerTarget = useCallback(
    (stepId: CaretakerTourStepId, ref: RefObject<View | null>) => {
      targetsRef.current.set(stepId, ref);
    },
    [],
  );

  const unregisterTarget = useCallback((stepId: CaretakerTourStepId) => {
    targetsRef.current.delete(stepId);
  }, []);

  const currentStep = steps[stepIndex] ?? null;
  const currentStepUsesMockTabs = stepUsesMockTabs(currentStep);

  const revealCurrentStep = useCallback(async (): Promise<void> => {
    if (!currentStep) return;

    const generation = revealGenerationRef.current + 1;
    revealGenerationRef.current = generation;

    if (currentStep.tooltipLayoutMode === 'screenCenter' || !currentStep.targetStepId) {
      setTarget(null);
      return;
    }

    if (
      currentStep.targetStepId === 'dependent-tabs' &&
      !currentStepUsesMockTabs
    ) {
      setTarget(getTabBarCoachMarkTarget(width, height, insets.bottom));
      return;
    }

    const scrollOptions = {
      windowHeight: height,
      insets: { top: insets.top, bottom: insets.bottom },
      placement: currentStep.placement ?? 'auto',
      tooltipGap: currentStep.tooltipGap,
      reserveBottom: currentStep.reserveBottom ?? 0,
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
      setTarget(null);
    }
  }, [currentStep, currentStepUsesMockTabs, height, insets.top, insets.bottom, width]);

  useEffect(() => {
    if (!active || !currentStep || phase !== 'post') return;
    if (!currentStep.navigateToTab || !dependentIdRef.current) return;

    navigateToDependentTab(dependentIdRef.current, currentStep.navigateToTab);
  }, [active, phase, currentStep, stepIndex]);

  useEffect(() => {
    if (!active || !currentStep) return;

    setTarget(null);
    revealGenerationRef.current += 1;

    const needsTabNav = phase === 'post' && currentStep.navigateToTab != null;
    const startDelay = needsTabNav
      ? TAB_NAV_DELAY_MS
      : currentStepUsesMockTabs
        ? Platform.OS === 'web'
          ? 160
          : 220
        : Platform.OS === 'web'
          ? 80
          : 120;

    const timerId = setTimeout(() => {
      void revealCurrentStep();
    }, startDelay);

    return () => clearTimeout(timerId);
  }, [active, currentStep, currentStepUsesMockTabs, phase, revealCurrentStep, stepIndex]);

  const finishPhase = useCallback(async () => {
    const phaseSteps = phase === 'pre' ? CARETAKER_PRE_TOUR_STEPS : CARETAKER_POST_TOUR_STEPS;
    const stepIds = phaseSteps.flatMap((s) => s.markSeenStepIds ?? []);
    if (stepIds.length > 0) {
      await markCaretakerTourStepsSeen(stepIds);
    }

    if (phase === 'pre') {
      await setCaretakerPreTourComplete();
    } else if (phase === 'post') {
      await setCaretakerPostTourComplete();
    }

    revealGenerationRef.current += 1;
    setActive(false);
    setPhase(null);
    setSteps([]);
    setStepIndex(0);
    setTarget(null);
    dependentIdRef.current = null;
  }, [phase]);

  const handleSkip = useCallback(async () => {
    revealGenerationRef.current += 1;
    await skipCaretakerTour();
    setActive(false);
    setPhase(null);
    setSteps([]);
    setStepIndex(0);
    setTarget(null);
    dependentIdRef.current = null;
  }, []);

  const handleNext = useCallback(async () => {
    if (!currentStep) return;

    const seenIds = currentStep.markSeenStepIds ?? [];
    if (seenIds.length > 0) {
      await markCaretakerTourStepsSeen(seenIds);
    }

    if (stepIndex >= steps.length - 1) {
      await finishPhase();
      return;
    }

    setStepIndex((i) => i + 1);
  }, [currentStep, finishPhase, stepIndex, steps.length]);

  const handlePrev = useCallback(() => {
    if (stepIndex <= 0) return;
    setStepIndex((i) => i - 1);
  }, [stepIndex]);

  const tryStartPreTour = useCallback(() => {
    void (async () => {
      if (active) return;
      if (!isReady) return;

      const role = userRole ?? storedRole ?? (await getStoredRole());
      if (role !== 'CARETAKER') return;
      if (await isCaretakerTourSkipped()) return;
      if (await isCaretakerPreTourComplete()) return;

      dependentIdRef.current = null;
      setPhase('pre');
      setSteps(getPreTourSteps());
      setStepIndex(0);
      setActive(true);
    })();
  }, [active, isReady, storedRole, userRole]);

  const tryStartPostTour = useCallback(
    (dependentId: string) => {
      void (async () => {
        if (active) return;
        if (!isReady) return;
        if (!dependentId) return;

        const role = userRole ?? storedRole ?? (await getStoredRole());
        if (role !== 'CARETAKER') return;
        if (await isCaretakerTourSkipped()) return;
        if (!(await isCaretakerPreTourComplete())) return;
        if (await isCaretakerPostTourComplete()) return;

        dependentIdRef.current = dependentId;
        setPhase('post');
        setSteps(getPostTourSteps());
        setStepIndex(0);
        setActive(true);
      })();
    },
    [active, isReady, storedRole, userRole],
  );

  const isStepInActiveGuidedTour = useCallback(
    (stepId: CaretakerTourStepId) => {
      if (!active || !currentStep?.targetStepId) return false;
      return currentStep.targetStepId === stepId;
    },
    [active, currentStep?.targetStepId],
  );

  const contextValue = useMemo(
    () => ({
      phase,
      active,
      currentStepUsesMockTabs,
      registerTarget,
      unregisterTarget,
      tryStartPreTour,
      tryStartPostTour,
      isStepInActiveGuidedTour,
    }),
    [
      phase,
      active,
      currentStepUsesMockTabs,
      registerTarget,
      unregisterTarget,
      tryStartPreTour,
      tryStartPostTour,
      isStepInActiveGuidedTour,
    ],
  );

  useCaretakerTourScrollLock(active);

  const reserveBottom =
    phase === 'post' || currentStepUsesMockTabs
      ? (currentStep?.reserveBottom ?? 72)
      : (currentStep?.reserveBottom ?? 0);

  return (
    <CaretakerGuidedTourContext.Provider value={contextValue}>
      {children}
      {active && currentStep ? (
        <DriverTourOverlay
          visible
          target={target}
          title={t(currentStep.titleKey)}
          body={t(currentStep.bodyKey)}
          placement={currentStep.placement}
          tooltipLayoutMode={currentStep.tooltipLayoutMode}
          reserveBottom={reserveBottom}
          clearanceAboveHighlight={currentStep.clearanceAboveHighlight}
          tooltipHeightEstimate={currentStep.tooltipHeightEstimate}
          tooltipGap={currentStep.tooltipGap}
          stepIndex={stepIndex}
          totalSteps={steps.length}
          onNext={() => void handleNext()}
          onPrev={stepIndex > 0 ? handlePrev : undefined}
          onSkip={() => void handleSkip()}
          maskId={`guided-tour-${phase}-${currentStep.id}`}
        />
      ) : null}
    </CaretakerGuidedTourContext.Provider>
  );
}

export function useCaretakerGuidedTour(): CaretakerGuidedTourContextValue {
  const ctx = useContext(CaretakerGuidedTourContext);
  if (!ctx) {
    throw new Error('useCaretakerGuidedTour must be used within CaretakerGuidedTourProvider');
  }
  return ctx;
}

export function useCaretakerGuidedTourOptional(): CaretakerGuidedTourContextValue | null {
  return useContext(CaretakerGuidedTourContext);
}

/** Pojedyncze podpowiedzi wyłączone — tylko guided tour pre/post. */
export async function shouldShowStandaloneCaretakerTourStep(): Promise<boolean> {
  return false;
}
