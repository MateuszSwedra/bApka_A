import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useScreenBottomPadding } from '../../utils/safeAreaInsets';
import { Theme } from '../../constants/theme';
import { usersAPI } from '../../services/api';
import { SeniorNumericStepper } from '../../components/senior/SeniorNumericStepper';

type MetricType = 'BP' | 'GLUCOSE';

const DEFAULT_SYS = 120;
const DEFAULT_DIA = 80;
const DEFAULT_GLUCOSE = 90;

export default function DependentMetricsScreen() {
  const { t } = useTranslation();
  const [type, setType] = useState<MetricType>('BP');
  const [sys, setSys] = useState(DEFAULT_SYS);
  const [dia, setDia] = useState(DEFAULT_DIA);
  const [glucose, setGlucose] = useState(DEFAULT_GLUCOSE);
  const [loading, setLoading] = useState(false);
  const bottomPadding = useScreenBottomPadding(Theme.spacing.l);

  const submit = async () => {
    setLoading(true);
    try {
      if (type === 'BP') {
        await usersAPI.createMetric({
          type: 'BP',
          systolic: sys,
          diastolic: dia,
          unit: 'mmHg',
        });
      } else {
        await usersAPI.createMetric({
          type: 'GLUCOSE',
          value: glucose,
          unit: 'mg/dL',
        });
      }
      Alert.alert(t('common.success'), t('dependent.metrics.saved'));
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('common.error');
      Alert.alert(t('common.error'), msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>{t('common.back')}</Text>
        </Pressable>
        <Text style={styles.title}>{t('dependent.metrics.title')}</Text>
      </View>

      <View style={[styles.body, { paddingBottom: bottomPadding }]}>
        <View style={styles.hintBanner}>
          <Text style={styles.hint}>{t('dependent.metrics.hint')}</Text>
        </View>

        <View style={styles.switchRow}>
          <Pressable onPress={() => setType('BP')} style={[styles.chip, type === 'BP' && styles.chipActive]}>
            <Text style={[styles.chipText, type === 'BP' && styles.chipTextActive]}>{t('dependent.metrics.bp')}</Text>
          </Pressable>
          <Pressable
            onPress={() => setType('GLUCOSE')}
            style={[styles.chip, type === 'GLUCOSE' && styles.chipActive]}
          >
            <Text style={[styles.chipText, type === 'GLUCOSE' && styles.chipTextActive]}>
              {t('dependent.metrics.glucose')}
            </Text>
          </Pressable>
        </View>

        <View style={styles.fields}>
          {type === 'BP' ? (
            <View style={styles.bpRow}>
              <SeniorNumericStepper
                label={t('dependent.metrics.systolic')}
                value={sys}
                min={90}
                max={200}
                step={1}
                unit={t('dependent.metrics.unitMmHg')}
                onChange={setSys}
              />
              <View style={styles.bpDivider} />
              <SeniorNumericStepper
                label={t('dependent.metrics.diastolic')}
                value={dia}
                min={50}
                max={120}
                step={1}
                unit={t('dependent.metrics.unitMmHg')}
                onChange={setDia}
              />
            </View>
          ) : (
            <SeniorNumericStepper
              compact
              label={t('dependent.metrics.glucoseValue')}
              value={glucose}
              min={50}
              max={350}
              step={1}
              unit={t('dependent.metrics.unitMgDl')}
              onChange={setGlucose}
            />
          )}
        </View>

        <Pressable disabled={loading} onPress={() => void submit()} style={[styles.button, loading && { opacity: 0.6 }]}>
          <Text style={styles.buttonText}>{loading ? t('dependent.metrics.saving') : t('common.save')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Theme.colors.background },
  header: {
    paddingTop: Theme.spacing.xl,
    paddingHorizontal: Theme.spacing.l,
    paddingBottom: Theme.spacing.m,
    backgroundColor: Theme.colors.surfaceWhite,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  back: { paddingVertical: 6 },
  backText: { color: Theme.colors.accentOrange, fontWeight: '700', fontSize: 18 },
  title: { fontSize: 26, fontWeight: '900', color: Theme.colors.textDark },
  body: { flex: 1, padding: Theme.spacing.l },
  hintBanner: {
    backgroundColor: Theme.colors.primaryLime + '55',
    borderRadius: Theme.borderRadius.medium,
    borderWidth: 2,
    borderColor: Theme.colors.primaryLimeDark,
    padding: Theme.spacing.m,
    marginBottom: Theme.spacing.m,
  },
  hint: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '800',
    color: Theme.colors.textDark,
    textAlign: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.surfaceGrey,
    borderRadius: 999,
    padding: 4,
    marginBottom: Theme.spacing.m,
  },
  chip: { flex: 1, paddingVertical: 12, borderRadius: 999, alignItems: 'center' },
  chipActive: { backgroundColor: Theme.colors.surfaceWhite },
  chipText: { color: Theme.colors.textLight, fontWeight: '700', fontSize: 17 },
  chipTextActive: { color: Theme.colors.textDark },
  fields: { flex: 1, justifyContent: 'center' },
  bpRow: { flexDirection: 'row', gap: Theme.spacing.s },
  bpDivider: {
    width: 2,
    alignSelf: 'stretch',
    backgroundColor: Theme.colors.border,
    marginTop: 28,
  },
  button: {
    backgroundColor: Theme.colors.primaryLimeDark,
    borderRadius: Theme.borderRadius.round,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: 52,
  },
  buttonText: { fontWeight: '800', fontSize: 18, color: Theme.colors.surfaceWhite },
});
