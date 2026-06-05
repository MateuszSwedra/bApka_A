import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '../../../../constants/theme';
import { useMeds, MedScheduleType } from '../../../../context/MedsContext';
import { pickDependentUserId } from '../../../../utils/resolveMedsTargetUserId';
import { useGlobalSearchParams, useSegments } from 'expo-router';
import { parseDaysOfWeekParam } from '../../../../utils/scheduleDateHelpers';
import {
  FriendlyTimePicker,
  type FriendlyTimePickerRef,
} from '../../../../components/caretaker/FriendlyTimePicker';
import { ScheduleTimeDosageIllustration } from '../../../../components/caretaker/ScheduleTimeDosageIllustration';
import { DosageStepper } from '../../../../components/caretaker/DosageStepper';
import { formatTimeParts } from '../../../../components/TimeScrollPicker';
import { HugeButton } from '../../../../components/HugeButton';
import { useTranslation } from 'react-i18next';
import {
  addMedRoute,
  addMedStepPath,
  resolveMedsFlowScope,
  returnAfterScheduleSaved,
} from '../../../../utils/medsFlowNavigation';

function paramString(v?: string | string[]): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

export default function AddScheduleDetailsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const localParams = useLocalSearchParams<{
    dependentId?: string;
    id?: string;
    treatmentId?: string;
    medType?: string;
    startDate?: string;
    endDate?: string;
    daysOfWeek?: string;
  }>();
  const globalParams = useGlobalSearchParams<{ dependentId?: string; id?: string }>();
  const segments = useSegments();
  const { treatments, addSchedule, refetchFromServer, targetUserId } = useMeds();

  const dependentId = useMemo(
    () =>
      pickDependentUserId({
        localDependentId: localParams.dependentId,
        localId: localParams.id,
        globalDependentId: globalParams.dependentId,
        globalId: globalParams.id,
        segments: segments as string[],
        contextUserId: targetUserId,
      }),
    [
      localParams.dependentId,
      localParams.id,
      globalParams.dependentId,
      globalParams.id,
      segments,
      targetUserId,
    ],
  );

  useFocusEffect(
    useCallback(() => {
      if (dependentId) void refetchFromServer(dependentId);
    }, [dependentId, refetchFromServer]),
  );

  const treatmentId = paramString(localParams.treatmentId);
  const medTypeParam = paramString(localParams.medType);
  const medType: MedScheduleType =
    medTypeParam === 'REGULAR' || medTypeParam === 'TEMPORARY' || medTypeParam === 'ONCE'
      ? medTypeParam
      : 'ONCE';

  const startDate = paramString(localParams.startDate) ?? format(new Date(), 'yyyy-MM-dd');
  const endDate = paramString(localParams.endDate);
  const daysOfWeek = parseDaysOfWeekParam(paramString(localParams.daysOfWeek));

  const timePickerRef = useRef<FriendlyTimePickerRef>(null);
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);
  const [dosage, setDosage] = useState('1');
  const [saving, setSaving] = useState(false);

  const flowScope = resolveMedsFlowScope(segments as string[]);

  useEffect(() => {
    if (!dependentId) return;
    if (!treatmentId) {
      router.replace(addMedStepPath(flowScope, dependentId, 'index') as any);
      return;
    }
    if (medTypeParam !== 'ONCE' && medTypeParam !== 'REGULAR' && medTypeParam !== 'TEMPORARY') {
      router.replace({
        pathname: addMedRoute(flowScope, 'frequency'),
        params: { dependentId, treatmentId },
      } as never);
      return;
    }
    const missingTiming =
      (medType === 'ONCE' && !paramString(localParams.startDate)) ||
      (medType === 'REGULAR' && daysOfWeek.length === 0) ||
      (medType === 'TEMPORARY' && (!paramString(localParams.startDate) || !endDate));
    if (missingTiming) {
      router.replace({
        pathname: addMedRoute(flowScope, 'timing'),
        params: { dependentId, treatmentId, medType },
      } as never);
    }
  }, [dependentId, treatmentId, medTypeParam, medType, localParams.startDate, endDate, daysOfWeek.length, flowScope]);

  const selectedTreatment = useMemo(
    () => treatments.find(tr => tr.id === treatmentId) ?? null,
    [treatments, treatmentId],
  );
  const isMedication = selectedTreatment?.type === 'MEDICATION';

  const handleSave = async () => {
    if (!treatmentId || !dependentId || saving) return;
    const picked = timePickerRef.current?.getTime() ?? { hour, minute };
    const timeStr = formatTimeParts(picked.hour, picked.minute);

    let scheduleStart = startDate;
    let scheduleEnd: string | undefined;
    let scheduleDays = daysOfWeek;

    if (medType === 'ONCE') {
      scheduleDays = [];
    } else if (medType === 'REGULAR') {
      scheduleEnd = undefined;
    } else if (medType === 'TEMPORARY') {
      scheduleStart = startDate;
      scheduleEnd = endDate;
      if (scheduleDays.length === 0) {
        scheduleDays = [1, 2, 3, 4, 5, 6, 7];
      }
    }

    setSaving(true);
    try {
      await addSchedule(
        {
          treatmentId,
          type: medType,
          time: timeStr,
          dosage: isMedication ? dosage : '1',
          daysOfWeek: scheduleDays,
          startDate: scheduleStart,
          endDate: scheduleEnd,
        },
        dependentId,
      );
      returnAfterScheduleSaved(dependentId, flowScope);
    } catch {
      setSaving(false);
    }
  };

  if (!treatmentId || !selectedTreatment) {
    return null;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} accessibilityLabel={t('common.back')}>
          <MaterialIcons name="arrow-back" size={28} color={Theme.colors.textDark} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {t('schedule.add.pickTimeTitle')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ScheduleTimeDosageIllustration width={250} height={200} />
        <Text style={styles.lead}>
          {isMedication ? t('schedule.add.pickTimeLeadMed') : t('schedule.add.pickTimeLead')}
        </Text>
        <Text style={styles.activityName}>{selectedTreatment.name}</Text>

        <FriendlyTimePicker
          ref={timePickerRef}
          hour={hour}
          minute={minute}
          onHourChange={setHour}
          onMinuteChange={setMinute}
        />

        {isMedication && (
          <DosageStepper
            label={t('schedule.add.dosagePills')}
            value={dosage}
            onChange={setDosage}
          />
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + Theme.spacing.m }]}>
        <HugeButton
          title={t('common.save')}
          onPress={handleSave}
          disabled={saving}
          style={styles.saveBtn}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.m,
    paddingBottom: Theme.spacing.s,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: Theme.typography.title,
    fontWeight: '800',
    color: Theme.colors.textDark,
  },
  headerSpacer: {
    width: 48,
  },
  iconBtn: {
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: Theme.spacing.l,
    paddingBottom: Theme.spacing.l,
    alignItems: 'center',
  },
  lead: {
    marginTop: Theme.spacing.m,
    fontSize: Theme.typography.body,
    color: Theme.colors.textLight,
    textAlign: 'center',
    lineHeight: 22,
    width: '100%',
  },
  activityName: {
    marginBottom: Theme.spacing.l,
    fontSize: Theme.typography.caption,
    fontWeight: '700',
    color: Theme.colors.primaryLimeDark,
    textAlign: 'center',
    width: '100%',
  },
  footer: {
    paddingHorizontal: Theme.spacing.l,
    paddingTop: Theme.spacing.m,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Theme.colors.border,
    backgroundColor: Theme.colors.background,
  },
  saveBtn: {
    width: '100%',
    minHeight: 56,
  },
});
