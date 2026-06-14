import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../constants/theme';
import { InsightsKpiTiles } from '../insights/InsightsKpiTiles';
import { DisciplineHeatmap } from '../insights/DisciplineHeatmap';
import { MedicationAdherenceList } from '../insights/MedicationAdherenceList';
import { DoseStatsPayload, RangeKey } from '../../utils/doseStats';

export type { MedicationDoseStats, DoseStatsPayload } from '../../utils/doseStats';

type Props = {
  doseStats: DoseStatsPayload | null;
  range: RangeKey;
  fromIso: string;
  toIso: string;
};

export function DoseInsightsCard({ doseStats, range, fromIso, toIso }: Props) {
  const { t } = useTranslation();

  if (!doseStats) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('caretaker.insights.sectionDoses')}</Text>
        <Text style={styles.emptyText}>{t('caretaker.insights.dosesEmpty')}</Text>
      </View>
    );
  }

  const hasData =
    (doseStats.counts.totalPlanned ?? 0) > 0 ||
    (doseStats.daily?.length ?? 0) > 0 ||
    (doseStats.byMedication?.length ?? 0) > 0;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t('caretaker.insights.sectionDoses')}</Text>

      {!hasData ? (
        <Text style={styles.emptyText}>{t('caretaker.insights.dosesEmpty')}</Text>
      ) : (
        <>
          <InsightsKpiTiles
            counts={doseStats.counts}
            onTimeTaken={doseStats.onTime?.takenOnTime}
            range={range}
          />
          <DisciplineHeatmap
            daily={doseStats.daily}
            range={range}
            fromIso={fromIso}
            toIso={toIso}
          />
          <MedicationAdherenceList medications={doseStats.byMedication ?? []} />
        </>
      )}
    </View>
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
  emptyText: {
    fontSize: Theme.typography.small,
    color: Theme.colors.textLight,
  },
});
