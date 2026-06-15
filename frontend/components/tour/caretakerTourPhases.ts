import type { CaretakerTourStepId } from '../../services/caretakerTourState';

export type CaretakerGuidedTourPhase = 'pre' | 'post';

export type DependentTourTab = 'index' | 'calendar' | 'treatments' | 'insights';

export type CaretakerGuidedTourStep = {
  id: string;
  titleKey: string;
  bodyKey: string;
  targetStepId?: CaretakerTourStepId;
  markSeenStepIds?: CaretakerTourStepId[];
  placement?: 'auto' | 'top' | 'bottom';
  tooltipLayoutMode?: 'anchor' | 'screenCenter';
  reserveBottom?: number;
  clearanceAboveHighlight?: number;
  tooltipHeightEstimate?: number;
  tooltipGap?: number;
  /** Podgląd zakładek na dashboardzie (faza pre). */
  usesMockTabs?: boolean;
  /** Automatyczne przejście na zakładkę profilu (faza post). */
  navigateToTab?: DependentTourTab;
};

/** Przed dodaniem podopiecznego — panel główny + podgląd zakładek. */
export const CARETAKER_PRE_TOUR_STEPS: CaretakerGuidedTourStep[] = [
  {
    id: 'pre-welcome',
    titleKey: 'caretaker.tour.guided.preWelcome.title',
    bodyKey: 'caretaker.tour.guided.preWelcome.body',
    tooltipLayoutMode: 'screenCenter',
    tooltipHeightEstimate: 220,
  },
  {
    id: 'pre-add-dependent',
    titleKey: 'caretaker.tour.dashboardAddDependent.title',
    bodyKey: 'caretaker.tour.dashboardAddDependent.body',
    targetStepId: 'dashboard-add-dependent',
    markSeenStepIds: ['dashboard-add-dependent', 'pairing-pin'],
    placement: 'top',
    tooltipGap: 44,
    reserveBottom: 0,
    tooltipHeightEstimate: 200,
  },
  {
    id: 'pre-sounds',
    titleKey: 'caretaker.tour.dashboardSounds.title',
    bodyKey: 'caretaker.tour.dashboardSounds.body',
    targetStepId: 'dashboard-sounds',
    markSeenStepIds: ['dashboard-sounds'],
    placement: 'bottom',
    reserveBottom: 0,
    tooltipHeightEstimate: 200,
  },
  {
    id: 'pre-tabs-preview',
    titleKey: 'caretaker.tour.dependentTabs.title',
    bodyKey: 'caretaker.tour.guided.tabsPreview.body',
    targetStepId: 'dependent-tabs',
    markSeenStepIds: ['dependent-tabs'],
    usesMockTabs: true,
    placement: 'top',
    clearanceAboveHighlight: 24,
    reserveBottom: 88,
    tooltipHeightEstimate: 240,
  },
];

/** Po dodaniu podopiecznego — ciągły tour na prawdziwym profilu z auto-nawigacją. */
export const CARETAKER_POST_TOUR_STEPS: CaretakerGuidedTourStep[] = [
  {
    id: 'post-welcome',
    titleKey: 'caretaker.tour.guided.postWelcome.title',
    bodyKey: 'caretaker.tour.guided.postWelcome.body',
    tooltipLayoutMode: 'screenCenter',
    tooltipHeightEstimate: 220,
    navigateToTab: 'index',
  },
  {
    id: 'post-tabs',
    titleKey: 'caretaker.tour.dependentTabs.title',
    bodyKey: 'caretaker.tour.dependentTabs.body',
    targetStepId: 'dependent-tabs',
    markSeenStepIds: ['dependent-tabs'],
    placement: 'top',
    clearanceAboveHighlight: 24,
    reserveBottom: 72,
    tooltipHeightEstimate: 240,
    navigateToTab: 'index',
  },
  {
    id: 'post-settings',
    titleKey: 'caretaker.tour.dependentSettings.title',
    bodyKey: 'caretaker.tour.dependentSettings.body',
    targetStepId: 'dependent-settings',
    markSeenStepIds: ['dependent-settings'],
    placement: 'bottom',
    reserveBottom: 72,
    tooltipHeightEstimate: 200,
    navigateToTab: 'index',
  },
  {
    id: 'post-calendar',
    titleKey: 'caretaker.tour.calendarFab.title',
    bodyKey: 'caretaker.tour.calendarFab.body',
    targetStepId: 'calendar-fab',
    markSeenStepIds: ['calendar-fab'],
    placement: 'top',
    reserveBottom: 72,
    tooltipHeightEstimate: 200,
    navigateToTab: 'calendar',
  },
  {
    id: 'post-treatments',
    titleKey: 'caretaker.tour.treatmentsAdd.title',
    bodyKey: 'caretaker.tour.treatmentsAdd.body',
    targetStepId: 'treatments-add',
    markSeenStepIds: ['treatments-add'],
    placement: 'bottom',
    reserveBottom: 72,
    tooltipHeightEstimate: 200,
    navigateToTab: 'treatments',
  },
  {
    id: 'post-insights',
    titleKey: 'caretaker.tour.insightsRange.title',
    bodyKey: 'caretaker.tour.insightsRange.body',
    targetStepId: 'insights-range',
    markSeenStepIds: ['insights-range'],
    placement: 'bottom',
    reserveBottom: 72,
    tooltipHeightEstimate: 200,
    navigateToTab: 'insights',
  },
];

export function getPreTourSteps(): CaretakerGuidedTourStep[] {
  return CARETAKER_PRE_TOUR_STEPS;
}

export function getPostTourSteps(): CaretakerGuidedTourStep[] {
  return CARETAKER_POST_TOUR_STEPS;
}

export function stepUsesMockTabs(step: CaretakerGuidedTourStep | null | undefined): boolean {
  return step?.usesMockTabs === true;
}

/** @deprecated */
export function getTourStepsForScreen(_screen: 'dashboard' | 'pairing'): CaretakerGuidedTourStep[] {
  return getPreTourSteps();
}

/** @deprecated */
export function getPreTourStepsForScreen(_screen: 'dashboard' | 'pairing'): CaretakerGuidedTourStep[] {
  return getPreTourSteps();
}
