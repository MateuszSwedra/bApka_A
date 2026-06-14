import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { parseISO } from 'date-fns';
import { enUS, pl } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../constants/theme';
import { usersAPI } from '../../services/api';
import { NumericLineChart } from '../insights/NumericLineChart';
import { VitalsDailyList } from '../insights/VitalsDailyList';
import {
  buildBpChartSeries,
  buildBpDayGroups,
  buildGlucoseChartPoints,
  buildGlucoseDayGroups,
  formatBpValue,
  formatGlucoseValue,
  type VitalsLog,
} from '../../utils/vitalsInsights';

type VitalsInsightsChartsProps = {
  userId: string | null;
  fromIso: string;
  toIso: string;
  vitalsEntryEnabled: boolean;
};

export function VitalsInsightsCharts({
  userId,
  fromIso,
  toIso,
  vitalsEntryEnabled,
}: VitalsInsightsChartsProps) {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [glucoseLogs, setGlucoseLogs] = useState<VitalsLog[]>([]);
  const [bpLogs, setBpLogs] = useState<VitalsLog[]>([]);

  const locale = i18n.language.startsWith('pl') ? pl : enUS;
  const rangeFrom = useMemo(() => parseISO(fromIso), [fromIso]);
  const rangeTo = useMemo(() => parseISO(toIso), [toIso]);

  useEffect(() => {
    if (!userId || !vitalsEntryEnabled) {
      setGlucoseLogs([]);
      setBpLogs([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const [glucose, bp] = await Promise.all([
          usersAPI.listMetrics(userId, fromIso, toIso, 'GLUCOSE'),
          usersAPI.listMetrics(userId, fromIso, toIso, 'BP'),
        ]);
        if (cancelled) return;
        setGlucoseLogs(Array.isArray(glucose) ? glucose : []);
        setBpLogs(Array.isArray(bp) ? bp : []);
      } catch {
        if (!cancelled) {
          setGlucoseLogs([]);
          setBpLogs([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, fromIso, toIso, vitalsEntryEnabled]);

  const glucoseSeries = useMemo(
    () => buildGlucoseChartPoints(glucoseLogs),
    [glucoseLogs],
  );

  const bpSeries = useMemo(() => buildBpChartSeries(bpLogs), [bpLogs]);

  const glucoseDays = useMemo(
    () =>
      buildGlucoseDayGroups(glucoseLogs, rangeFrom, rangeTo, locale, formatGlucoseValue),
    [glucoseLogs, rangeFrom, rangeTo, locale],
  );

  const bpDays = useMemo(
    () => buildBpDayGroups(bpLogs, rangeFrom, rangeTo, locale, formatBpValue),
    [bpLogs, rangeFrom, rangeTo, locale],
  );

  if (!vitalsEntryEnabled) return null;

  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color={Theme.colors.primaryLimeDark} />
      </View>
    );
  }

  const hasGlucose = glucoseSeries.length > 0;
  const hasBp = bpSeries.sys.length > 0;

  if (!hasGlucose && !hasBp) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('caretaker.insights.vitals.title')}</Text>
        <Text style={styles.emptyText}>{t('caretaker.insights.vitals.empty')}</Text>
      </View>
    );
  }

  return (
    <>
      {hasGlucose ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('caretaker.insights.vitals.glucose')}</Text>
          <NumericLineChart
            series={[{ points: glucoseSeries, strokeColor: Theme.colors.accentOrange }]}
            unit="mg/dL"
            yMin={60}
            yMax={250}
          />
          <VitalsDailyList
            days={glucoseDays}
            title={t('caretaker.insights.vitals.dailyReadings')}
          />
        </View>
      ) : null}

      {hasBp ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('caretaker.insights.vitals.bp')}</Text>
          <NumericLineChart
            series={[
              {
                points: bpSeries.sys,
                strokeColor: Theme.colors.primaryLimeDark,
                name: t('dependent.metrics.systolic'),
              },
              ...(bpSeries.dia.length > 0
                ? [
                    {
                      points: bpSeries.dia,
                      strokeColor: Theme.colors.accentOrange,
                      name: t('dependent.metrics.diastolic'),
                    },
                  ]
                : []),
            ]}
            unit="mmHg"
            yMin={80}
            yMax={200}
          />
          <VitalsDailyList days={bpDays} title={t('caretaker.insights.vitals.dailyReadings')} />
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
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
  emptyText: { fontSize: Theme.typography.small, color: Theme.colors.textLight },
  loadingBox: { paddingVertical: Theme.spacing.m, alignItems: 'center' },
});
