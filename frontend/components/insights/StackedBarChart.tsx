import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Line } from 'react-native-svg';
import { Theme } from '../../constants/theme';

export type StackedSegment = { value: number; color: string };

export type StackedBarChartItem = {
  label: string;
  segments: StackedSegment[];
};

type Props = {
  data: StackedBarChartItem[];
  height?: number;
};

const CHART_WIDTH = 320;
const PADDING_LEFT = 36;
const PADDING_RIGHT = 12;
const PADDING_TOP = 12;
const PADDING_BOTTOM = 36;

export function StackedBarChart({ data, height = 220 }: Props) {
  const plotWidth = CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT;
  const plotHeight = height - PADDING_TOP - PADDING_BOTTOM;

  const maxTotal = useMemo(() => {
    const totals = data.map((d) => d.segments.reduce((s, seg) => s + seg.value, 0));
    return Math.max(1, ...totals);
  }, [data]);

  const barSlot = data.length > 0 ? plotWidth / data.length : plotWidth;
  const barWidth = Math.min(28, Math.max(8, barSlot * 0.5));

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
          const total = item.segments.reduce((s, seg) => s + seg.value, 0);
          const scale = total > 0 ? plotHeight / maxTotal : 0;
          const x = PADDING_LEFT + i * barSlot + (barSlot - barWidth) / 2;
          let yOffset = PADDING_TOP + plotHeight;

          return (
            <React.Fragment key={`bar-${item.label}-${i}`}>
              {item.segments.map((seg, si) => {
                const h = seg.value * scale;
                yOffset -= h;
                return (
                  <Rect
                    key={`seg-${i}-${si}`}
                    x={x}
                    y={yOffset}
                    width={barWidth}
                    height={Math.max(h, seg.value > 0 ? 2 : 0)}
                    fill={seg.color}
                  />
                );
              })}
            </React.Fragment>
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
