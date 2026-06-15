import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../constants/theme';
import { usersAPI } from '../../services/api';
import type { SeniorSurfaceColors } from '../../context/DependentDisplayContext';
import { SeniorNumericStepper } from './SeniorNumericStepper';

const DEFAULT_SYS = 120;
const DEFAULT_DIA = 80;
const DEFAULT_GLUCOSE = 90;

type VitalsMetricModalProps = {
  visible: boolean;
  type: 'BP' | 'GLUCOSE';
  colors: SeniorSurfaceColors;
  onClose: () => void;
  onSaved?: () => void;
};

export function VitalsMetricModal({
  visible,
  type,
  colors,
  onClose,
  onSaved,
}: VitalsMetricModalProps) {
  const { t } = useTranslation();
  const [sys, setSys] = useState(DEFAULT_SYS);
  const [dia, setDia] = useState(DEFAULT_DIA);
  const [glucose, setGlucose] = useState(DEFAULT_GLUCOSE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setSys(DEFAULT_SYS);
    setDia(DEFAULT_DIA);
    setGlucose(DEFAULT_GLUCOSE);
    setError(null);
  }, [visible, type]);

  const submit = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
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
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.surfaceWhite, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.textDark }]}>
            {type === 'BP' ? t('dependent.metrics.bp') : t('dependent.metrics.glucose')}
          </Text>

          <View
            style={[
              styles.hintBanner,
              { backgroundColor: colors.primaryLime + '55', borderColor: colors.primaryLimeDark },
            ]}
          >
            <Text style={[styles.hint, { color: colors.textDark }]}>{t('dependent.metrics.hint')}</Text>
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

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.actions}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.btnGhost,
                { borderColor: colors.border },
                pressed && { opacity: 0.9 },
              ]}
            >
              <Text style={[styles.btnGhostText, { color: colors.textDark }]}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable
              disabled={loading}
              onPress={() => void submit()}
              style={({ pressed }) => [
                styles.btnPrimary,
                { backgroundColor: colors.primaryLimeDark },
                loading && { opacity: 0.6 },
                pressed && !loading && { opacity: 0.92 },
              ]}
            >
              {loading ? (
                <ActivityIndicator color={colors.surfaceWhite} />
              ) : (
                <Text style={[styles.btnPrimaryText, { color: colors.surfaceWhite }]}>{t('common.save')}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: Theme.spacing.l,
  },
  card: {
    borderRadius: Theme.borderRadius.xlarge,
    borderWidth: 2,
    padding: Theme.spacing.l,
    maxWidth: 440,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    marginBottom: Theme.spacing.s,
    textAlign: 'center',
  },
  hintBanner: {
    borderRadius: Theme.borderRadius.medium,
    borderWidth: 2,
    paddingVertical: Theme.spacing.s,
    paddingHorizontal: Theme.spacing.m,
    marginBottom: Theme.spacing.m,
  },
  hint: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  fields: {
    marginBottom: Theme.spacing.s,
  },
  bpRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Theme.spacing.s,
  },
  bpDivider: {
    width: 2,
    alignSelf: 'stretch',
    backgroundColor: Theme.colors.border,
    borderRadius: 1,
    marginTop: 28,
  },
  errorText: {
    marginBottom: Theme.spacing.s,
    color: '#B71C1C',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Theme.spacing.m,
    marginTop: Theme.spacing.m,
    paddingTop: Theme.spacing.m,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Theme.colors.border,
  },
  btnGhost: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Theme.borderRadius.round,
    borderWidth: 2,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGhostText: { fontSize: 18, fontWeight: '700' },
  btnPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Theme.borderRadius.round,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: { fontSize: 18, fontWeight: '800' },
});
