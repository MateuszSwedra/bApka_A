import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../constants/theme';
import { MOOD_VISUAL } from '../../constants/moodVisual';
import { MoodIcon } from '../mood/MoodIcon';
import type { MoodDistributionRow } from '../../utils/moodDistribution';

type Props = {
  rows: MoodDistributionRow[];
};

export function MoodDistributionSummary({ rows }: Props) {
  const { t } = useTranslation();

  if (rows.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t('caretaker.insights.moodDistributionTitle')}</Text>
      {rows.map((row) => (
        <View key={row.mood} style={styles.row}>
          <MoodIcon mood={row.mood} size="sm" />
          <Text style={[styles.label, { color: MOOD_VISUAL[row.mood].color }]}>
            {t(`caretaker.insights.moodLabel.${row.mood}`)}
          </Text>
          <Text style={styles.percent}>
            {t('caretaker.insights.moodDistributionLine', {
              percent: row.percent,
              count: row.count,
            })}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: Theme.spacing.m,
    paddingTop: Theme.spacing.m,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    gap: 8,
  },
  title: {
    fontSize: Theme.typography.caption,
    fontWeight: '700',
    color: Theme.colors.textDark,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  label: {
    flex: 1,
    fontSize: Theme.typography.small,
    fontWeight: '600',
  },
  percent: {
    fontSize: Theme.typography.small,
    fontWeight: '700',
    color: Theme.colors.textDark,
  },
});
