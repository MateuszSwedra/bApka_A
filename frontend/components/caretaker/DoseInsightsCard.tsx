import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../constants/theme';

export type MedicationDoseStats = {
  medKey: string;
  name: string;
  taken: number;
  late: number;
  missed: number;
  pending: number;
};

export type DoseStatsPayload = {
  counts: { taken: number; late: number; missed: number; pending: number };
  byMedication?: MedicationDoseStats[];
};

type Props = {
  doseStats: DoseStatsPayload | null;
};

const ALL_KEY = '__all__';

export function DoseInsightsCard({ doseStats }: Props) {
  const { t } = useTranslation();
  const [selectedMedKey, setSelectedMedKey] = useState(ALL_KEY);

  const medications = useMemo(
    () => doseStats?.byMedication ?? [],
    [doseStats?.byMedication],
  );

  const activeStats = useMemo(() => {
    if (!doseStats) return null;
    if (selectedMedKey === ALL_KEY) {
      return {
        taken: doseStats.counts.taken,
        missed: doseStats.counts.missed,
        late: doseStats.counts.late ?? 0,
      };
    }
    const med = medications.find(m => m.medKey === selectedMedKey);
    if (!med) return null;
    return { taken: med.taken, missed: med.missed, late: med.late };
  }, [doseStats, selectedMedKey, medications]);

  if (!doseStats) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('caretaker.insights.sectionDoses')}</Text>
        <Text style={styles.emptyText}>{t('caretaker.insights.dosesEmpty')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t('caretaker.insights.sectionDoses')}</Text>

      {medications.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          <Pressable
            onPress={() => setSelectedMedKey(ALL_KEY)}
            style={[styles.chip, selectedMedKey === ALL_KEY && styles.chipActive]}
          >
            <Text style={[styles.chipText, selectedMedKey === ALL_KEY && styles.chipTextActive]}>
              {t('caretaker.insights.allMedications')}
            </Text>
          </Pressable>
          {medications.map(med => (
            <Pressable
              key={med.medKey}
              onPress={() => setSelectedMedKey(med.medKey)}
              style={[styles.chip, selectedMedKey === med.medKey && styles.chipActive]}
            >
              <Text
                style={[styles.chipText, selectedMedKey === med.medKey && styles.chipTextActive]}
                numberOfLines={1}
              >
                {med.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {activeStats ? (
        <View style={styles.summary}>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>{t('caretaker.insights.dosesTaken')}</Text>
            <Text style={styles.metricValue}>{activeStats.taken}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>{t('caretaker.insights.dosesMissed')}</Text>
            <Text style={styles.metricValue}>{activeStats.missed}</Text>
          </View>
          {activeStats.late > 0 ? (
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>{t('caretaker.insights.dosesLate')}</Text>
              <Text style={[styles.metricValue, styles.lateValue]}>{activeStats.late}</Text>
            </View>
          ) : null}
        </View>
      ) : (
        <Text style={styles.emptyText}>{t('caretaker.insights.dosesEmpty')}</Text>
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
  chipRow: { gap: Theme.spacing.s, paddingBottom: Theme.spacing.m },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.surfaceGrey,
    maxWidth: 180,
  },
  chipActive: {
    borderColor: Theme.colors.primaryLimeDark,
    backgroundColor: 'rgba(69, 104, 130, 0.12)',
  },
  chipText: {
    fontSize: Theme.typography.small,
    fontWeight: '600',
    color: Theme.colors.textLight,
  },
  chipTextActive: { color: Theme.colors.primaryLimeDark },
  summary: { gap: 2 },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  metricLabel: {
    fontSize: Theme.typography.body,
    color: Theme.colors.textLight,
  },
  metricValue: {
    fontSize: Theme.typography.body,
    fontWeight: '800',
    color: Theme.colors.textDark,
  },
  lateValue: { color: Theme.colors.accentOrange },
  emptyText: { fontSize: Theme.typography.small, color: Theme.colors.textLight },
});
