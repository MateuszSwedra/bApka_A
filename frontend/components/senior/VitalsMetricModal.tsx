import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../constants/theme';
import { usersAPI } from '../../services/api';
import type { SeniorSurfaceColors } from '../../context/DependentDisplayContext';

type VitalsMetricModalProps = {
  visible: boolean;
  type: 'BP' | 'GLUCOSE';
  colors: SeniorSurfaceColors;
  onClose: () => void;
  onSaved?: () => void;
  /** Podgląd dev — zapis tylko lokalnie, bez API. */
  offlinePreview?: boolean;
};

export function VitalsMetricModal({
  visible,
  type,
  colors,
  onClose,
  onSaved,
  offlinePreview = false,
}: VitalsMetricModalProps) {
  const { t } = useTranslation();
  const [sys, setSys] = useState('');
  const [dia, setDia] = useState('');
  const [pulse, setPulse] = useState('');
  const [glucose, setGlucose] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (type === 'BP') return !!sys.trim() && !!dia.trim();
    return !!glucose.trim();
  }, [type, sys, dia, glucose]);

  const reset = () => {
    setSys('');
    setDia('');
    setPulse('');
    setGlucose('');
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const submit = async () => {
    if (!canSubmit || loading) return;
    setLoading(true);
    setError(null);
    try {
      if (offlinePreview) {
        reset();
        onSaved?.();
        onClose();
        return;
      }
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
      reset();
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.card, { backgroundColor: colors.surfaceWhite, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.textDark }]}>
            {type === 'BP' ? t('dependent.metrics.bp') : t('dependent.metrics.glucose')}
          </Text>
          <Text style={[styles.hint, { color: colors.textLight }]}>{t('dependent.metrics.hint')}</Text>

          {type === 'BP' ? (
            <>
              <Text style={[styles.label, { color: colors.textDark }]}>{t('dependent.metrics.systolic')}</Text>
              <TextInput
                value={sys}
                onChangeText={setSys}
                keyboardType="numeric"
                style={[styles.input, { borderColor: colors.border, color: colors.textDark }]}
              />
              <Text style={[styles.label, { color: colors.textDark }]}>{t('dependent.metrics.diastolic')}</Text>
              <TextInput
                value={dia}
                onChangeText={setDia}
                keyboardType="numeric"
                style={[styles.input, { borderColor: colors.border, color: colors.textDark }]}
              />
              <Text style={[styles.label, { color: colors.textDark }]}>{t('dependent.metrics.pulseOptional')}</Text>
              <TextInput
                value={pulse}
                onChangeText={setPulse}
                keyboardType="numeric"
                style={[styles.input, { borderColor: colors.border, color: colors.textDark }]}
              />
            </>
          ) : (
            <>
              <Text style={[styles.label, { color: colors.textDark }]}>{t('dependent.metrics.glucoseValue')}</Text>
              <TextInput
                value={glucose}
                onChangeText={setGlucose}
                keyboardType="numeric"
                style={[styles.input, { borderColor: colors.border, color: colors.textDark }]}
              />
            </>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.actions}>
            <Pressable
              onPress={handleClose}
              style={({ pressed }) => [
                styles.btnGhost,
                { borderColor: colors.border },
                pressed && { opacity: 0.9 },
              ]}
            >
              <Text style={[styles.btnGhostText, { color: colors.textDark }]}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable
              disabled={!canSubmit || loading}
              onPress={() => void submit()}
              style={({ pressed }) => [
                styles.btnPrimary,
                { backgroundColor: colors.primaryLimeDark },
                (!canSubmit || loading) && { opacity: 0.6 },
                pressed && canSubmit && !loading && { opacity: 0.92 },
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
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: Theme.spacing.l,
  },
  card: {
    borderRadius: Theme.borderRadius.xlarge,
    borderWidth: 2,
    padding: Theme.spacing.l,
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    marginBottom: Theme.spacing.xs,
  },
  hint: {
    fontSize: 18,
    lineHeight: 26,
    marginBottom: Theme.spacing.m,
  },
  label: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: Theme.spacing.s,
  },
  input: {
    borderWidth: 2,
    borderRadius: Theme.borderRadius.medium,
    paddingHorizontal: Theme.spacing.m,
    paddingVertical: 14,
    fontSize: 22,
    fontWeight: '700',
  },
  errorText: {
    marginTop: Theme.spacing.s,
    color: '#B71C1C',
    fontSize: 16,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Theme.spacing.m,
    marginTop: Theme.spacing.l,
  },
  btnGhost: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: Theme.borderRadius.round,
    borderWidth: 2,
  },
  btnGhostText: { fontSize: 18, fontWeight: '700' },
  btnPrimary: {
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: Theme.borderRadius.round,
    minWidth: 120,
    alignItems: 'center',
  },
  btnPrimaryText: { fontSize: 18, fontWeight: '800' },
});
