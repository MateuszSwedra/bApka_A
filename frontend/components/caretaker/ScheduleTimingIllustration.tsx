import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { Theme } from '../../constants/theme';

type Props = {
  width?: number;
  height?: number;
};

/** Kalendarzyk + pigułka - wspólna grafika ekranu wyboru daty/dni/okresu. Bez tła. */
export function ScheduleTimingIllustration({ width = 240, height = 200 }: Props) {
  const navy = Theme.colors.primaryLimeDark;
  const orange = Theme.colors.accentOrange;
  const mint = Theme.colors.primaryLime;
  const stroke = Theme.colors.border;
  const muted = 'rgba(27, 60, 83, 0.3)';

  return (
    <View style={styles.wrap} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={width} height={height} viewBox="0 0 240 200">
        {/* Kalendarzyk */}
        <Rect x={32} y={42} width={108} height={118} rx={14} fill="none" stroke={stroke} strokeWidth={2} />
        <Rect x={32} y={42} width={108} height={28} rx={14} fill={navy} />
        <Rect x={32} y={58} width={108} height={12} fill={navy} />

        {[0, 1, 2, 3, 4, 5].map(i => (
          <Circle key={`d-${i}`} cx={52 + (i % 3) * 28} cy={92 + Math.floor(i / 3) * 22} r={4} fill={muted} />
        ))}
        <Circle cx={108} cy={114} r={9} fill={orange} />
        <Circle cx={108} cy={114} r={4} fill="#FFFFFF" />

        {/* Pigułka (kapsułka) */}
        <Path
          d="M158 78 h44 a16 16 0 0 1 16 16 v8 a16 16 0 0 1 -16 16 h-44 a16 16 0 0 1 -16 -16 v-8 a16 16 0 0 1 16 -16 z"
          fill={mint}
          stroke={navy}
          strokeWidth={2}
        />
        <Line x1={178} y1={94} x2={198} y2={110} stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" />

        {/* Łącznik */}
        <Path
          d="M142 108 Q158 98 168 102"
          stroke={orange}
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
          strokeDasharray="4 3"
        />

        {/* Zegar - subtelny akcent */}
        <Circle cx={188} cy={152} r={16} fill="none" stroke={navy} strokeWidth={1.5} />
        <Line x1={188} y1={152} x2={188} y2={142} stroke={navy} strokeWidth={2} strokeLinecap="round" />
        <Line x1={188} y1={152} x2={196} y2={156} stroke={orange} strokeWidth={2} strokeLinecap="round" />
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
