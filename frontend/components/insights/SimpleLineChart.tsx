import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Line, Polyline, Circle } from 'react-native-svg';
import { Theme } from '../../constants/theme';

export type LineChartPoint = {
  label: string;
  value: number; // 0..1
};

type Props = {
  data: LineChartPoint[];
  height?: number;
  strokeColor?: string;
};

const CHART_WIDTH = 320;
const PADDING_LEFT = 36;
const PADDING_RIGHT = 12;
const PADDING_TOP = 12;
const PADDING_BOTTOM = 36;

function clamp01(v: number) {
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

export function SimpleLineChart({ data, height = 200, strokeColor }: Props) {
  const plotWidth = CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT;
  const plotHeight = height - PADDING_TOP - PADDING_BOTTOM;

  const points = useMemo(() => {
    if (!data.length) return [];
    if (data.length === 1) {
      const v = clamp01(data[0].value);
      const x = PADDING_LEFT + plotWidth / 2;
      const y = PADDING_TOP + (1 - v) * plotHeight;
      return [{ x, y }];
    }
    return data.map((d, i) => {
      const v = clamp01(d.value);
      const x = PADDING_LEFT + (i / (data.length - 1)) * plotWidth;
      const y = PADDING_TOP + (1 - v) * plotHeight;
      return { x, y };
    });
  }, [data, plotWidth, plotHeight]);

  const polyPoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  if (!data.length) return null;

  return (
    <View style={styles.wrap}>
      <Svg width={CHART_WIDTH} height={height}>
        {/* x-axis */}
        <Line
          x1={PADDING_LEFT}
          y1={PADDING_TOP + plotHeight}
          x2={PADDING_LEFT + plotWidth}
          y2={PADDING_TOP + plotHeight}
          stroke={Theme.colors.border}
          strokeWidth={1}
        />
        {/* y-axis ticks (0, 0.5, 1) */}
        {[0, 0.5, 1].map((v) => {
          const y = PADDING_TOP + (1 - v) * plotHeight;
          return (
            <Line
              key={`grid-${v}`}
              x1={PADDING_LEFT}
              y1={y}
              x2={PADDING_LEFT + plotWidth}
              y2={y}
              stroke={Theme.colors.surfaceGrey}
              strokeWidth={1}
            />
          );
        })}

        <Polyline
          points={polyPoints}
          fill="none"
          stroke={strokeColor ?? Theme.colors.accentOrange}
          strokeWidth={3}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {points.map((p, i) => (
          <Circle
            key={`pt-${i}`}
            cx={p.x}
            cy={p.y}
            r={4}
            fill={Theme.colors.surfaceWhite}
            stroke={strokeColor ?? Theme.colors.accentOrange}
            strokeWidth={2}
          />
        ))}
      </Svg>

      <View style={[styles.labels, { width: CHART_WIDTH, paddingLeft: PADDING_LEFT, paddingRight: PADDING_RIGHT }]}>
        {data.map((d, i) => (
          <Text
            key={`lbl-${i}`}
            style={[
              styles.label,
              { width: data.length === 1 ? plotWidth : plotWidth / (data.length - 1) },
              i === data.length - 1 && { textAlign: 'right' },
            ]}
            numberOfLines={1}
          >
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  labels: { flexDirection: 'row', marginTop: 4 },
  label: {
    fontSize: Theme.typography.small,
    color: Theme.colors.textLight,
    textAlign: 'left',
  },
});

