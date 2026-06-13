import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../constants/theme';
import { DoseCounts, RangeKey, getAdherenceColor, getCountsAdherence } from '../../utils/doseStats';

type Props = {
  counts: DoseCounts;
  range: RangeKey;
};

export function InsightsKpiTiles({ counts, range }: Props) {
  const { t } = useTranslation();
  const adherence = getCountsAdherence(counts);
  const adherenceColor = getAdherenceColor(adherence);
  const missed = counts.missed ?? 0;

  const adherenceSubtitleKey =
    range === 'today'
      ? 'caretaker.insights.adherenceSubtitleToday'
      : range === 'week'
        ? 'caretaker.insights.adherenceSubtitleWeek'
        : 'caretaker.insights.adherenceSubtitleMonth';

  return (
    <View style={styles.row}>
      <View style={[styles.tile, { backgroundColor: `${adherenceColor}14`, borderColor: `${adherenceColor}33` }]}>
        <MaterialIcons name="trending-up" size={22} color={adherenceColor} />
        <Text style={[styles.value, { color: adherenceColor }]}>{adherence}%</Text>
        <Text style={styles.label}>{t('caretaker.insights.adherenceRate')}</Text>
        <Text style={styles.subtitle}>{t(adherenceSubtitleKey, { percent: adherence })}</Text>
      </View>

      <View style={[styles.tile, styles.missedTile]}>
        <MaterialIcons name="cancel" size={22} color="#C23D3D" />
        <Text style={[styles.value, styles.missedValue]}>{missed}</Text>
        <Text style={styles.label}>{t('caretaker.insights.missedDosesTitle')}</Text>
        <Text style={styles.subtitle}>
          {range === 'today'
            ? t('caretaker.insights.missedSubtitleToday')
            : range === 'week'
              ? t('caretaker.insights.missedSubtitleWeek')
              : t('caretaker.insights.missedSubtitleMonth')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Theme.spacing.s,
    marginBottom: Theme.spacing.m,
  },
  tile: {
    flex: 1,
    borderRadius: Theme.borderRadius.medium,
    borderWidth: 1,
    padding: Theme.spacing.m,
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceWhite,
  },
  missedTile: {
    backgroundColor: 'rgba(194, 61, 61, 0.08)',
    borderColor: 'rgba(194, 61, 61, 0.2)',
  },
  value: {
    fontSize: 28,
    fontWeight: '800',
    marginTop: 4,
  },
  missedValue: {
    color: '#C23D3D',
  },
  label: {
    fontSize: Theme.typography.caption,
    fontWeight: '700',
    color: Theme.colors.textDark,
    marginTop: 2,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Theme.typography.small,
    color: Theme.colors.textLight,
    marginTop: 2,
    textAlign: 'center',
  },
});
