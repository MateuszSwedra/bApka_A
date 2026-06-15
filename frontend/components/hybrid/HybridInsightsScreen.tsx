import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Theme } from '../../constants/theme';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from 'expo-router';
import { usersAPI, scheduleAPI } from '../../services/api';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { DoseInsightsCard } from '../caretaker/DoseInsightsCard';
import { VitalsInsightsCharts } from '../caretaker/VitalsInsightsCharts';
import { useDependentTabTopInset } from '../../utils/useDependentTabTopInset';
import { useTabScreenScrollBottomPadding } from '../../utils/safeAreaInsets';
import { useSelfUserId } from '../../hooks/useSelfUserId';
import { SeniorTourAnchor } from '../senior/SeniorTourAnchor';
import {
  CaretakerTourScrollProvider,
  CaretakerTourScrollView,
} from '../../context/CaretakerTourScrollContext';

type RangeKey = 'today' | 'week' | 'month';

export default function HybridInsightsScreen() {
  const { t } = useTranslation();
  const selfUserId = useSelfUserId();
  const topInset = useDependentTabTopInset();
  const scrollBottomPadding = useTabScreenScrollBottomPadding();
  const [range, setRange] = useState<RangeKey>('today');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doseStats, setDoseStats] = useState<any>(null);
  const [vitalsEntryEnabled, setVitalsEntryEnabled] = useState(false);

  const computeRange = useCallback((key: RangeKey) => {
    const now = new Date();
    const from = key === 'today' ? startOfDay(now) : key === 'week' ? startOfDay(subDays(now, 6)) : startOfDay(subDays(now, 29));
    return { fromIso: from.toISOString(), toIso: endOfDay(now).toISOString() };
  }, []);

  const rangeBounds = useMemo(() => computeRange(range), [computeRange, range]);

  const loadData = useCallback(
    async (currentRange: RangeKey) => {
      if (!selfUserId) return;
      setLoading(true);
      setError(null);
      try {
        const { fromIso, toIso } = computeRange(currentRange);
        const [statsResult, meResult] = await Promise.allSettled([
          scheduleAPI.getStats(selfUserId, fromIso, toIso),
          usersAPI.getMe(),
        ]);
        setDoseStats(statsResult.status === 'fulfilled' ? statsResult.value : null);
        if (meResult.status === 'fulfilled') {
          setVitalsEntryEnabled(meResult.value?.vitalsEntryEnabled ?? false);
        }
        if (statsResult.status === 'rejected' || !statsResult.value) {
          setError(t('caretaker.insights.errorGeneric'));
        }
      } catch {
        setError(t('caretaker.insights.errorGeneric'));
      } finally {
        setLoading(false);
      }
    },
    [computeRange, selfUserId, t],
  );

  useFocusEffect(useCallback(() => { void loadData(range); }, [loadData, range]));

  const renderRangeLabel = (key: RangeKey) => {
    if (key === 'today') return t('caretaker.insights.range.today');
    if (key === 'week') return t('caretaker.insights.range.week');
    return t('caretaker.insights.range.month');
  };

  const currentRangeLabel = useMemo(() => {
    if (!doseStats) return '';
    const from = new Date(doseStats.range.from);
    const to = new Date(doseStats.range.to);
    return format(from, 'yyyy-MM-dd') === format(to, 'yyyy-MM-dd')
      ? format(from, 'dd.MM.yyyy')
      : `${format(from, 'dd.MM.yyyy')} – ${format(to, 'dd.MM.yyyy')}`;
  }, [doseStats]);

  return (
    <CaretakerTourScrollProvider>
    <View style={{ flex: 1, backgroundColor: Theme.colors.background }}>
      <CaretakerTourScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: topInset + Theme.spacing.l, paddingBottom: scrollBottomPadding }]}>
        <Text style={styles.title}>{t('caretaker.insights.title')}</Text>
        <SeniorTourAnchor
          stepId="insights-range"
          titleKey="senior.tour.insightsRange.title"
          bodyKey="senior.tour.insightsRange.body"
          placement="bottom"
          wrapStyle={styles.rangeSwitcherWrap}
        >
        <View style={styles.rangeSwitcher}>
          {(['today', 'week', 'month'] as RangeKey[]).map(key => (
            <Pressable key={key} onPress={() => setRange(key)} style={[styles.rangeChip, key === range && styles.rangeChipActive]}>
              <Text style={[styles.rangeChipLabel, key === range && styles.rangeChipLabelActive]}>{renderRangeLabel(key)}</Text>
            </Pressable>
          ))}
        </View>
        </SeniorTourAnchor>
        {currentRangeLabel ? <Text style={styles.rangeHint}>{t('caretaker.insights.rangeLabel', { range: currentRangeLabel })}</Text> : null}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={Theme.colors.accentOrange} />
            <Text style={styles.loadingText}>{t('caretaker.insights.loading')}</Text>
          </View>
        ) : null}
        {error && !loading ? <Text style={styles.errorText}>{error}</Text> : null}
        {!loading && !error ? (
          <>
            <DoseInsightsCard
              doseStats={doseStats}
              range={range}
              fromIso={rangeBounds.fromIso}
              toIso={rangeBounds.toIso}
            />
            <VitalsInsightsCharts
              userId={selfUserId}
              fromIso={rangeBounds.fromIso}
              toIso={rangeBounds.toIso}
              vitalsEntryEnabled={vitalsEntryEnabled}
            />
          </>
        ) : null}
      </CaretakerTourScrollView>
    </View>
    </CaretakerTourScrollProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  content: { padding: Theme.spacing.l },
  title: { fontSize: Theme.typography.title, fontWeight: 'bold', color: Theme.colors.textDark, marginBottom: Theme.spacing.m },
  rangeSwitcherWrap: { width: '100%' },
  rangeSwitcher: { flexDirection: 'row', backgroundColor: Theme.colors.surfaceGrey, borderRadius: 999, padding: 4, marginBottom: Theme.spacing.s },
  rangeChip: { flex: 1, paddingVertical: 8, borderRadius: 999, alignItems: 'center' },
  rangeChipActive: { backgroundColor: Theme.colors.surfaceWhite },
  rangeChipLabel: { fontSize: Theme.typography.small, fontWeight: '600', color: Theme.colors.textLight },
  rangeChipLabelActive: { color: Theme.colors.textDark },
  rangeHint: { fontSize: Theme.typography.caption, color: Theme.colors.textLight, marginBottom: Theme.spacing.m },
  loadingBox: { flexDirection: 'row', alignItems: 'center', paddingVertical: Theme.spacing.m },
  loadingText: { marginLeft: Theme.spacing.s, color: Theme.colors.textLight },
  errorText: { color: '#b00020', marginVertical: Theme.spacing.m },
});
