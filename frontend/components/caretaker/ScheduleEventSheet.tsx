import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { Theme } from '../../constants/theme';
import type { ScheduleItem } from '../../context/MedsContext';
import { useMeds } from '../../context/MedsContext';
import {
  scheduleEditShowsDosage,
  treatmentTypeForSchedule,
} from '../../utils/scheduleTreatmentType';
import {
  FriendlyTimePicker,
  type FriendlyTimePickerRef,
} from './FriendlyTimePicker';
import { DosageStepper } from './DosageStepper';
import { parseTimeParts } from '../TimeScrollPicker';

type Props = {
  schedule: ScheduleItem | null;
  label: string;
  visible: boolean;
  onClose: () => void;
};

export function ScheduleEventSheet({ schedule, label, visible, onClose }: Props) {
  const { t } = useTranslation();
  const { treatments, updateSchedule, removeSchedule } = useMeds();
  const timePickerRef = useRef<FriendlyTimePickerRef>(null);
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);
  const [dosage, setDosage] = useState('1');
  const [saving, setSaving] = useState(false);

  const treatmentType = useMemo(() => {
    if (!schedule) return null;
    return treatmentTypeForSchedule(schedule.id, [schedule], treatments);
  }, [schedule, treatments]);

  const showsDosage = scheduleEditShowsDosage(treatmentType);

  useEffect(() => {
    if (!schedule) return;
    const { hour: h, minute: m } = parseTimeParts(schedule.time);
    setHour(h);
    setMinute(m);
    setDosage(schedule.dosage ?? '1');
  }, [schedule]);

  const handleSave = useCallback(async () => {
    if (!schedule) return;
    const parts = timePickerRef.current?.getTime() ?? { hour, minute };
    const time = `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`;
    setSaving(true);
    try {
      await updateSchedule(
        schedule.id,
        showsDosage ? { time, dosage } : { time },
      );
      onClose();
    } catch {
      Alert.alert(t('common.error'), t('calendar.errorUpdate'));
    } finally {
      setSaving(false);
    }
  }, [schedule, hour, minute, dosage, showsDosage, updateSchedule, onClose, t]);

  const handleDelete = useCallback(() => {
    if (!schedule) return;
    Alert.alert(t('calendar.deleteConfirmTitle'), t('calendar.deleteConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setSaving(true);
            try {
              await removeSchedule(schedule.id);
              onClose();
            } catch {
              Alert.alert(t('common.error'), t('calendar.errorDelete'));
            } finally {
              setSaving(false);
            }
          })();
        },
      },
    ]);
  }, [schedule, label, removeSchedule, onClose, t]);

  if (!schedule) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>{label}</Text>

          <FriendlyTimePicker
            ref={timePickerRef}
            hour={hour}
            minute={minute}
            onHourChange={setHour}
            onMinuteChange={setMinute}
          />

          {showsDosage ? (
            <DosageStepper
              value={dosage}
              onChange={setDosage}
              label={t('schedule.add.dosagePills')}
            />
          ) : null}

          <View style={styles.actions}>
            <Pressable
              style={[styles.btn, styles.btnPrimary]}
              onPress={() => void handleSave()}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={Theme.colors.surfaceWhite} />
              ) : (
                <Text style={styles.btnPrimaryText}>{t('common.save')}</Text>
              )}
            </Pressable>
            <Pressable style={[styles.btn, styles.btnDanger]} onPress={handleDelete} disabled={saving}>
              <MaterialIcons name="delete-outline" size={22} color="#B91C1C" />
              <Text style={styles.btnDangerText}>{t('common.delete')}</Text>
            </Pressable>
            <Pressable style={styles.btnGhost} onPress={onClose} disabled={saving}>
              <Text style={styles.btnGhostText}>{t('common.cancel')}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Theme.colors.surfaceWhite,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: Theme.spacing.l,
    paddingBottom: Theme.spacing.xxl,
    paddingTop: Theme.spacing.m,
    maxHeight: '88%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Theme.colors.border,
    marginBottom: Theme.spacing.m,
  },
  title: {
    fontSize: Theme.typography.title,
    fontWeight: '800',
    color: Theme.colors.textDark,
    marginBottom: Theme.spacing.m,
  },
  actions: {
    marginTop: Theme.spacing.l,
    gap: Theme.spacing.s,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.xs,
    paddingVertical: Theme.spacing.m,
    borderRadius: Theme.borderRadius.large,
  },
  btnPrimary: {
    backgroundColor: Theme.colors.primaryLimeDark,
  },
  btnPrimaryText: {
    color: Theme.colors.surfaceWhite,
    fontWeight: '800',
    fontSize: Theme.typography.body,
  },
  btnDanger: {
    backgroundColor: 'rgba(185, 28, 28, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(185, 28, 28, 0.25)',
  },
  btnDangerText: {
    color: '#B91C1C',
    fontWeight: '700',
  },
  btnGhost: {
    paddingVertical: Theme.spacing.s,
  },
  btnGhostText: {
    textAlign: 'center',
    color: Theme.colors.textLight,
    fontWeight: '600',
  },
});
