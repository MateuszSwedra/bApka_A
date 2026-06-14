import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../constants/theme';
import { DoseCounts, RangeKey, getOnTimeRatio } from '../../utils/doseStats';

type Props = {
  counts: DoseCounts;
  onTimeTaken?: number;
  range: RangeKey;
};

export function InsightsKpiTiles({ counts, onTimeTaken, range }: Props) {
  const { t } = useTranslation();
  const { takenOnTime, totalPlanned } = getOnTimeRatio(counts, onTimeTaken);
  const late = counts.late ?? 0;
  const missed = counts.missed ?? 0;

  const periodKey =
    range === 'today'
      ? 'caretaker.insights.statsPeriodToday'
      : range === 'week'
        ? 'caretaker.insights.statsPeriodWeek'
        : 'caretaker.insights.statsPeriodMonth';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <MaterialIcons name="medication" size={22} color={Theme.colors.accentOrange} />
        <Text style={styles.title}>{t('caretaker.insights.adherenceRate')}</Text>
        <Text style={styles.period}>{t(periodKey)}</Text>
      </View>

      <View style={styles.statsList}>
        <View style={styles.statRow}>
          <View style={[styles.dot, { backgroundColor: '#1F7A4D' }]} />
          <Text style={styles.statText}>
            {t('caretaker.insights.statOnTime', {
              onTime: takenOnTime,
              total: totalPlanned,
            })}
          </Text>
        </View>

        <View style={styles.statRow}>
          <View style={[styles.dot, { backgroundColor: '#E9A43D' }]} />
          <Text style={styles.statText}>
            {t('caretaker.insights.statLate', { count: late })}
          </Text>
        </View>

        <View style={styles.statRow}>
          <View style={[styles.dot, { backgroundColor: '#C23D3D' }]} />
          <Text style={styles.statText}>
            {t('caretaker.insights.statMissed', { count: missed })}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.m,
    marginBottom: Theme.spacing.m,
    backgroundColor: Theme.colors.surfaceWhite,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Theme.spacing.s,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: Theme.typography.body,
    fontWeight: '700',
    color: Theme.colors.textDark,
    flex: 1,
  },
  period: {
    fontSize: Theme.typography.caption,
    color: Theme.colors.textLight,
    width: '100%',
    marginLeft: 30,
  },
  statsList: {
    gap: 10,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statText: {
    flex: 1,
    fontSize: Theme.typography.body,
    fontWeight: '600',
    color: Theme.colors.textDark,
  },
});
