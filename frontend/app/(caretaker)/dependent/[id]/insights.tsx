import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Theme } from '../../../../constants/theme';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useGlobalSearchParams, useSegments, useFocusEffect } from 'expo-router';
import { pickDependentUserId } from '../../../../utils/resolveMedsTargetUserId';
import { usersAPI, scheduleAPI } from '../../../../services/api';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { useMeds } from '../../../../context/MedsContext';
import { SimpleBarChart } from '../../../../components/insights/SimpleBarChart';
import { StackedBarChart } from '../../../../components/insights/StackedBarChart';
import { SimpleLineChart } from '../../../../components/insights/SimpleLineChart';
import { useDependentTabTopInset } from '../../../../utils/useDependentTabTopInset';

type RangeKey = 'today' | 'week' | 'month';

interface DoseStatsResponse {
  range: { from: string; to: string };
  counts: { taken: number; late?: number; missed: number; pending: number; totalPlanned: number };
  daily?: Array<{
    date: string;
    taken: number;
    late?: number;
    missed: number;
    pending: number;
    takenOnTime: number;
    takenTotal: number;
  }>;
  onTime: { takenOnTime: number; percentOfTaken: number; windowMinutes: number };
}

interface MoodHistogram {
  [mood: string]: number;
}

interface MoodHistoryResponse {
  range: { from: string; to: string };
  items: Array<{ id: string; mood: string; createdAt: string }>;
  histogram: MoodHistogram;
}

export default function DependentInsightsScreen() {
  const { t } = useTranslation();
  const localParams = useLocalSearchParams<{ id?: string }>();
  const globalParams = useGlobalSearchParams<{ id?: string }>();
  const segments = useSegments();
  const { targetUserId } = useMeds();
  const topInset = useDependentTabTopInset();

  const dependentId = useMemo(
    () =>
      pickDependentUserId({
        localId: localParams.id,
        globalId: globalParams.id,
        segments: segments as string[],
        contextUserId: targetUserId,
      }),
    [localParams.id, globalParams.id, segments, targetUserId],
  );

  const [range, setRange] = useState<RangeKey>('today');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doseStats, setDoseStats] = useState<DoseStatsResponse | null>(null);
  const [moodHistory, setMoodHistory] = useState<MoodHistoryResponse | null>(null);

  const computeRange = useCallback(
    (key: RangeKey) => {
      const now = new Date();
      let from: Date;
      if (key === 'today') {
        from = startOfDay(now);
      } else if (key === 'week') {
        from = startOfDay(subDays(now, 6));
      } else {
        from = startOfDay(subDays(now, 29));
      }
      const to = endOfDay(now);
      return {
        fromIso: from.toISOString(),
        toIso: to.toISOString(),
      };
    },
    [],
  );

  const loadData = useCallback(
    async (currentRange: RangeKey) => {
      if (!dependentId) return;
      setLoading(true);
      setError(null);
      try {
        const { fromIso, toIso } = computeRange(currentRange);
        const [statsResult, moodResult] = await Promise.allSettled([
          scheduleAPI.getStats(dependentId, fromIso, toIso),
          usersAPI.getMoodHistory(dependentId, fromIso, toIso),
        ]);

        setDoseStats(statsResult.status === 'fulfilled' ? statsResult.value : null);
        setMoodHistory(moodResult.status === 'fulfilled' ? moodResult.value : null);

        // Jeśli nie udało się pobrać niczego — pokaż błąd; jeśli tylko część, pokazujemy to co mamy.
        if (
          (statsResult.status === 'rejected' || !statsResult.value) &&
          moodResult.status === 'rejected'
        ) {
          setError(t('caretaker.insights.errorGeneric'));
        }
      } catch (e) {
        setError(t('caretaker.insights.errorGeneric'));
      } finally {
        setLoading(false);
      }
    },
    [computeRange, dependentId, t],
  );

  useFocusEffect(
    useCallback(() => {
      void loadData(range);
    }, [loadData, range]),
  );

  const onChangeRange = (key: RangeKey) => {
    if (key === range) return;
    setRange(key);
  };

  const renderRangeLabel = (key: RangeKey) => {
    if (key === 'today') return t('caretaker.insights.range.today');
    if (key === 'week') return t('caretaker.insights.range.week');
    return t('caretaker.insights.range.month');
  };

  const renderMoodLine = () => {
    if (!moodHistory?.items?.length) {
      return <Text style={styles.emptyText}>{t('caretaker.insights.moodEmpty')}</Text>;
    }

    const moodValue = (m: string) => (m === 'happy' ? 1 : m === 'neutral' ? 0.5 : 0);

    let chartData: Array<{ label: string; value: number }>;

    if (range === 'today') {
      // 1 punkt dla każdej zarejestrowanej buźki (`MoodLog`) dzisiaj.
      const itemsSorted = [...moodHistory.items].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );

      chartData = itemsSorted.map((it) => {
        const d = new Date(it.createdAt);
        return {
          label: `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`,
          value: moodValue(it.mood),
        };
      });
    } else {
      // Dla tygodnia i miesiąca: średnia buziek z każdego dnia.
      const byDay = new Map<string, { sum: number; count: number }>();
      for (const it of moodHistory.items) {
        const d = new Date(it.createdAt);
        if (Number.isNaN(d.getTime())) continue;
        const day = d.toISOString().slice(0, 10); // yyyy-mm-dd (UTC)
        const v = moodValue(it.mood);
        const cur = byDay.get(day) ?? { sum: 0, count: 0 };
        cur.sum += v;
        cur.count += 1;
        byDay.set(day, cur);
      }

      const daysSorted = Array.from(byDay.entries())
        .map(([day, agg]) => ({ day, avg: agg.count ? agg.sum / agg.count : 0 }))
        .sort((a, b) => a.day.localeCompare(b.day));

      chartData = daysSorted.map((d) => ({
        label: d.day.slice(5, 10), // MM-DD
        value: d.avg, // 0..1
      }));
    }

    return <SimpleLineChart data={chartData} height={200} strokeColor={Theme.colors.accentOrange} />;
  };

  const renderDoseChart = () => {
    if (!doseStats?.daily?.length) return null;
    const daily = doseStats.daily;
    const maxPoints = range === 'today' ? 1 : range === 'week' ? 7 : 10; // dla miesiąca pokażmy ~10 punktów (co kilka dni) później dopracujemy
    const slice = daily.slice(-maxPoints);
    const chartData = slice.map((d) => ({
      label: d.date.slice(5),
      segments: [
        // TAKEN = on-time
        { value: d.takenOnTime, color: Theme.colors.success },
        // LATE
        { value: d.late ?? Math.max(0, d.taken - d.takenOnTime), color: Theme.colors.accentOrange },
        // MISSED (inna barwa niż "late", żeby nie mylić)
        { value: d.missed, color: '#D15C5C' },
      ],
    }));

    return <StackedBarChart data={chartData} height={220} />;
  };

  const renderDoseSummary = () => {
    if (!doseStats) {
      return <Text style={styles.emptyText}>{t('caretaker.insights.dosesEmpty')}</Text>;
    }
    const { counts, onTime } = doseStats;
    return (
      <View>
        {renderDoseChart()}
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>{t('caretaker.insights.dosesTaken')}</Text>
          <Text style={styles.metricValue}>{counts.taken}</Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>{t('caretaker.insights.dosesLate')}</Text>
          <Text style={styles.metricValue}>{counts.late ?? 0}</Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>{t('caretaker.insights.dosesMissed')}</Text>
          <Text style={styles.metricValue}>{counts.missed}</Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>{t('caretaker.insights.dosesPlanned')}</Text>
          <Text style={styles.metricValue}>{counts.totalPlanned}</Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>
            {t('caretaker.insights.dosesOnTime', { window: onTime.windowMinutes })}
          </Text>
          <Text style={styles.metricValue}>
            {onTime.percentOfTaken}%
          </Text>
        </View>
      </View>
    );
  };

  const currentRangeLabel = useMemo(() => {
    if (!doseStats) return '';
    const from = new Date(doseStats.range.from);
    const to = new Date(doseStats.range.to);
    const sameDay = format(from, 'yyyy-MM-dd') === format(to, 'yyyy-MM-dd');
    if (sameDay) {
      return format(from, 'dd.MM.yyyy');
    }
    return `${format(from, 'dd.MM.yyyy')} – ${format(to, 'dd.MM.yyyy')}`;
  }, [doseStats]);

  return (
    <View style={{ flex: 1, backgroundColor: Theme.colors.background }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: topInset + Theme.spacing.l }]}
      >
        <Text style={styles.title}>{t('caretaker.insights.title')}</Text>

        <View style={styles.rangeSwitcher}>
          {(['today', 'week', 'month'] as RangeKey[]).map((key) => {
            const active = key === range;
            return (
              <Pressable
                key={key}
                onPress={() => onChangeRange(key)}
                style={[
                  styles.rangeChip,
                  active && styles.rangeChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.rangeChipLabel,
                    active && styles.rangeChipLabelActive,
                  ]}
                >
                  {renderRangeLabel(key)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {currentRangeLabel ? (
          <Text style={styles.rangeHint}>
            {t('caretaker.insights.rangeLabel', { range: currentRangeLabel })}
          </Text>
        ) : null}

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={Theme.colors.accentOrange} />
            <Text style={styles.loadingText}>{t('caretaker.insights.loading')}</Text>
          </View>
        )}

        {error && !loading && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        {!loading && !error && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('caretaker.insights.sectionDoses')}</Text>
              {renderDoseSummary()}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('caretaker.insights.sectionMood')}</Text>
              {renderMoodLine()}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  content: {
    padding: Theme.spacing.l,
    paddingBottom: Theme.spacing.xl,
  },
  title: {
    fontSize: Theme.typography.title,
    fontWeight: 'bold',
    color: Theme.colors.textDark,
    marginBottom: Theme.spacing.m,
  },
  rangeSwitcher: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.surfaceGrey,
    borderRadius: 999,
    padding: 4,
    marginBottom: Theme.spacing.s,
  },
  rangeChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: 'center',
  },
  rangeChipActive: {
    backgroundColor: Theme.colors.surfaceWhite,
  },
  rangeChipLabel: {
    fontSize: Theme.typography.small,
    fontWeight: '600',
    color: Theme.colors.textLight,
  },
  rangeChipLabelActive: {
    color: Theme.colors.textDark,
  },
  rangeHint: {
    fontSize: Theme.typography.caption,
    color: Theme.colors.textLight,
    marginBottom: Theme.spacing.m,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.m,
  },
  loadingText: {
    marginLeft: Theme.spacing.s,
    color: Theme.colors.textLight,
  },
  errorText: {
    color: Theme.colors.error || '#b00020',
    marginVertical: Theme.spacing.m,
  },
  card: {
    backgroundColor: Theme.colors.surfaceWhite,
    borderRadius: 12,
    padding: Theme.spacing.m,
    marginBottom: Theme.spacing.m,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  cardTitle: {
    fontSize: Theme.typography.body,
    fontWeight: '700',
    color: Theme.colors.textDark,
    marginBottom: Theme.spacing.s,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: Theme.typography.small,
    color: Theme.colors.textLight,
  },
  metricValue: {
    fontSize: Theme.typography.small,
    fontWeight: '700',
    color: Theme.colors.textDark,
  },
  emptyText: {
    fontSize: Theme.typography.small,
    color: Theme.colors.textLight,
  },
  moodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  moodEmoji: {
    fontSize: 20,
    width: 28,
  },
  moodBarContainer: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: Theme.colors.surfaceGrey,
    marginHorizontal: Theme.spacing.s,
    overflow: 'hidden',
  },
  moodBarFill: {
    height: 8,
    backgroundColor: Theme.colors.accentOrange,
  },
  moodLabel: {
    fontSize: Theme.typography.small,
    color: Theme.colors.textDark,
    minWidth: 60,
    textAlign: 'right',
  },
});
