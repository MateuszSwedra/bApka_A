import pl from '../i18n/locales/pl.json';
import en from '../i18n/locales/en.json';
import {
  CARETAKER_POST_TOUR_STEPS,
  CARETAKER_PRE_TOUR_STEPS,
  getPostTourSteps,
  getPreTourSteps,
} from '../components/tour/caretakerTourPhases';
import { SENIOR_GUIDED_TOUR_STEPS } from '../components/tour/seniorTourPhases';

const TAB_BAR_CONTENT_HEIGHT = 56;

function tabBarTarget(width: number, height: number, bottomInset: number) {
  const tabBarBottom = Math.max(bottomInset, 8);
  const total = TAB_BAR_CONTENT_HEIGHT + tabBarBottom;
  return { x: 0, y: height - total, width, height: total };
}

function t(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function assertTranslationKeys(steps: { titleKey: string; bodyKey: string }[]) {
  for (const step of steps) {
    expect(typeof t(pl, step.titleKey)).toBe('string');
    expect(typeof t(en, step.titleKey)).toBe('string');
    expect(typeof t(pl, step.bodyKey)).toBe('string');
    expect(typeof t(en, step.bodyKey)).toBe('string');
  }
}

describe('guided tour configuration', () => {
  it('caretaker pre tour has unique step ids and translation keys', () => {
    const steps = getPreTourSteps();
    expect(steps.length).toBeGreaterThan(0);
    expect(new Set(steps.map((s) => s.id)).size).toBe(steps.length);
    assertTranslationKeys(steps);
  });

  it('caretaker post tour navigates calendar before treatments', () => {
    const steps = getPostTourSteps();
    const calendarIdx = steps.findIndex((s) => s.id === 'post-calendar');
    const treatmentsIdx = steps.findIndex((s) => s.id === 'post-treatments');
    expect(calendarIdx).toBeGreaterThan(-1);
    expect(treatmentsIdx).toBeGreaterThan(-1);
    expect(calendarIdx).toBeLessThan(treatmentsIdx);
    expect(steps[calendarIdx].navigateToTab).toBe('calendar');
    expect(steps[treatmentsIdx].navigateToTab).toBe('treatments');
  });

  it('caretaker post tour highlights real tab bar on post-tabs step', () => {
    const tabsStep = CARETAKER_POST_TOUR_STEPS.find((s) => s.id === 'post-tabs');
    expect(tabsStep?.targetStepId).toBe('dependent-tabs');
    expect(tabsStep?.usesMockTabs).toBeUndefined();
  });

  it('caretaker pre tour uses mock tabs preview', () => {
    const tabsStep = CARETAKER_PRE_TOUR_STEPS.find((s) => s.id === 'pre-tabs-preview');
    expect(tabsStep?.usesMockTabs).toBe(true);
    expect(tabsStep?.targetStepId).toBe('dependent-tabs');
  });

  it('senior guided tour has continuous flow with calendar before treatments', () => {
    expect(SENIOR_GUIDED_TOUR_STEPS.length).toBe(8);
    assertTranslationKeys(SENIOR_GUIDED_TOUR_STEPS);

    const calendarIdx = SENIOR_GUIDED_TOUR_STEPS.findIndex((s) => s.id === 'calendar-fab');
    const treatmentsIdx = SENIOR_GUIDED_TOUR_STEPS.findIndex((s) => s.id === 'treatments-add');
    expect(calendarIdx).toBeLessThan(treatmentsIdx);

    const tabsStep = SENIOR_GUIDED_TOUR_STEPS.find((s) => s.id === 'hybrid-tabs');
    expect(tabsStep?.usesProgrammaticTabBar).toBe(true);

    const planStep = SENIOR_GUIDED_TOUR_STEPS.find((s) => s.id === 'today-plan');
    expect(planStep?.tooltipLayoutMode).toBe('screenCenterWithTarget');
  });

  it('senior guided tour UI strings exist in both locales', () => {
    for (const key of [
      'senior.tour.guided.skip',
      'senior.tour.guided.next',
      'senior.tour.guided.prev',
      'senior.tour.guided.done',
      'senior.tour.guided.progress',
      'senior.tour.guided.welcome.title',
      'senior.tour.guided.welcome.body',
    ]) {
      expect(typeof t(pl, key)).toBe('string');
      expect(typeof t(en, key)).toBe('string');
    }
  });

  it('tab bar coach mark target covers bottom strip', () => {
    const target = tabBarTarget(390, 844, 34);
    expect(target.x).toBe(0);
    expect(target.width).toBe(390);
    expect(target.y).toBeGreaterThan(700);
    expect(target.y + target.height).toBe(844);
  });
});
