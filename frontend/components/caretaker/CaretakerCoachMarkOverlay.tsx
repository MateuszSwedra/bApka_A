import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
  useWindowDimensions,
} from 'react-native';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../constants/theme';
import { OnboardingGradient, OnboardingPalette } from '../../constants/onboardingTheme';
import { getCoachMarkOverlayHeight } from '../../utils/coachMarkCoordinates';

export type CoachMarkTarget = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Props = {
  visible: boolean;
  target: CoachMarkTarget | null;
  title: string;
  body: string;
  placement?: 'auto' | 'top' | 'bottom';
  onDismiss: () => void;
  maskId?: string;
  tooltipGap?: number;
  reserveBottom?: number;
  onShow?: () => void;
  /** Minimalny odstęp dolnej krawędzi tooltipa od górnej krawędzi podświetlenia (px). */
  clearanceAboveHighlight?: number;
  /** Szacowana wysokość tooltipa, zanim zmierzymy layout (px). */
  tooltipHeightEstimate?: number;
  /** Tooltip na środku ekranu — podświetlenie zostaje przy elemencie docelowym. */
  tooltipLayoutMode?: 'anchor' | 'screenCenter';
  /** Gdy false — tylko przyciemnienie i okno z tekstem (bez wycięcia i obramowania elementu). */
  showTargetHighlight?: boolean;
};

const HIGHLIGHT_PAD = 8;
const TOOLTIP_EST_HEIGHT = 168;
const DEFAULT_TOOLTIP_GAP = 20;
const MIN_HOLE_CLEARANCE = 8;

export function CaretakerCoachMarkOverlay({
  visible,
  target,
  title,
  body,
  placement = 'auto',
  onDismiss,
  maskId = 'caretakerCoachMask',
  tooltipGap = DEFAULT_TOOLTIP_GAP,
  reserveBottom = 0,
  clearanceAboveHighlight,
  tooltipHeightEstimate,
  tooltipLayoutMode = 'anchor',
  showTargetHighlight = false,
  onShow,
}: Props) {
  const { t } = useTranslation();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const overlayHeight = getCoachMarkOverlayHeight(windowHeight, insets.top);
  const [measuredTooltipHeight, setMeasuredTooltipHeight] = useState<number | null>(null);

  useEffect(() => {
    setMeasuredTooltipHeight(null);
  }, [visible, target, title, body, windowWidth]);

  const tooltipLayout = useMemo(() => {
    const tooltipMaxWidth = Math.min(windowWidth - 24, 340);
    const tooltipHeight =
      measuredTooltipHeight ?? tooltipHeightEstimate ?? TOOLTIP_EST_HEIGHT;
    const topLimit = insets.top + 12;
    const bottomLimit = overlayHeight - Math.max(insets.bottom, reserveBottom) - 12;

    if (!showTargetHighlight || !target) {
      const top = Math.max(
        topLimit,
        topLimit + (bottomLimit - topLimit - tooltipHeight) / 2,
      );
      return {
        hole: null,
        tooltipMaxWidth,
        top,
        left: Math.max(12, (windowWidth - tooltipMaxWidth) / 2),
      };
    }

    const hole = {
      x: Math.max(0, target.x - HIGHLIGHT_PAD),
      y: Math.max(0, target.y - HIGHLIGHT_PAD),
      width: Math.min(windowWidth, target.width + HIGHLIGHT_PAD * 2),
      height: Math.min(overlayHeight, target.height + HIGHLIGHT_PAD * 2),
    };

    const holeTop = hole.y;
    const holeBottom = hole.y + hole.height;

    const anchorCenter = hole.x + hole.width / 2;
    let left = anchorCenter - tooltipMaxWidth / 2;
    left = Math.max(12, Math.min(left, windowWidth - tooltipMaxWidth - 12));

    if (tooltipLayoutMode === 'screenCenter') {
      const top = Math.max(
        topLimit,
        topLimit + (bottomLimit - topLimit - tooltipHeight) / 2,
      );
      return { hole, tooltipMaxWidth, top, left: Math.max(12, (windowWidth - tooltipMaxWidth) / 2) };
    }

    if (clearanceAboveHighlight != null) {
      const gap = clearanceAboveHighlight;
      let top = holeTop - gap - tooltipHeight;
      top = Math.max(topLimit, top);
      return { hole, tooltipMaxWidth, top, left };
    }

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

    let top: number;

    if (preferBottom) {
      top = holeBottom + tooltipGap;
    } else {
      top = holeTop - tooltipHeight - tooltipGap;
    }

    top = Math.max(topLimit, top);
    top = Math.min(top, bottomLimit - tooltipHeight);

    if (top + tooltipHeight > holeTop - MIN_HOLE_CLEARANCE) {
      if (preferBottom) {
        top = holeBottom + tooltipGap;
      } else {
        top = holeTop - tooltipHeight - tooltipGap;
      }
    }

    if (top + tooltipHeight > holeTop - MIN_HOLE_CLEARANCE && top < holeBottom + MIN_HOLE_CLEARANCE) {
      if (spaceAbove >= spaceBelow) {
        top = Math.max(topLimit, holeTop - tooltipHeight - tooltipGap);
      } else {
        top = Math.min(bottomLimit - tooltipHeight, holeBottom + tooltipGap);
      }
    }

    if (placement === 'top') {
      top = Math.max(topLimit, holeTop - tooltipHeight - tooltipGap);
      if (top + tooltipHeight > holeTop - MIN_HOLE_CLEARANCE) {
        top = Math.max(topLimit, holeTop - tooltipHeight - tooltipGap * 1.5);
      }
    }

    return { hole, tooltipMaxWidth, top, left };
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
    tooltipLayoutMode,
    overlayHeight,
    showTargetHighlight,
  ]);

  if (!visible || !tooltipLayout) {
    return null;
  }

  const { hole, tooltipMaxWidth, top, left } = tooltipLayout;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onShow={onShow}
      onRequestClose={onDismiss}
    >
      <View style={styles.root} pointerEvents="box-none">
        {hole ? (
          <>
            <Svg
              width={windowWidth}
              height={overlayHeight}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            >
              <Defs>
                <Mask id={maskId}>
                  <Rect x={0} y={0} width={windowWidth} height={overlayHeight} fill="white" />
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
                height={overlayHeight}
                fill="rgba(27, 60, 83, 0.72)"
                mask={`url(#${maskId})`}
              />
            </Svg>
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
          <View style={[StyleSheet.absoluteFill, styles.backdrop]} pointerEvents="none" />
        )}

        <Pressable
          style={[StyleSheet.absoluteFill, { zIndex: 1 }]}
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel={t('caretaker.tour.gotIt')}
        />

        <View
          pointerEvents="auto"
          onLayout={(event) => {
            const nextHeight = event.nativeEvent.layout.height;
            if (nextHeight > 0 && nextHeight !== measuredTooltipHeight) {
              setMeasuredTooltipHeight(nextHeight);
            }
          }}
          style={[
            styles.tooltip,
            {
              top,
              left,
              width: tooltipMaxWidth,
              maxWidth: tooltipMaxWidth,
              zIndex: 3,
            },
          ]}
        >
          <Text style={styles.tooltipTitle}>{title}</Text>
          <Text style={styles.tooltipBody}>{body}</Text>
          <Pressable
            onPress={onDismiss}
            style={({ pressed }) => [styles.ctaWrap, pressed && { opacity: 0.92 }]}
            accessibilityRole="button"
          >
            <LinearGradient
              colors={[...OnboardingGradient.colors]}
              start={OnboardingGradient.start}
              end={OnboardingGradient.end}
              style={styles.cta}
            >
              <Text style={styles.ctaText}>{t('caretaker.tour.gotIt')}</Text>
            </LinearGradient>
          </Pressable>
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
  tooltip: {
    position: 'absolute',
    backgroundColor: Theme.colors.surfaceWhite,
    borderRadius: Theme.borderRadius.xlarge,
    padding: Theme.spacing.l,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    zIndex: 10,
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
  tooltipTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: OnboardingPalette.textPrimary,
    marginBottom: Theme.spacing.s,
    lineHeight: 24,
  },
  tooltipBody: {
    fontSize: Theme.typography.body,
    lineHeight: 22,
    color: OnboardingPalette.textSecondary,
    marginBottom: Theme.spacing.m,
  },
  ctaWrap: {
    borderRadius: Theme.borderRadius.round,
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  cta: {
    paddingVertical: 12,
    paddingHorizontal: Theme.spacing.l,
    alignItems: 'center',
  },
  ctaText: {
    color: OnboardingPalette.surface,
    fontSize: Theme.typography.body,
    fontWeight: '800',
  },
});
