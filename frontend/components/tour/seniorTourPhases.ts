import type { SeniorTourStepId } from '../../services/seniorTourState';

export type HybridTourTab = 'index' | 'calendar' | 'treatments' | 'insights';

export type SeniorGuidedTourStep = {
  id: string;
  titleKey: string;
  bodyKey: string;
  targetStepId?: SeniorTourStepId;
  markSeenStepIds?: SeniorTourStepId[];
  placement?: 'auto' | 'top' | 'bottom';
  tooltipLayoutMode?: 'anchor' | 'screenCenter' | 'screenCenterWithTarget';
  reserveBottom?: number;
  clearanceAboveHighlight?: number;
  tooltipHeightEstimate?: number;
  tooltipGap?: number;
  usesProgrammaticTabBar?: boolean;
  navigateToTab?: HybridTourTab;
};

/** Ciągły tutorial samodzielnego podopiecznego (HYBRID). */
export const SENIOR_GUIDED_TOUR_STEPS: SeniorGuidedTourStep[] = [
  {
    id: 'welcome',
    titleKey: 'senior.tour.guided.welcome.title',
    bodyKey: 'senior.tour.guided.welcome.body',
    tooltipLayoutMode: 'screenCenter',
    tooltipHeightEstimate: 220,
    navigateToTab: 'index',
  },
  {
    id: 'today-take-med',
    titleKey: 'senior.tour.todayTakeMed.title',
    bodyKey: 'senior.tour.todayTakeMed.body',
    targetStepId: 'today-take-med',
    markSeenStepIds: ['today-take-med'],
    placement: 'bottom',
    reserveBottom: 72,
    tooltipHeightEstimate: 200,
    navigateToTab: 'index',
  },
  {
    id: 'today-plan',
    titleKey: 'senior.tour.todayPlan.title',
    bodyKey: 'senior.tour.todayPlan.body',
    targetStepId: 'today-plan',
    markSeenStepIds: ['today-plan'],
    tooltipLayoutMode: 'screenCenterWithTarget',
    reserveBottom: 72,
    tooltipHeightEstimate: 200,
    navigateToTab: 'index',
  },
  {
    id: 'hybrid-tabs',
    titleKey: 'senior.tour.hybridTabs.title',
    bodyKey: 'senior.tour.hybridTabs.body',
    targetStepId: 'hybrid-tabs',
    markSeenStepIds: ['hybrid-tabs'],
    usesProgrammaticTabBar: true,
    placement: 'top',
    clearanceAboveHighlight: 24,
    reserveBottom: 72,
    tooltipHeightEstimate: 240,
    navigateToTab: 'index',
  },
  {
    id: 'hybrid-settings',
    titleKey: 'senior.tour.hybridSettings.title',
    bodyKey: 'senior.tour.hybridSettings.body',
    targetStepId: 'hybrid-settings',
    markSeenStepIds: ['hybrid-settings'],
    placement: 'bottom',
    reserveBottom: 72,
    tooltipHeightEstimate: 200,
    navigateToTab: 'index',
  },
  {
    id: 'calendar-fab',
    titleKey: 'senior.tour.calendarFab.title',
    bodyKey: 'senior.tour.calendarFab.body',
    targetStepId: 'calendar-fab',
    markSeenStepIds: ['calendar-fab'],
    placement: 'top',
    reserveBottom: 72,
    tooltipHeightEstimate: 200,
    navigateToTab: 'calendar',
  },
  {
    id: 'treatments-add',
    titleKey: 'senior.tour.treatmentsAdd.title',
    bodyKey: 'senior.tour.treatmentsAdd.body',
    targetStepId: 'treatments-add',
    markSeenStepIds: ['treatments-add'],
    placement: 'bottom',
    reserveBottom: 72,
    tooltipHeightEstimate: 200,
    navigateToTab: 'treatments',
  },
  {
    id: 'insights-range',
    titleKey: 'senior.tour.insightsRange.title',
    bodyKey: 'senior.tour.insightsRange.body',
    targetStepId: 'insights-range',
    markSeenStepIds: ['insights-range'],
    placement: 'bottom',
    reserveBottom: 72,
    tooltipHeightEstimate: 200,
    navigateToTab: 'insights',
  },
];

export function getSeniorGuidedTourSteps(): SeniorGuidedTourStep[] {
  return SENIOR_GUIDED_TOUR_STEPS;
}
