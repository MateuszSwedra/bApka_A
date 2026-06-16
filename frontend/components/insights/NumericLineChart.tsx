import React, { useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, ScrollView } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';
import { Theme } from '../../constants/theme';

export type NumericLinePoint = {
  label: string;
  value: number;
  showLabel?: boolean;
};

type Series = {
  points: NumericLinePoint[];
  strokeColor: string;
  name?: string;
};

type Props = {
  series: Series[];
  height?: number;
  unit?: string;
  yMin?: number;
  yMax?: number;
};

const PADDING_LEFT = 48;
const PADDING_RIGHT = 20;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 40;

export function NumericLineChart({ series, height = 240, unit, yMin, yMax }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const availableWidth = Math.min(screenWidth - 32, 480);
  const pointCount = Math.max(0, ...series.map(s => s.points.length));
  const seriesCount = Math.max(series.length, 1);
  const minGroupWidth = seriesCount > 1 ? 44 : 36;
  const chartWidth = Math.max(
    availableWidth,
    PADDING_LEFT + PADDING_RIGHT + pointCount * minGroupWidth,
  );
  const plotWidth = chartWidth - PADDING_LEFT - PADDING_RIGHT;
  const plotHeight = height - PADDING_TOP - PADDING_BOTTOM;

  const { min, max, normalized, gridLines } = useMemo(() => {
    const allValues = series.flatMap(s => s.points.map(p => p.value)).filter(v => Number.isFinite(v));
    if (allValues.length === 0) {
      return {
        min: 0,
        max: 1,
        normalized: [] as { color: string; values: Array<number | null> }[],
        gridLines: [] as number[],
      };
    }
    const dataMin = Math.min(...allValues);
    const dataMax = Math.max(...allValues);
    const lo = yMin ?? Math.floor(dataMin - (dataMax - dataMin) * 0.1 - 5);
    const hi = yMax ?? Math.ceil(dataMax + (dataMax - dataMin) * 0.1 + 5);
    const span = hi - lo || 1;

    const normalizedSeries = series.map(s => ({
      color: s.strokeColor,
      values: Array.from({ length: pointCount }, (_, i) => {
        const value = s.points[i]?.value;
        return Number.isFinite(value) ? (value as number) : null;
      }),
    }));

    const lines: number[] = [];
    for (let i = 0; i <= 4; i++) {
      lines.push(lo + (span * i) / 4);
    }

    return { min: lo, max: hi, normalized: normalizedSeries, gridLines: lines };
  }, [series, plotWidth, plotHeight, yMin, yMax, pointCount]);

  const labels = series[0]?.points ?? [];
  if (!labels.length) return null;

  const groupWidth = pointCount <= 1 ? plotWidth : plotWidth / pointCount;
  const groupInnerWidth = Math.min(groupWidth * 0.78, 30);
  const barGap = series.length > 1 ? 4 : 0;
  const barWidth =
    series.length > 1
      ? Math.max((groupInnerWidth - barGap * (series.length - 1)) / series.length, 6)
      : Math.min(groupInnerWidth, 22);

  const mapY = (value: number) => {
    const norm = (value - min) / (max - min || 1);
    return PADDING_TOP + (1 - Math.max(0, Math.min(1, norm))) * plotHeight;
  };

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View>
          <Svg width={chartWidth} height={height}>
            {gridLines.map((val, i) => {
              const y = mapY(val);
              return (
                <React.Fragment key={`grid-${i}`}>
                  <Line
                    x1={PADDING_LEFT}
                    y1={y}
                    x2={PADDING_LEFT + plotWidth}
                    y2={y}
                    stroke={Theme.colors.surfaceGrey}
                    strokeWidth={1}
                    strokeDasharray="4 4"
                  />
                  <SvgText
                    x={PADDING_LEFT - 6}
                    y={y + 4}
                    fontSize={10}
                    fill={Theme.colors.textLight}
                    textAnchor="end"
                  >
                    {Math.round(val)}
                  </SvgText>
                </React.Fragment>
              );
            })}
            <Line
              x1={PADDING_LEFT}
              y1={PADDING_TOP + plotHeight}
              x2={PADDING_LEFT + plotWidth}
              y2={PADDING_TOP + plotHeight}
              stroke={Theme.colors.border}
              strokeWidth={1.5}
            />

            {Array.from({ length: pointCount }, (_, i) => {
              const groupX = PADDING_LEFT + i * groupWidth + (groupWidth - groupInnerWidth) / 2;
              return normalized.map((s, si) => {
                const value = s.values[i];
                if (value == null) return null;
                const y = mapY(value);
                const h = Math.max(PADDING_TOP + plotHeight - y, 1);
                const x = groupX + si * (barWidth + barGap);
                return (
                  <React.Fragment key={`bar-${si}-${i}`}>
                    <Rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={h}
                      rx={4}
                      fill={s.color}
                      opacity={0.92}
                    />
                    <SvgText
                      x={x + barWidth / 2}
                      y={y - 6}
                      fontSize={10}
                      fontWeight="700"
                      fill={Theme.colors.textDark}
                      textAnchor="middle"
                    >
                      {Math.round(value)}
                    </SvgText>
                  </React.Fragment>
                );
              });
            })}
          </Svg>
          <View
            style={[
              styles.labels,
              { width: chartWidth, paddingLeft: PADDING_LEFT, paddingRight: PADDING_RIGHT },
            ]}
          >
            {labels.map((d, i) => {
              const show = d.showLabel !== false && d.label.length > 0;
              return (
                <Text
                  key={`lbl-${i}`}
                  style={[
                    styles.label,
                    { width: groupWidth, textAlign: 'center' },
                    !show && { opacity: 0 },
                  ]}
                  numberOfLines={1}
                >
                  {d.label}
                </Text>
              );
            })}
          </View>
        </View>
      </ScrollView>
      {unit ? <Text style={styles.unitHint}>{unit}</Text> : null}
      {series.length > 1 ? (
        <View style={styles.legendRow}>
          {series.map(s => (
            <View key={s.name ?? s.strokeColor} style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: s.strokeColor }]} />
              <Text style={styles.legendText}>{s.name}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', width: '100%' },
  scrollContent: { paddingHorizontal: 0 },
  unitHint: {
    alignSelf: 'flex-end',
    marginRight: 2,
    marginTop: 2,
    fontSize: 10,
    color: Theme.colors.textLight,
  },
  labels: { flexDirection: 'row', marginTop: 4 },
  label: { fontSize: 10, color: Theme.colors.textLight },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Theme.spacing.m, marginTop: Theme.spacing.s },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 10, height: 10, borderRadius: 2 },
  legendText: { fontSize: Theme.typography.small, color: Theme.colors.textLight },
});
