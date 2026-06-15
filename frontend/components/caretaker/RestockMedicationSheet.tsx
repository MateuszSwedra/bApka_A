import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '../../constants/theme';
import type { Treatment } from '../../context/MedsContext';
import { useMeds } from '../../context/MedsContext';
import { DosageStepper } from './DosageStepper';

type Props = {
  treatment: Treatment | null;
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
};

export function RestockMedicationSheet({ treatment, visible, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { updateTreatment } = useMeds();
  const [quantity, setQuantity] = useState('30');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!treatment) return;
    setQuantity('30');
  }, [treatment]);

  const currentStock = treatment?.currentPills ?? treatment?.totalPills ?? 0;

  const handleSave = useCallback(async () => {
    if (!treatment) return;
    const add = parseInt(quantity.replace(/[^0-9]/g, ''), 10);
    if (!add || add < 1) return;

    setSaving(true);
    try {
      const nextStock = currentStock + add;
      await updateTreatment(treatment.id, { currentPills: nextStock });
      onSaved?.();
      onClose();
    } catch {
      Alert.alert(t('common.error'), t('treatment.restock.error'));
    } finally {
      setSaving(false);
    }
  }, [treatment, quantity, currentStock, updateTreatment, onClose, onSaved, t]);

  if (!treatment) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, Theme.spacing.m) }]}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('treatment.restock.title')}</Text>
          <Pressable onPress={onClose} style={styles.closeBtn} accessibilityLabel={t('common.cancel')}>
            <MaterialIcons name="close" size={24} color={Theme.colors.textDark} />
          </Pressable>
        </View>

        <Text style={styles.medName}>{treatment.name}</Text>
        <Text style={styles.currentStock}>
          {t('treatment.restock.currentStock', { count: currentStock })}
        </Text>
        <Text style={styles.lead}>{t('treatment.restock.lead')}</Text>

        <DosageStepper
          value={quantity}
          onChange={setQuantity}
          label={t('treatment.restock.quantityLabel')}
        />

        <Text style={styles.preview}>
          {t('treatment.restock.afterStock', {
            count: currentStock + parseInt(quantity.replace(/[^0-9]/g, ''), 10) || 0,
          })}
        </Text>

        <Pressable
          onPress={() => void handleSave()}
          disabled={saving}
          style={({ pressed }) => [styles.saveBtn, pressed && styles.saveBtnPressed]}
        >
          {saving ? (
            <ActivityIndicator color={Theme.colors.surfaceWhite} />
          ) : (
            <Text style={styles.saveBtnText}>{t('treatment.restock.confirm')}</Text>
          )}
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(27, 60, 83, 0.35)',
  },
  sheet: {
    backgroundColor: Theme.colors.surfaceWhite,
    borderTopLeftRadius: Theme.borderRadius.xlarge,
    borderTopRightRadius: Theme.borderRadius.xlarge,
    paddingHorizontal: Theme.spacing.l,
    paddingTop: Theme.spacing.m,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.s,
  },
  title: {
    flex: 1,
    fontSize: Theme.typography.title,
    fontWeight: '800',
    color: Theme.colors.textDark,
  },
  closeBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  medName: {
    fontSize: Theme.typography.body,
    fontWeight: '700',
    color: Theme.colors.textDark,
  },
  currentStock: {
    marginTop: Theme.spacing.xs,
    fontSize: Theme.typography.caption,
    color: Theme.colors.textLight,
    fontWeight: '600',
  },
  lead: {
    marginTop: Theme.spacing.m,
    fontSize: Theme.typography.body,
    color: Theme.colors.textLight,
    lineHeight: 22,
  },
  preview: {
    marginTop: Theme.spacing.m,
    textAlign: 'center',
    fontSize: Theme.typography.caption,
    fontWeight: '600',
    color: Theme.colors.primaryLimeDark,
  },
  saveBtn: {
    marginTop: Theme.spacing.l,
    backgroundColor: Theme.colors.primaryLimeDark,
    borderRadius: Theme.borderRadius.medium,
    paddingVertical: Theme.spacing.m,
    alignItems: 'center',
  },
  saveBtnPressed: {
    opacity: 0.9,
  },
  saveBtnText: {
    fontSize: Theme.typography.body,
    fontWeight: '700',
    color: Theme.colors.surfaceWhite,
  },
});
