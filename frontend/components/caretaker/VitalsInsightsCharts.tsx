import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../constants/theme';
import { usersAPI } from '../../services/api';
import { NumericLineChart } from '../insights/NumericLineChart';

type HealthMetricLog = {
  type: string;
  value?: number | null;
  systolic?: number | null;
  diastolic?: number | null;
  measuredAt: string;
};

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
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [glucoseLogs, setGlucoseLogs] = useState<HealthMetricLog[]>([]);
  const [bpLogs, setBpLogs] = useState<HealthMetricLog[]>([]);

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

  const glucoseSeries = useMemo(() => {
    const sorted = [...glucoseLogs]
      .filter(l => typeof l.value === 'number')
      .sort((a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime());
    return sorted.map(l => ({
      label: format(new Date(l.measuredAt), 'dd.MM HH:mm'),
      value: l.value as number,
    }));
  }, [glucoseLogs]);

  const bpSeries = useMemo(() => {
    const sorted = [...bpLogs]
      .filter(l => typeof l.systolic === 'number')
      .sort((a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime());
    const sys = sorted.map(l => ({
      label: format(new Date(l.measuredAt), 'dd.MM HH:mm'),
      value: l.systolic as number,
    }));
    const dia = sorted
      .filter(l => typeof l.diastolic === 'number')
      .map(l => ({
        label: format(new Date(l.measuredAt), 'dd.MM HH:mm'),
        value: l.diastolic as number,
      }));
    return { sys, dia };
  }, [bpLogs]);

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
            yMin={50}
            yMax={250}
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
            yMin={60}
            yMax={180}
          />
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
