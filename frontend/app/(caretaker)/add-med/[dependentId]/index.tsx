import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect, useGlobalSearchParams, useLocalSearchParams, useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getScreenBottomPadding } from '../../../../utils/safeAreaInsets';
import { Theme } from '../../../../constants/theme';
import { TREATMENT_VISUAL } from '../../../../constants/treatmentVisuals';
import { useMeds } from '../../../../context/MedsContext';
import { pickDependentUserId } from '../../../../utils/resolveMedsTargetUserId';
import { addMedRoute, openAddTreatment, resolveMedsFlowScope } from '../../../../utils/medsFlowNavigation';
import { addMedPrefillParams, readAddMedPrefill } from '../../../../utils/addMedPrefill';
import { ActivityPickerIllustration } from '../../../../components/caretaker/ActivityPickerIllustration';
import { HugeButton } from '../../../../components/HugeButton';
import { getTreatmentGroupLabel } from '../../../../i18n/treatmentLabels';
import { useTranslation } from 'react-i18next';

export default function PickActivityScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const localParams = useLocalSearchParams<{ dependentId?: string; id?: string; prefillDate?: string; prefillTime?: string }>();
  const globalParams = useGlobalSearchParams<{ dependentId?: string; id?: string }>();
  const segments = useSegments();
  const { treatments, refetchFromServer, targetUserId } = useMeds();

  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  const flowScope = resolveMedsFlowScope(segments as string[]);
  const prefill = readAddMedPrefill(localParams);

  const handleContinue = () => {
    if (!selectedId || !dependentId) return;
    router.push({
      pathname: addMedRoute(flowScope, 'frequency'),
      params: { dependentId, treatmentId: selectedId, ...addMedPrefillParams(prefill) },
    } as never);
  };

  const handleOpenAddTreatment = () => {
    if (!dependentId) {
      Alert.alert(t('common.error'), t('errors.invalidDependentProfile'));
      return;
    }
    openAddTreatment(dependentId, flowScope);
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} accessibilityLabel={t('common.back')}>
          <MaterialIcons name="close" size={28} color={Theme.colors.textDark} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('schedule.add.pickActivityTitle')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ActivityPickerIllustration width={240} height={210} />

        <Text style={styles.lead}>{t('schedule.add.pickActivityLead')}</Text>

        {treatments.length === 0 ? (
          <Text style={styles.emptyHint}>{t('schedule.add.activitiesEmpty')}</Text>
        ) : null}

        <View style={styles.list}>
          <Pressable
            onPress={handleOpenAddTreatment}
            style={styles.addRow}
            accessibilityLabel={t('schedule.add.a11yAddActivity')}
          >
            <View style={styles.addIconCircle}>
              <MaterialIcons name="add" size={26} color={Theme.colors.primaryLimeDark} />
            </View>
            <Text style={styles.addRowText}>{t('schedule.add.addNewActivity')}</Text>
          </Pressable>

          {treatments.map(item => {
            const vis = TREATMENT_VISUAL[item.type];
            const selected = selectedId === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => setSelectedId(item.id)}
                style={[
                  styles.row,
                  selected && styles.rowSelected,
                  { borderColor: selected ? Theme.colors.primaryLimeDark : Theme.colors.border },
                ]}
              >
                <View style={[styles.iconCircle, { backgroundColor: vis.accent + '22' }]}>
                  <MaterialIcons name={vis.icon} size={24} color={vis.accent} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.rowSubtitle} numberOfLines={1}>
                    {getTreatmentGroupLabel(item.type)}
                  </Text>
                </View>
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  {selected ? (
                    <MaterialIcons name="check" size={18} color={Theme.colors.surfaceWhite} />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: getScreenBottomPadding(insets.bottom, Theme.spacing.m) }]}>
        <HugeButton
          title={t('schedule.add.continue')}
          onPress={handleContinue}
          disabled={!selectedId}
          style={styles.continueBtn}
        />
      </View>
    </View>
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
  iconBtn: {
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Theme.spacing.l,
    paddingBottom: Theme.spacing.l,
    alignItems: 'center',
  },
  lead: {
    marginTop: Theme.spacing.m,
    marginBottom: Theme.spacing.l,
    fontSize: Theme.typography.body,
    color: Theme.colors.textLight,
    textAlign: 'center',
    lineHeight: 22,
    width: '100%',
  },
  emptyHint: {
    width: '100%',
    textAlign: 'center',
    color: Theme.colors.accentOrange,
    fontSize: Theme.typography.caption,
    marginBottom: Theme.spacing.m,
    lineHeight: 20,
  },
  list: {
    width: '100%',
    gap: Theme.spacing.s,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.m,
    borderRadius: Theme.borderRadius.medium,
    borderWidth: 1.5,
    backgroundColor: Theme.colors.calendarCell,
  },
  rowSelected: {
    backgroundColor: Theme.colors.surfaceWarmHighlight,
    borderWidth: 2,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.m,
  },
  rowText: {
    flex: 1,
    paddingRight: Theme.spacing.s,
  },
  rowTitle: {
    fontSize: Theme.typography.body,
    fontWeight: '700',
    color: Theme.colors.textDark,
  },
  rowSubtitle: {
    marginTop: 2,
    fontSize: Theme.typography.caption,
    color: Theme.colors.textLight,
  },
  radio: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: Theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceWhite,
  },
  radioSelected: {
    backgroundColor: Theme.colors.primaryLimeDark,
    borderColor: Theme.colors.primaryLimeDark,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.m,
    borderRadius: Theme.borderRadius.medium,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Theme.colors.primaryLimeDark,
    backgroundColor: Theme.colors.primaryLime + '55',
    marginBottom: Theme.spacing.s,
  },
  addIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.m,
    backgroundColor: Theme.colors.surfaceWhite,
  },
  addRowText: {
    flex: 1,
    fontSize: Theme.typography.body,
    fontWeight: '700',
    color: Theme.colors.primaryLimeDark,
  },
  footer: {
    paddingHorizontal: Theme.spacing.l,
    paddingTop: Theme.spacing.m,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Theme.colors.border,
    backgroundColor: Theme.colors.background,
  },
  continueBtn: {
    width: '100%',
    minHeight: 56,
  },
});
