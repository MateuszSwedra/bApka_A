import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
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
import {
  getMinScheduleTimeForDate,
  isScheduleDateTimeInPast,
} from '../../utils/scheduleDateHelpers';
import { normalizeYmd } from '../../utils/ymdDate';

type Props = {
  schedule: ScheduleItem | null;
  label: string;
  visible: boolean;
  onClose: () => void;
};

export function ScheduleEventSheet({ schedule, label, visible, onClose }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
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

  const scheduleDateYmd =
    normalizeYmd(schedule?.startDate) ?? format(new Date(), 'yyyy-MM-dd');
  const minTime = useMemo(
    () => getMinScheduleTimeForDate(scheduleDateYmd),
    [scheduleDateYmd],
  );

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
    if (isScheduleDateTimeInPast(scheduleDateYmd, parts.hour, parts.minute)) {
      Alert.alert(t('common.error'), t('schedule.add.pastNotAllowed'));
      return;
    }
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
  }, [schedule, hour, minute, dosage, showsDosage, updateSchedule, onClose, t, scheduleDateYmd]);

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
  }, [schedule, removeSchedule, onClose, t]);

  if (!schedule) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
          <View style={styles.headerSpacer} />
          <Text style={styles.headerTitle} numberOfLines={1}>
            {label}
          </Text>
          <Pressable
            onPress={onClose}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}
          >
            <MaterialIcons name="close" size={28} color={Theme.colors.textDark} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <FriendlyTimePicker
            ref={timePickerRef}
            hour={hour}
            minute={minute}
            onHourChange={setHour}
            onMinuteChange={setMinute}
            minTime={minTime}
          />

          {showsDosage ? (
            <DosageStepper
              value={dosage}
              onChange={setDosage}
              label={t('schedule.add.dosagePills')}
            />
          ) : null}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Theme.spacing.m) }]}>
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
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.m,
    paddingBottom: Theme.spacing.s,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Theme.colors.border,
    backgroundColor: Theme.colors.background,
  },
  headerSpacer: {
    width: 48,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: Theme.typography.title,
    fontWeight: '800',
    color: Theme.colors.textDark,
  },
  closeBtn: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Theme.spacing.l,
    paddingTop: Theme.spacing.l,
    paddingBottom: Theme.spacing.l,
    alignItems: 'center',
  },
  footer: {
    paddingHorizontal: Theme.spacing.l,
    paddingTop: Theme.spacing.m,
    gap: Theme.spacing.s,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Theme.colors.border,
    backgroundColor: Theme.colors.background,
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
});
