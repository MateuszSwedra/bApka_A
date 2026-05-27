import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Line } from 'react-native-svg';
import { Theme } from '../../constants/theme';

export type BarChartItem = {
  label: string;
  value: number;
  color?: string;
};

type Props = {
  data: BarChartItem[];
  height?: number;
  barColor?: string;
};

const CHART_WIDTH = 320;
const PADDING_LEFT = 36;
const PADDING_RIGHT = 12;
const PADDING_TOP = 12;
const PADDING_BOTTOM = 36;

export function SimpleBarChart({ data, height = 200, barColor }: Props) {
  const plotWidth = CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT;
  const plotHeight = height - PADDING_TOP - PADDING_BOTTOM;

  const maxValue = useMemo(
    () => Math.max(1, ...data.map((d) => d.value)),
    [data],
  );

  const barSlot = data.length > 0 ? plotWidth / data.length : plotWidth;
  const barWidth = Math.min(32, Math.max(8, barSlot * 0.55));

  if (!data.length) return null;

  return (
    <View style={styles.wrap}>
      <Svg width={CHART_WIDTH} height={height}>
        <Line
          x1={PADDING_LEFT}
          y1={PADDING_TOP + plotHeight}
          x2={PADDING_LEFT + plotWidth}
          y2={PADDING_TOP + plotHeight}
          stroke={Theme.colors.border}
          strokeWidth={1}
        />
        {data.map((item, i) => {
          const barH = (item.value / maxValue) * plotHeight;
          const x = PADDING_LEFT + i * barSlot + (barSlot - barWidth) / 2;
          const y = PADDING_TOP + plotHeight - barH;
          return (
            <Rect
              key={`${item.label}-${i}`}
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(barH, item.value > 0 ? 2 : 0)}
              rx={4}
              fill={item.color ?? barColor ?? Theme.colors.accentOrange}
            />
          );
        })}
      </Svg>
      <View style={[styles.labels, { width: CHART_WIDTH, paddingLeft: PADDING_LEFT, paddingRight: PADDING_RIGHT }]}>
        {data.map((item, i) => (
          <Text key={`lbl-${i}`} style={[styles.label, { width: barSlot }]} numberOfLines={1}>
            {item.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  labels: {
    flexDirection: 'row',
    marginTop: 4,
  },
  label: {
    fontSize: Theme.typography.small,
    color: Theme.colors.textLight,
    textAlign: 'center',
  },
});
