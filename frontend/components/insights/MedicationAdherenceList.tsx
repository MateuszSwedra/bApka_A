import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../constants/theme';
import {
  MedicationDoseStats,
  getAdherenceColor,
  sortMedicationsByAdherence,
} from '../../utils/doseStats';

type Props = {
  medications: MedicationDoseStats[];
};

export function MedicationAdherenceList({ medications }: Props) {
  const { t } = useTranslation();
  const sorted = useMemo(() => sortMedicationsByAdherence(medications), [medications]);

  if (!sorted.length) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{t('caretaker.insights.medicationBreakdown')}</Text>
      {sorted.map((med) => {
        const percent = med.percent ?? 0;
        const barColor = med.percent != null ? getAdherenceColor(percent) : Theme.colors.textLight;
        return (
          <View key={med.medKey} style={styles.row}>
            <View style={styles.rowHeader}>
              <Text style={styles.medName} numberOfLines={1}>
                {med.name}
              </Text>
              <Text style={[styles.percent, { color: barColor }]}>
                {med.percent != null
                  ? t('caretaker.insights.medicationAdherencePercent', { percent })
                  : '—'}
              </Text>
            </View>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  {
                    width: `${Math.min(100, Math.max(0, percent))}%`,
                    backgroundColor: barColor,
                  },
                ]}
              />
            </View>
            <Text style={styles.detail}>
              {t('caretaker.insights.medicationDetail', {
                taken: med.taken,
                planned: med.planned,
              })}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Theme.spacing.s,
  },
  title: {
    fontSize: Theme.typography.caption,
    fontWeight: '700',
    color: Theme.colors.textDark,
    marginBottom: Theme.spacing.s,
  },
  row: {
    marginBottom: Theme.spacing.m,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: Theme.spacing.s,
  },
  medName: {
    flex: 1,
    fontSize: Theme.typography.body,
    fontWeight: '600',
    color: Theme.colors.textDark,
  },
  percent: {
    fontSize: Theme.typography.body,
    fontWeight: '800',
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Theme.colors.surfaceGrey,
    overflow: 'hidden',
  },
  fill: {
    height: 8,
    borderRadius: 4,
  },
  detail: {
    fontSize: Theme.typography.small,
    color: Theme.colors.textLight,
    marginTop: 4,
  },
});
