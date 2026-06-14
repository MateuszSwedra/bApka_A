import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Theme } from '../../../../constants/theme';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useGlobalSearchParams, useSegments, useFocusEffect } from 'expo-router';
import { pickDependentUserId } from '../../../../utils/resolveMedsTargetUserId';
import { usersAPI, scheduleAPI } from '../../../../services/api';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { useMeds } from '../../../../context/MedsContext';
import { useDependentTabTopInset } from '../../../../utils/useDependentTabTopInset';
import { VitalsInsightsCharts } from '../../../../components/caretaker/VitalsInsightsCharts';
import { DoseInsightsCard } from '../../../../components/caretaker/DoseInsightsCard';
import { MoodWeekChart } from '../../../../components/insights/MoodWeekChart';
import { MoodDistributionSummary } from '../../../../components/insights/MoodDistributionSummary';
import { CaretakerTourAnchor } from '../../../../components/caretaker/CaretakerTourAnchor';
import {
  CaretakerTourScrollProvider,
  CaretakerTourScrollView,
} from '../../../../context/CaretakerTourScrollContext';
import { buildMoodDayCells } from '../../../../utils/moodWeekChart';
import { buildMoodDistribution } from '../../../../utils/moodDistribution';
import { DoseStatsPayload } from '../../../../utils/doseStats';
import { enUS, pl } from 'date-fns/locale';

type RangeKey = 'today' | 'week' | 'month';

interface DoseStatsResponse extends DoseStatsPayload {}

interface MoodHistogram {
  [mood: string]: number;
}

interface MoodHistoryResponse {
  range: { from: string; to: string };
  items: Array<{ id: string; mood: string; createdAt: string }>;
  histogram: MoodHistogram;
}

export default function DependentInsightsScreen() {
  const { t, i18n } = useTranslation();
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
  const [vitalsEntryEnabled, setVitalsEntryEnabled] = useState(false);

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

  const rangeBounds = useMemo(() => computeRange(range), [computeRange, range]);

  const loadData = useCallback(
    async (currentRange: RangeKey) => {
      if (!dependentId) return;
      setLoading(true);
      setError(null);
      try {
        const { fromIso, toIso } = computeRange(currentRange);
        const [statsResult, moodResult, depsResult] = await Promise.allSettled([
          scheduleAPI.getStats(dependentId, fromIso, toIso),
          usersAPI.getMoodHistory(dependentId, fromIso, toIso),
          usersAPI.getDependents(),
        ]);

        setDoseStats(statsResult.status === 'fulfilled' ? statsResult.value : null);
        setMoodHistory(moodResult.status === 'fulfilled' ? moodResult.value : null);
        if (depsResult.status === 'fulfilled' && Array.isArray(depsResult.value)) {
          const dep = depsResult.value.find((d: { id?: string }) => d.id === dependentId);
          setVitalsEntryEnabled(dep?.vitalsEntryEnabled ?? false);
        }

        // Jeśli nie udało się pobrać niczego - pokaż błąd; jeśli tylko część, pokazujemy to co mamy.
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

  const moodChartSubtitle = useMemo(() => {
    if (range === 'today') return t('caretaker.insights.moodSubtitleToday');
    if (range === 'week') return t('caretaker.insights.moodSubtitleWeek');
    return t('caretaker.insights.moodSubtitleMonth');
  }, [range, t]);

  const moodDayCells = useMemo(() => {
    if (!moodHistory?.items) return [];
    const locale = i18n.language.startsWith('pl') ? pl : enUS;
    const from = new Date(rangeBounds.fromIso);
    const to = new Date(rangeBounds.toIso);
    return buildMoodDayCells(moodHistory.items, from, to, locale);
  }, [moodHistory, rangeBounds.fromIso, rangeBounds.toIso, i18n.language]);

  const moodDistribution = useMemo(
    () => buildMoodDistribution(moodHistory?.histogram),
    [moodHistory?.histogram],
  );

  const renderMoodChart = () => {
    if (!moodHistory || moodDayCells.length === 0) {
      return <Text style={styles.emptyText}>{t('caretaker.insights.moodEmpty')}</Text>;
    }

    const hasAnyMood = moodDayCells.some((d) => d.mood != null);

    return (
      <>
        <MoodWeekChart days={moodDayCells} subtitle={moodChartSubtitle} />
        {!hasAnyMood ? (
          <Text style={[styles.emptyText, styles.emptyHint]}>
            {t('caretaker.insights.moodEmpty')}
          </Text>
        ) : null}
        {moodDistribution ? <MoodDistributionSummary rows={moodDistribution} /> : null}
      </>
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
    <CaretakerTourScrollProvider>
      <View style={{ flex: 1, backgroundColor: Theme.colors.background }}>
        <CaretakerTourScrollView
          style={styles.container}
          contentContainerStyle={[styles.content, { paddingTop: topInset + Theme.spacing.l }]}
        >
        <Text style={styles.title}>{t('caretaker.insights.title')}</Text>

        <CaretakerTourAnchor
          stepId="insights-range"
          titleKey="caretaker.tour.insightsRange.title"
          bodyKey="caretaker.tour.insightsRange.body"
          placement="bottom"
          wrapStyle={styles.rangeSwitcherWrap}
        >
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
        </CaretakerTourAnchor>

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
            <DoseInsightsCard
              doseStats={doseStats}
              range={range}
              fromIso={rangeBounds.fromIso}
              toIso={rangeBounds.toIso}
            />

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{t('caretaker.insights.sectionMood')}</Text>
              </View>
              {renderMoodChart()}
            </View>

            <VitalsInsightsCharts
              userId={dependentId}
              fromIso={rangeBounds.fromIso}
              toIso={rangeBounds.toIso}
              vitalsEntryEnabled={vitalsEntryEnabled}
            />
          </>
        )}
        </CaretakerTourScrollView>
      </View>
    </CaretakerTourScrollProvider>
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
  rangeSwitcherWrap: {
    width: '100%',
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
  },
  cardHeader: {
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
  emptyHint: {
    marginTop: Theme.spacing.m,
    textAlign: 'center',
  },
});
