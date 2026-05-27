import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../constants/theme';
import { usersAPI } from '../../services/api';

type MetricType = 'BP' | 'GLUCOSE';

export default function DependentMetricsScreen() {
  const { t } = useTranslation();
  const [type, setType] = useState<MetricType>('BP');

  const [sys, setSys] = useState('');
  const [dia, setDia] = useState('');
  const [pulse, setPulse] = useState('');
  const [glucose, setGlucose] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    if (type === 'BP') return !!sys.trim() && !!dia.trim();
    return !!glucose.trim();
  }, [type, sys, dia, glucose]);

  const submit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      if (type === 'BP') {
        await usersAPI.createMetric({
          type: 'BP',
          systolic: Number(sys),
          diastolic: Number(dia),
          pulse: pulse ? Number(pulse) : undefined,
          unit: 'mmHg',
        });
      } else {
        await usersAPI.createMetric({
          type: 'GLUCOSE',
          value: Number(glucose),
          unit: 'mg/dL',
        });
      }
      Alert.alert(t('common.success'), t('dependent.metrics.saved'));
      setSys('');
      setDia('');
      setPulse('');
      setGlucose('');
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

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.switchRow}>
          <Pressable
            onPress={() => setType('BP')}
            style={[styles.chip, type === 'BP' && styles.chipActive]}
          >
            <Text style={[styles.chipText, type === 'BP' && styles.chipTextActive]}>
              {t('dependent.metrics.bp')}
            </Text>
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

        {type === 'BP' ? (
          <View style={styles.card}>
            <Text style={styles.label}>{t('dependent.metrics.systolic')}</Text>
            <TextInput value={sys} onChangeText={setSys} keyboardType="numeric" style={styles.input} />
            <Text style={styles.label}>{t('dependent.metrics.diastolic')}</Text>
            <TextInput value={dia} onChangeText={setDia} keyboardType="numeric" style={styles.input} />
            <Text style={styles.label}>{t('dependent.metrics.pulseOptional')}</Text>
            <TextInput value={pulse} onChangeText={setPulse} keyboardType="numeric" style={styles.input} />
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.label}>{t('dependent.metrics.glucoseValue')}</Text>
            <TextInput value={glucose} onChangeText={setGlucose} keyboardType="numeric" style={styles.input} />
          </View>
        )}

        <Pressable
          disabled={!canSubmit || loading}
          onPress={submit}
          style={[styles.button, (!canSubmit || loading) && { opacity: 0.6 }]}
        >
          <Text style={styles.buttonText}>{loading ? t('dependent.metrics.saving') : t('common.save')}</Text>
        </Pressable>
      </ScrollView>
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
  backText: { color: Theme.colors.accentOrange, fontWeight: '700' },
  title: { fontSize: Theme.typography.title, fontWeight: '800', color: Theme.colors.textDark },
  content: { padding: Theme.spacing.l, paddingBottom: 80 },
  switchRow: { flexDirection: 'row', backgroundColor: Theme.colors.surfaceGrey, borderRadius: 999, padding: 4 },
  chip: { flex: 1, paddingVertical: 10, borderRadius: 999, alignItems: 'center' },
  chipActive: { backgroundColor: Theme.colors.surfaceWhite },
  chipText: { color: Theme.colors.textLight, fontWeight: '700' },
  chipTextActive: { color: Theme.colors.textDark },
  card: {
    marginTop: Theme.spacing.l,
    backgroundColor: Theme.colors.surfaceWhite,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.m,
  },
  label: { color: Theme.colors.textLight, fontWeight: '700', marginTop: 12 },
  input: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: Theme.colors.textDark,
    backgroundColor: Theme.colors.background,
  },
  button: {
    marginTop: Theme.spacing.l,
    backgroundColor: Theme.colors.primaryLime,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.primaryLimeDark,
  },
  buttonText: { fontWeight: '800', color: Theme.colors.textDark },
});

