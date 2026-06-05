import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Line, Polyline, Circle } from 'react-native-svg';
import { Theme } from '../../constants/theme';

export type NumericLinePoint = {
  label: string;
  value: number;
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

const CHART_WIDTH = 320;
const PADDING_LEFT = 44;
const PADDING_RIGHT = 12;
const PADDING_TOP = 12;
const PADDING_BOTTOM = 36;

export function NumericLineChart({ series, height = 200, unit, yMin, yMax }: Props) {
  const plotWidth = CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT;
  const plotHeight = height - PADDING_TOP - PADDING_BOTTOM;

  const { min, max, normalized } = useMemo(() => {
    const allValues = series.flatMap(s => s.points.map(p => p.value)).filter(v => Number.isFinite(v));
    if (allValues.length === 0) {
      return { min: 0, max: 1, normalized: [] as { strokeColor: string; pts: { x: number; y: number }[] }[] };
    }
    const lo = yMin ?? Math.min(...allValues) * 0.95;
    const hi = yMax ?? Math.max(...allValues) * 1.05;
    const span = hi - lo || 1;
    const longest = Math.max(...series.map(s => s.points.length), 1);

    const normalizedSeries = series.map(s => {
      const pts = s.points.map((p, i) => {
        const x =
          s.points.length === 1
            ? PADDING_LEFT + plotWidth / 2
            : PADDING_LEFT + (i / (s.points.length - 1)) * plotWidth;
        const norm = (p.value - lo) / span;
        const y = PADDING_TOP + (1 - Math.max(0, Math.min(1, norm))) * plotHeight;
        return { x, y };
      });
      return { strokeColor: s.strokeColor, pts };
    });

    return { min: lo, max: hi, normalized: normalizedSeries, labelCount: longest, labels: series[0]?.points ?? [] };
  }, [series, plotWidth, plotHeight, yMin, yMax]);

  const labels = series[0]?.points ?? [];
  if (!labels.length) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.yLegend}>
        <Text style={styles.axisText}>{Math.round(max)}{unit ? ` ${unit}` : ''}</Text>
        <Text style={styles.axisText}>{Math.round(min)}{unit ? ` ${unit}` : ''}</Text>
      </View>
      <Svg width={CHART_WIDTH} height={height}>
        <Line
          x1={PADDING_LEFT}
          y1={PADDING_TOP + plotHeight}
          x2={PADDING_LEFT + plotWidth}
          y2={PADDING_TOP + plotHeight}
          stroke={Theme.colors.border}
          strokeWidth={1}
        />
        {normalized.map((s, si) => (
          <React.Fragment key={`series-${si}`}>
            {s.pts.length > 1 ? (
              <Polyline
                points={s.pts.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke={s.strokeColor}
                strokeWidth={3}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ) : null}
            {s.pts.map((p, i) => (
              <Circle
                key={`pt-${si}-${i}`}
                cx={p.x}
                cy={p.y}
                r={4}
                fill={Theme.colors.surfaceWhite}
                stroke={s.strokeColor}
                strokeWidth={2}
              />
            ))}
          </React.Fragment>
        ))}
      </Svg>
      <View style={[styles.labels, { width: CHART_WIDTH, paddingLeft: PADDING_LEFT, paddingRight: PADDING_RIGHT }]}>
        {labels.map((d, i) => (
          <Text
            key={`lbl-${i}`}
            style={[
              styles.label,
              { width: labels.length === 1 ? plotWidth : plotWidth / (labels.length - 1) },
              i === labels.length - 1 && { textAlign: 'right' },
            ]}
            numberOfLines={1}
          >
            {d.label}
          </Text>
        ))}
      </View>
      {series.length > 1 ? (
        <View style={styles.legendRow}>
          {series.map(s => (
            <View key={s.name ?? s.strokeColor} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: s.strokeColor }]} />
              <Text style={styles.legendText}>{s.name}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  yLegend: {
    position: 'absolute',
    left: 0,
    top: 12,
    height: 140,
    justifyContent: 'space-between',
    width: 40,
    zIndex: 1,
  },
  axisText: { fontSize: 10, color: Theme.colors.textLight, textAlign: 'right' },
  labels: { flexDirection: 'row', marginTop: 4 },
  label: { fontSize: Theme.typography.small, color: Theme.colors.textLight, textAlign: 'left' },
  legendRow: { flexDirection: 'row', gap: Theme.spacing.m, marginTop: Theme.spacing.s },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: Theme.typography.small, color: Theme.colors.textLight },
});
