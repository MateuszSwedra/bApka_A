import { Platform, type ScrollView, type View } from 'react-native';
import type { RefObject } from 'react';

export type CoachMarkInsets = {
  top: number;
  bottom: number;
};

export type EnsureVisibleOptions = {
  windowHeight: number;
  insets: CoachMarkInsets;
  tooltipEstimateHeight?: number;
  tooltipGap?: number;
  placement?: 'auto' | 'top' | 'bottom';
  scrollRef?: RefObject<ScrollView | null>;
  contentRef?: RefObject<View | null>;
  /** Dolna strefa zarezerwowana (np. pasek zakładek). */
  reserveBottom?: number;
};

const HIGHLIGHT_PAD = 8;
const VIEWPORT_PAD = 12;
const TOOLTIP_GAP = 12;
const DEFAULT_TOOLTIP_HEIGHT = 168;

export type MeasuredTarget = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function targetsMatch(a: MeasuredTarget, b: MeasuredTarget): boolean {
  return (
    Math.abs(a.x - b.x) < 2 &&
    Math.abs(a.y - b.y) < 2 &&
    Math.abs(a.width - b.width) < 2 &&
    Math.abs(a.height - b.height) < 2
  );
}

export function measureTargetInWindow(
  targetRef: RefObject<View | null>,
): Promise<MeasuredTarget | null> {
  return new Promise((resolve) => {
    targetRef.current?.measureInWindow((x, y, width, height) => {
      if (width <= 0 || height <= 0) {
        resolve(null);
        return;
      }
      resolve({ x, y, width, height });
    });
  });
}

/** Czeka aż measureInWindow zwraca stabilne współrzędne (po przewinięciu / layoucie). */
export async function measureTargetStable(
  targetRef: RefObject<View | null>,
  attempts = 6,
  intervalMs = Platform.OS === 'web' ? 80 : 60,
): Promise<MeasuredTarget | null> {
  let last: MeasuredTarget | null = null;

  for (let i = 0; i < attempts; i += 1) {
    const measured = await measureTargetInWindow(targetRef);
    if (!measured) {
      await delay(intervalMs);
      continue;
    }
    if (last && targetsMatch(last, measured)) {
      return measured;
    }
    last = measured;
    await delay(intervalMs);
  }

  return last;
}

function findDomNodeFromViewRef(node: unknown): HTMLElement | null {
  if (!node) return null;
  const anyNode = node as Record<string, unknown> & { scrollIntoView?: () => void };
  if (typeof anyNode.scrollIntoView === 'function') {
    return anyNode as unknown as HTMLElement;
  }
  for (const key of ['_nativeNode', 'node', 'element'] as const) {
    const child = anyNode[key];
    if (child && typeof (child as HTMLElement).scrollIntoView === 'function') {
      return child as HTMLElement;
    }
  }
  return null;
}

/** Minimalna widoczność podświetlenia — element nie może być ucięty poza ekran. */
export function isCoachMarkHighlightVisible(
  target: MeasuredTarget,
  options: EnsureVisibleOptions,
): boolean {
  const topLimit = options.insets.top + VIEWPORT_PAD;
  const bottomLimit =
    options.windowHeight - Math.max(options.insets.bottom, options.reserveBottom ?? 0) - VIEWPORT_PAD;

  const holeTop = target.y - HIGHLIGHT_PAD;
  const holeBottom = target.y + target.height + HIGHLIGHT_PAD;
  const highlightHeight = Math.max(holeBottom - holeTop, 1);

  const visibleTop = Math.max(holeTop, topLimit);
  const visibleBottom = Math.min(holeBottom, bottomLimit);
  const visibleHeight = visibleBottom - visibleTop;

  return visibleHeight >= Math.min(highlightHeight * 0.85, highlightHeight - 4);
}

/** Czy podświetlany element + miejsce na tooltip mieszczą się w oknie. */
export function isCoachMarkTargetFullyVisible(
  target: MeasuredTarget,
  options: EnsureVisibleOptions,
): boolean {
  if (!isCoachMarkHighlightVisible(target, options)) {
    return false;
  }

  const tooltipHeight = options.tooltipEstimateHeight ?? DEFAULT_TOOLTIP_HEIGHT;
  const topLimit = options.insets.top + VIEWPORT_PAD;
  const bottomLimit =
    options.windowHeight - Math.max(options.insets.bottom, options.reserveBottom ?? 0) - VIEWPORT_PAD;
  const gap = options.tooltipGap ?? TOOLTIP_GAP;

  const holeTop = target.y - HIGHLIGHT_PAD;
  const holeBottom = target.y + target.height + HIGHLIGHT_PAD;

  const spaceBelow = bottomLimit - holeBottom;
  const spaceAbove = holeTop - topLimit;
  const tooltipBlock = tooltipHeight + gap;
  const availableHeight = bottomLimit - topLimit;
  const highlightHeight = holeBottom - holeTop;

  if (highlightHeight > availableHeight - tooltipBlock) {
    return holeTop >= topLimit && holeTop + Math.min(highlightHeight, 120) <= bottomLimit;
  }

  if (options.placement === 'bottom') {
    return spaceBelow >= tooltipBlock;
  }
  if (options.placement === 'top') {
    return spaceAbove >= tooltipBlock;
  }

  return spaceBelow >= tooltipBlock || spaceAbove >= tooltipBlock;
}

function scrollWebTargetIntoView(targetRef: RefObject<View | null>): Promise<void> {
  return new Promise((resolve) => {
    const node = findDomNodeFromViewRef(targetRef.current);
    if (node?.scrollIntoView) {
      node.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      return;
    }
    resolve();
  });
}

function scrollNativeTargetIntoView(
  targetRef: RefObject<View | null>,
  scrollRef: RefObject<ScrollView | null>,
  contentRef: RefObject<View | null>,
  options: EnsureVisibleOptions,
): Promise<void> {
  return new Promise((resolve) => {
    const scrollView = scrollRef.current;
    const content = contentRef.current;
    const target = targetRef.current;

    if (!scrollView || !content || !target) {
      resolve();
      return;
    }

    target.measureLayout(
      content,
      (_left, relativeTop, _width, height) => {
        const tooltipHeight = options.tooltipEstimateHeight ?? DEFAULT_TOOLTIP_HEIGHT;
        const gap = options.tooltipGap ?? TOOLTIP_GAP;
        const reserveBottom = options.reserveBottom ?? 0;
        const topMargin = options.insets.top + VIEWPORT_PAD + HIGHLIGHT_PAD;
        const bottomReserve =
          Math.max(options.insets.bottom, reserveBottom) +
          VIEWPORT_PAD +
          tooltipHeight +
          gap +
          HIGHLIGHT_PAD;

        const desiredTop =
          options.placement === 'top'
            ? topMargin + tooltipHeight + gap
            : topMargin;

        let scrollY = Math.max(0, relativeTop - desiredTop);

        if (options.placement === 'bottom' || options.placement === 'auto') {
          const visibleBottom = options.windowHeight - bottomReserve;
          const projectedBottom = relativeTop + height - scrollY;
          if (projectedBottom > visibleBottom) {
            scrollY = Math.max(0, relativeTop + height - visibleBottom);
          }
        }

        scrollView.scrollTo({ y: scrollY, animated: false });
        setTimeout(resolve, Platform.OS === 'web' ? 50 : 120);
      },
      () => resolve(),
    );
  });
}

async function scrollTargetIntoView(
  targetRef: RefObject<View | null>,
  options: EnsureVisibleOptions,
): Promise<void> {
  if (options.scrollRef?.current && options.contentRef?.current) {
    await scrollNativeTargetIntoView(
      targetRef,
      options.scrollRef,
      options.contentRef,
      options,
    );
    return;
  }

  if (Platform.OS === 'web') {
    await scrollWebTargetIntoView(targetRef);
  }
}

/**
 * Przewija ekran tak, aby opisywany element był w całości widoczny
 * (z miejscem na kartę podpowiedzi), potem zwraca stabilny pomiar.
 */
export async function ensureCoachMarkTargetVisible(
  targetRef: RefObject<View | null>,
  options: EnsureVisibleOptions,
): Promise<MeasuredTarget | null> {
  let target = await measureTargetInWindow(targetRef);
  if (!target) return null;

  if (!isCoachMarkTargetFullyVisible(target, options)) {
    await scrollTargetIntoView(targetRef, options);
    await delay(Platform.OS === 'web' ? 60 : 100);
  }

  target = await measureTargetStable(targetRef);
  if (!target) return null;

  if (!isCoachMarkTargetFullyVisible(target, options)) {
    await scrollTargetIntoView(targetRef, options);
    await delay(Platform.OS === 'web' ? 80 : 150);
    target = await measureTargetStable(targetRef, 8);
  }

  return target;
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
