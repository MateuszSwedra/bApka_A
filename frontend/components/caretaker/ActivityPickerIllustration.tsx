import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { Theme } from '../../constants/theme';

type Props = {
  width?: number;
  height?: number;
};

/** Ilustracja wyboru aktywności - bez tła, kolory marki bApka. */
export function ActivityPickerIllustration({ width = 220, height = 200 }: Props) {
  const stroke = Theme.colors.border;
  const header = Theme.colors.primaryLimeDark;
  const accent = Theme.colors.accentOrange;
  const soft = Theme.colors.primaryLime;
  const ink = Theme.colors.textDark;
  const muted = 'rgba(27, 60, 83, 0.35)';

  return (
    <View style={styles.wrap} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={width} height={height} viewBox="0 0 220 200">
        <Rect
          x={42}
          y={18}
          width={136}
          height={152}
          rx={14}
          fill="none"
          stroke={stroke}
          strokeWidth={2}
        />
        <Rect x={42} y={18} width={136} height={26} rx={14} fill={header} />
        <Rect x={42} y={32} width={136} height={12} fill={header} />

        <Circle cx={110} cy={78} r={30} fill={soft} />
        <Path
          d="M110 58 v40 M90 78 h40"
          stroke="#FFFFFF"
          strokeWidth={5}
          strokeLinecap="round"
        />

        <Circle cx={68} cy={118} r={10} fill="none" stroke={accent} strokeWidth={2} />
        <Path
          d="M64 118 l3 3 7-8"
          stroke={accent}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Line x1={86} y1={114} x2={158} y2={114} stroke={muted} strokeWidth={3} strokeLinecap="round" />
        <Line x1={86} y1={124} x2={132} y2={124} stroke={muted} strokeWidth={3} strokeLinecap="round" />

        <Circle cx={68} cy={148} r={10} fill="none" stroke={accent} strokeWidth={2} />
        <Path
          d="M64 148 l3 3 7-8"
          stroke={accent}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Line x1={86} y1={144} x2={158} y2={144} stroke={muted} strokeWidth={3} strokeLinecap="round" />
        <Line x1={86} y1={154} x2={120} y2={154} stroke={muted} strokeWidth={3} strokeLinecap="round" />

        <Rect x={50} y={168} width={48} height={4} rx={2} fill={ink} opacity={0.12} />
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
