import React, { useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Line, Polyline, Circle, Text as SvgText } from 'react-native-svg';
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
const PADDING_RIGHT = 16;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 40;

export function NumericLineChart({ series, height = 240, unit, yMin, yMax }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = Math.min(screenWidth - 32, 480);
  const plotWidth = chartWidth - PADDING_LEFT - PADDING_RIGHT;
  const plotHeight = height - PADDING_TOP - PADDING_BOTTOM;

  const { min, max, normalized, gridLines } = useMemo(() => {
    const allValues = series.flatMap(s => s.points.map(p => p.value)).filter(v => Number.isFinite(v));
    if (allValues.length === 0) {
      return {
        min: 0,
        max: 1,
        normalized: [] as { strokeColor: string; pts: { x: number; y: number; value: number }[] }[],
        gridLines: [] as number[],
      };
    }
    const dataMin = Math.min(...allValues);
    const dataMax = Math.max(...allValues);
    const lo = yMin ?? Math.floor(dataMin - (dataMax - dataMin) * 0.1 - 5);
    const hi = yMax ?? Math.ceil(dataMax + (dataMax - dataMin) * 0.1 + 5);
    const span = hi - lo || 1;

    const normalizedSeries = series.map(s => {
      const pts = s.points.map((p, i) => {
        const x =
          s.points.length === 1
            ? PADDING_LEFT + plotWidth / 2
            : PADDING_LEFT + (i / (s.points.length - 1)) * plotWidth;
        const norm = (p.value - lo) / span;
        const y = PADDING_TOP + (1 - Math.max(0, Math.min(1, norm))) * plotHeight;
        return { x, y, value: p.value };
      });
      return { strokeColor: s.strokeColor, pts };
    });

    const lines: number[] = [];
    for (let i = 0; i <= 4; i++) {
      lines.push(lo + (span * i) / 4);
    }

    return { min: lo, max: hi, normalized: normalizedSeries, gridLines: lines };
  }, [series, plotWidth, plotHeight, yMin, yMax]);

  const labels = series[0]?.points ?? [];
  if (!labels.length) return null;

  return (
    <View style={styles.wrap}>
      <Svg width={chartWidth} height={height}>
        {gridLines.map((val, i) => {
          const y = PADDING_TOP + (1 - (val - min) / (max - min || 1)) * plotHeight;
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
        {normalized.map((s, si) => (
          <React.Fragment key={`series-${si}`}>
            {s.pts.length > 1 ? (
              <Polyline
                points={s.pts.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke={s.strokeColor}
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ) : null}
            {s.pts.map((p, i) => (
              <React.Fragment key={`pt-${si}-${i}`}>
                <Circle cx={p.x} cy={p.y} r={5} fill={Theme.colors.surfaceWhite} stroke={s.strokeColor} strokeWidth={2.5} />
                <SvgText
                  x={p.x}
                  y={p.y - 10}
                  fontSize={10}
                  fontWeight="700"
                  fill={Theme.colors.textDark}
                  textAnchor="middle"
                >
                  {Math.round(p.value)}
                </SvgText>
              </React.Fragment>
            ))}
          </React.Fragment>
        ))}
      </Svg>
      {unit ? <Text style={styles.unitHint}>{unit}</Text> : null}
      <View style={[styles.labels, { width: chartWidth, paddingLeft: PADDING_LEFT, paddingRight: PADDING_RIGHT }]}>
        {labels.map((d, i) => {
          const show = d.showLabel !== false && d.label.length > 0;
          if (!show && labels.length > 8) return null;
          return (
          <Text
            key={`lbl-${i}`}
            style={[
              styles.label,
              {
                width: labels.length === 1 ? plotWidth : plotWidth / Math.max(labels.length - 1, 1),
              },
              i === labels.length - 1 && labels.length > 1 && { textAlign: 'right' },
              !show && { opacity: 0 },
            ]}
            numberOfLines={1}
          >
            {d.label}
          </Text>
          );
        })}
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
  wrap: { alignItems: 'center', width: '100%' },
  unitHint: {
    alignSelf: 'flex-end',
    marginRight: 8,
    marginTop: -4,
    fontSize: 10,
    color: Theme.colors.textLight,
  },
  labels: { flexDirection: 'row', marginTop: 4 },
  label: { fontSize: 10, color: Theme.colors.textLight, textAlign: 'left' },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Theme.spacing.m, marginTop: Theme.spacing.s },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: Theme.typography.small, color: Theme.colors.textLight },
});
