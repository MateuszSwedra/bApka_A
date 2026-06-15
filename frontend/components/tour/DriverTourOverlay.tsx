import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/theme';
import { OnboardingGradient, OnboardingPalette } from '../../constants/onboardingTheme';
import type { CoachMarkTarget } from '../caretaker/CaretakerCoachMarkOverlay';

export type DriverTourOverlayProps = {
  visible: boolean;
  target: CoachMarkTarget | null;
  title: string;
  body: string;
  placement?: 'auto' | 'top' | 'bottom';
  onNext: () => void;
  onPrev?: () => void;
  onSkip?: () => void;
  stepIndex: number;
  totalSteps: number;
  maskId?: string;
  tooltipGap?: number;
  reserveBottom?: number;
  clearanceAboveHighlight?: number;
  tooltipHeightEstimate?: number;
  tooltipLayoutMode?: 'anchor' | 'screenCenter' | 'screenCenterWithTarget';
  showSkip?: boolean;
  showProgress?: boolean;
  progressKey?: string;
  skipKey?: string;
  prevKey?: string;
  nextKey?: string;
  doneKey?: string;
};

const HIGHLIGHT_PAD = 8;
const TOOLTIP_EST_HEIGHT = 200;
const DEFAULT_TOOLTIP_GAP = 20;
const MIN_HOLE_CLEARANCE = 8;

export function DriverTourOverlay({
  visible,
  target,
  title,
  body,
  placement = 'auto',
  onNext,
  onPrev,
  onSkip,
  stepIndex,
  totalSteps,
  maskId = 'driverTourMask',
  tooltipGap = DEFAULT_TOOLTIP_GAP,
  reserveBottom = 0,
  clearanceAboveHighlight,
  tooltipHeightEstimate,
  tooltipLayoutMode = 'anchor',
  showSkip = true,
  showProgress = true,
  progressKey = 'caretaker.tour.guided.progress',
  skipKey = 'caretaker.tour.guided.skip',
  prevKey = 'caretaker.tour.guided.prev',
  nextKey = 'caretaker.tour.guided.next',
  doneKey = 'caretaker.tour.guided.done',
}: DriverTourOverlayProps) {
  const { t } = useTranslation();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [measuredTooltipHeight, setMeasuredTooltipHeight] = useState<number | null>(null);

  const isFirst = stepIndex <= 0;
  const isLast = stepIndex >= totalSteps - 1;
  const screenCenter =
    tooltipLayoutMode === 'screenCenter' || tooltipLayoutMode === 'screenCenterWithTarget' || !target;
  const centerTooltipOnly = tooltipLayoutMode === 'screenCenterWithTarget' && target != null;
  const maxBodyHeight = Math.min(140, Math.max(72, windowHeight * 0.18));

  useEffect(() => {
    setMeasuredTooltipHeight(null);
  }, [visible, target, title, body, windowWidth, stepIndex]);

  const tooltipLayout = useMemo(() => {
    const tooltipMaxWidth = Math.min(windowWidth - 24, 360);
    const tooltipHeight =
      measuredTooltipHeight ?? tooltipHeightEstimate ?? TOOLTIP_EST_HEIGHT;
    const topLimit = insets.top + 12;
    const bottomLimit = windowHeight - Math.max(insets.bottom, reserveBottom) - 12;

    if (screenCenter && !centerTooltipOnly) {
      const top = Math.max(
        topLimit,
        topLimit + (bottomLimit - topLimit - tooltipHeight) / 2,
      );
      return {
        hole: null,
        tooltipMaxWidth,
        top,
        left: Math.max(12, (windowWidth - tooltipMaxWidth) / 2),
        maxPopoverHeight: bottomLimit - top,
      };
    }

    const hole = {
      x: Math.max(0, target!.x - HIGHLIGHT_PAD),
      y: Math.max(0, target!.y - HIGHLIGHT_PAD),
      width: Math.min(windowWidth, target!.width + HIGHLIGHT_PAD * 2),
      height: Math.min(windowHeight, target!.height + HIGHLIGHT_PAD * 2),
    };

    if (centerTooltipOnly) {
      const top = Math.max(
        topLimit,
        topLimit + (bottomLimit - topLimit - tooltipHeight) / 2,
      );
      return {
        hole,
        tooltipMaxWidth,
        top,
        left: Math.max(12, (windowWidth - tooltipMaxWidth) / 2),
        maxPopoverHeight: bottomLimit - top,
      };
    }

    const anchorCenter = hole.x + hole.width / 2;
    let left = anchorCenter - tooltipMaxWidth / 2;
    left = Math.max(12, Math.min(left, windowWidth - tooltipMaxWidth - 12));

    if (clearanceAboveHighlight != null) {
      const gap = clearanceAboveHighlight;
      let top = hole.y - gap - tooltipHeight;
      top = Math.max(topLimit, top);
      top = Math.min(top, bottomLimit - tooltipHeight);
      return { hole, tooltipMaxWidth, top, left, maxPopoverHeight: bottomLimit - top };
    }

    const holeTop = hole.y;
    const holeBottom = hole.y + hole.height;
    const spaceBelow = bottomLimit - holeBottom;
    const spaceAbove = holeTop - topLimit;
    const tooltipBlock = tooltipHeight + tooltipGap;

    let preferBottom =
      placement === 'bottom' ||
      (placement === 'auto' && spaceBelow >= tooltipBlock) ||
      (placement === 'auto' && spaceBelow >= spaceAbove && spaceBelow >= tooltipBlock * 0.85);

    if (placement === 'auto' && !preferBottom && spaceAbove < tooltipBlock) {
      preferBottom = spaceBelow >= spaceAbove;
    }
    if (placement === 'top') {
      preferBottom = false;
    }

    let top = preferBottom ? holeBottom + tooltipGap : holeTop - tooltipHeight - tooltipGap;
    top = Math.max(topLimit, Math.min(top, bottomLimit - tooltipHeight));

    if (top + tooltipHeight > holeTop - MIN_HOLE_CLEARANCE) {
      top = preferBottom ? holeBottom + tooltipGap : holeTop - tooltipHeight - tooltipGap;
    }

    if (placement === 'top') {
      top = Math.max(topLimit, holeTop - tooltipHeight - tooltipGap);
    }

    return { hole, tooltipMaxWidth, top, left, maxPopoverHeight: bottomLimit - top };
  }, [
    target,
    windowWidth,
    windowHeight,
    insets.top,
    insets.bottom,
    placement,
    tooltipGap,
    reserveBottom,
    clearanceAboveHighlight,
    tooltipHeightEstimate,
    measuredTooltipHeight,
    screenCenter,
    centerTooltipOnly,
  ]);

  if (!visible || !tooltipLayout) {
    return null;
  }

  const { hole, tooltipMaxWidth, top, left, maxPopoverHeight } = tooltipLayout;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onSkip}>
      <View style={styles.root}>
        {hole ? (
          <>
            <Svg
              width={windowWidth}
              height={windowHeight}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            >
              <Defs>
                <Mask id={maskId}>
                  <Rect x={0} y={0} width={windowWidth} height={windowHeight} fill="white" />
                  <Rect
                    x={hole.x}
                    y={hole.y}
                    width={hole.width}
                    height={hole.height}
                    rx={12}
                    ry={12}
                    fill="black"
                  />
                </Mask>
              </Defs>
              <Rect
                x={0}
                y={0}
                width={windowWidth}
                height={windowHeight}
                fill="rgba(27, 60, 83, 0.72)"
                mask={`url(#${maskId})`}
              />
            </Svg>
            <Pressable
              style={[StyleSheet.absoluteFill, styles.touchBlocker]}
              onPress={() => {}}
              accessibilityRole="none"
              importantForAccessibility="no-hide-descendants"
            />
            <View
              pointerEvents="none"
              style={[
                styles.highlightRing,
                {
                  left: hole.x,
                  top: hole.y,
                  width: hole.width,
                  height: hole.height,
                  zIndex: 2,
                },
              ]}
            />
          </>
        ) : (
          <Pressable
            style={[StyleSheet.absoluteFill, styles.backdrop]}
            onPress={() => {}}
            accessibilityRole="none"
            importantForAccessibility="no-hide-descendants"
          />
        )}

        <View
          onLayout={(event) => {
            const nextHeight = event.nativeEvent.layout.height;
            if (nextHeight > 0 && nextHeight !== measuredTooltipHeight) {
              setMeasuredTooltipHeight(nextHeight);
            }
          }}
          style={[
            styles.popover,
            {
              top,
              left,
              width: tooltipMaxWidth,
              maxWidth: tooltipMaxWidth,
              maxHeight: maxPopoverHeight,
              zIndex: 10,
            },
          ]}
        >
          <View style={styles.popoverHeader}>
            {showProgress && totalSteps > 1 ? (
              <Text style={styles.progressText}>
                {t(progressKey, {
                  current: stepIndex + 1,
                  total: totalSteps,
                })}
              </Text>
            ) : (
              <View />
            )}
            {showSkip && onSkip ? (
              <Pressable
                onPress={onSkip}
                hitSlop={8}
                style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityLabel={t(skipKey)}
              >
                <Text style={styles.skipText}>{t(skipKey)}</Text>
              </Pressable>
            ) : null}
          </View>

          <Text style={styles.popoverTitle}>{title}</Text>
          <ScrollView
            style={[styles.popoverBodyScroll, { maxHeight: maxBodyHeight }]}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.popoverBody}>{body}</Text>
          </ScrollView>

          <View style={styles.footer}>
            {!isFirst && onPrev ? (
              <Pressable
                onPress={onPrev}
                style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.85 }]}
                accessibilityRole="button"
              >
                <MaterialIcons name="arrow-back" size={18} color={Theme.colors.primaryLimeDark} />
                <Text style={styles.secondaryBtnText}>{t(prevKey)}</Text>
              </Pressable>
            ) : (
              <View style={styles.footerSpacer} />
            )}

            <Pressable
              onPress={onNext}
              style={({ pressed }) => [styles.primaryBtnWrap, pressed && { opacity: 0.92 }]}
              accessibilityRole="button"
            >
              <LinearGradient
                colors={[...OnboardingGradient.colors]}
                start={OnboardingGradient.start}
                end={OnboardingGradient.end}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>
                  {isLast ? t(doneKey) : t(nextKey)}
                </Text>
                {!isLast ? (
                  <MaterialIcons name="arrow-forward" size={18} color={OnboardingPalette.surface} />
                ) : null}
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    backgroundColor: 'rgba(27, 60, 83, 0.72)',
  },
  touchBlocker: {
    zIndex: 1,
  },
  highlightRing: {
    position: 'absolute',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Theme.colors.accentOrange,
    ...Platform.select({
      web: { boxShadow: '0 0 0 4px rgba(233, 164, 61, 0.25)' },
      default: {
        shadowColor: Theme.colors.accentOrange,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.45,
        shadowRadius: 8,
      },
    }),
  },
  popover: {
    position: 'absolute',
    backgroundColor: Theme.colors.surfaceWhite,
    borderRadius: Theme.borderRadius.xlarge,
    padding: Theme.spacing.l,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    ...Platform.select({
      web: { boxShadow: '0 8px 32px rgba(27, 60, 83, 0.18)' },
      default: {
        shadowColor: Theme.colors.shadowNeutral,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
      },
    }),
  },
  popoverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.s,
    minHeight: 24,
  },
  progressText: {
    fontSize: Theme.typography.small,
    fontWeight: '700',
    color: Theme.colors.textLight,
    letterSpacing: 0.3,
  },
  skipBtn: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    marginLeft: 'auto',
  },
  skipText: {
    fontSize: Theme.typography.small,
    fontWeight: '700',
    color: Theme.colors.textLight,
    textDecorationLine: 'underline',
  },
  popoverTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: OnboardingPalette.textPrimary,
    marginBottom: Theme.spacing.s,
    lineHeight: 24,
  },
  popoverBodyScroll: {
    marginBottom: Theme.spacing.m,
  },
  popoverBody: {
    fontSize: Theme.typography.body,
    lineHeight: 22,
    color: OnboardingPalette.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Theme.spacing.s,
  },
  footerSpacer: {
    flex: 1,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: Theme.spacing.m,
    borderRadius: Theme.borderRadius.round,
    borderWidth: 1.5,
    borderColor: Theme.colors.primaryLimeDark,
  },
  secondaryBtnText: {
    fontSize: Theme.typography.body,
    fontWeight: '700',
    color: Theme.colors.primaryLimeDark,
  },
  primaryBtnWrap: {
    borderRadius: Theme.borderRadius.round,
    overflow: 'hidden',
    flexShrink: 0,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: Theme.spacing.l,
  },
  primaryBtnText: {
    color: OnboardingPalette.surface,
    fontSize: Theme.typography.body,
    fontWeight: '800',
  },
});
