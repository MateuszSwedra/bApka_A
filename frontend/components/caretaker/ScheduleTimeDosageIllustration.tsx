import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { Theme } from '../../constants/theme';

type Props = {
  width?: number;
  height?: number;
};

/** Zegar + akcent dawki - ekran godziny i dawki. Bez tła. */
export function ScheduleTimeDosageIllustration({ width = 240, height = 200 }: Props) {
  const navy = Theme.colors.primaryLimeDark;
  const orange = Theme.colors.accentOrange;
  const mint = Theme.colors.primaryLime;
  const stroke = Theme.colors.border;

  const cx = 118;
  const cy = 102;

  return (
    <View style={styles.wrap} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={width} height={height} viewBox="0 0 240 200">
        {/* Tarcza zegara */}
        <Circle cx={cx} cy={cy} r={52} fill="none" stroke={stroke} strokeWidth={2} />
        <Circle cx={cx} cy={cy} r={44} fill={mint} opacity={0.35} />

        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => {
          const rad = (deg * Math.PI) / 180;
          const inner = 38;
          const outer = 48;
          const x1 = cx + inner * Math.sin(rad);
          const y1 = cy - inner * Math.cos(rad);
          const x2 = cx + outer * Math.sin(rad);
          const y2 = cy - outer * Math.cos(rad);
          const thick = deg % 90 === 0;
          return (
            <Line
              key={deg}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={thick ? navy : stroke}
              strokeWidth={thick ? 2.5 : 1.5}
              strokeLinecap="round"
            />
          );
        })}

        {/* Wskazówki */}
        <Line
          x1={cx}
          y1={cy}
          x2={cx}
          y2={cy - 28}
          stroke={navy}
          strokeWidth={3}
          strokeLinecap="round"
        />
        <Line
          x1={cx}
          y1={cy}
          x2={cx + 18}
          y2={cy + 8}
          stroke={orange}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <Circle cx={cx} cy={cy} r={5} fill={navy} />

        {/* Kapsułka - dawka (tylko dekor) */}
        <Path
          d="M178 128 h34 a12 12 0 0 1 12 12 v4 a12 12 0 0 1 -12 12 h-34 a12 12 0 0 1 -12 -12 v-4 a12 12 0 0 1 12 -12 z"
          fill={orange}
          opacity={0.85}
        />
        <Line x1={192} y1={138} x2={204} y2={150} stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />

        {/* „08:30” stylizowane */}
        <Rect x={36} y={36} width={56} height={28} rx={8} fill={navy} opacity={0.12} />
        <Line x1={44} y1={52} x2={58} y2={52} stroke={navy} strokeWidth={2.5} strokeLinecap="round" />
        <Line x1={66} y1={48} x2={66} y2={56} stroke={orange} strokeWidth={2.5} strokeLinecap="round" />
        <Line x1={72} y1={52} x2={80} y2={52} stroke={navy} strokeWidth={2.5} strokeLinecap="round" />
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
