import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Ellipse, Line, Path, Rect } from 'react-native-svg';
import { Theme } from '../../constants/theme';

type Props = {
  width?: number;
  height?: number;
};

/**
 * Ilustracja wyboru częstotliwości - orbita z ikonami (inna kompozycja niż referencja z „?”).
 * Bez tła, kolory marki.
 */
export function ScheduleFrequencyIllustration({ width = 240, height = 220 }: Props) {
  const navy = Theme.colors.primaryLimeDark;
  const orange = Theme.colors.accentOrange;
  const mint = Theme.colors.primaryLime;
  const muted = 'rgba(27, 60, 83, 0.4)';
  const dash = Theme.colors.border;

  const cx = 120;
  const cy = 108;
  const orbitRx = 78;
  const orbitRy = 62;

  return (
    <View style={styles.wrap} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={width} height={height} viewBox="0 0 240 220">
        <Ellipse
          cx={cx}
          cy={cy}
          rx={orbitRx}
          ry={orbitRy}
          fill="none"
          stroke={dash}
          strokeWidth={1.5}
          strokeDasharray="6 5"
        />

        {/* Środek: rozgałęzienie harmonogramu (nie znak zapytania). */}
        <Circle cx={cx} cy={cy} r={34} fill={orange} />
        <Path
          d={`M${cx} ${cy - 14} V${cy + 6} M${cx - 12} ${cy + 6} H${cx + 12} M${cx - 12} ${cy + 6} V${cy + 14} M${cx + 12} ${cy + 6} V${cy + 14}`}
          stroke="#FFFFFF"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Jednorazowo - góra: pojedyncza kropka w pierścieniu */}
        <Circle cx={cx} cy={cy - orbitRy} r={22} fill={mint} opacity={0.95} />
        <Circle cx={cx} cy={cy - orbitRy} r={7} fill={navy} />

        {/* Regularnie - prawo: strzałki cyklu */}
        <Circle cx={cx + orbitRx} cy={cy} r={22} fill={navy} opacity={0.92} />
        <Path
          d={`M${cx + orbitRx - 10} ${cy - 2} a10 10 0 1 1 8 -6`}
          stroke="#FFFFFF"
          strokeWidth={2.5}
          fill="none"
          strokeLinecap="round"
        />
        <Path
          d={`M${cx + orbitRx + 4} ${cy - 10} l4 4 l-8 0`}
          stroke="#FFFFFF"
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Okres - lewy dół: pasek dat */}
        <Circle cx={cx - orbitRx * 0.78} cy={cy + orbitRy * 0.72} r={22} fill={orange} opacity={0.9} />
        <Rect
          x={cx - orbitRx * 0.78 - 11}
          y={cy + orbitRy * 0.72 - 9}
          width={22}
          height={16}
          rx={3}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={2}
        />
        <Line
          x1={cx - orbitRx * 0.78 - 11}
          y1={cy + orbitRy * 0.72 - 3}
          x2={cx - orbitRx * 0.78 + 11}
          y2={cy + orbitRy * 0.72 - 3}
          stroke="#FFFFFF"
          strokeWidth={1.5}
        />
        <Rect
          x={cx - orbitRx * 0.78 - 7}
          y={cy + orbitRy * 0.72 + 2}
          width={6}
          height={3}
          rx={1}
          fill="#FFFFFF"
        />
        <Rect
          x={cx - orbitRx * 0.78 + 1}
          y={cy + orbitRy * 0.72 + 2}
          width={6}
          height={3}
          rx={1}
          fill="#FFFFFF"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
});
