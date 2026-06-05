import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '../../../../constants/theme';
import type { MedScheduleType } from '../../../../context/MedsContext';
import { ScheduleFrequencyIllustration } from '../../../../components/caretaker/ScheduleFrequencyIllustration';
import { HugeButton } from '../../../../components/HugeButton';
import { useTranslation } from 'react-i18next';

type FrequencyOption = {
  type: MedScheduleType;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  color: string;
  titleKey: string;
  hintKey: string;
};

const OPTIONS: FrequencyOption[] = [
  {
    type: 'ONCE',
    icon: 'event',
    color: Theme.colors.primaryLimeDark,
    titleKey: 'schedule.add.frequencyOnceTitle',
    hintKey: 'schedule.add.frequencyOnceHint',
  },
  {
    type: 'REGULAR',
    icon: 'repeat',
    color: Theme.colors.primaryLimeDark,
    titleKey: 'schedule.add.frequencyRegularTitle',
    hintKey: 'schedule.add.frequencyRegularHint',
  },
  {
    type: 'TEMPORARY',
    icon: 'date-range',
    color: Theme.colors.accentOrange,
    titleKey: 'schedule.add.frequencyPeriodTitle',
    hintKey: 'schedule.add.frequencyPeriodHint',
  },
];

export default function PickScheduleFrequencyScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ dependentId?: string; treatmentId?: string }>();

  const dependentId =
    typeof params.dependentId === 'string'
      ? params.dependentId
      : Array.isArray(params.dependentId)
        ? params.dependentId[0]
        : undefined;
  const treatmentId =
    typeof params.treatmentId === 'string'
      ? params.treatmentId
      : Array.isArray(params.treatmentId)
        ? params.treatmentId[0]
        : undefined;

  const [selectedType, setSelectedType] = useState<MedScheduleType | null>(null);

  const canContinue = Boolean(selectedType && dependentId && treatmentId);

  const handleContinue = () => {
    if (!canContinue || !selectedType) return;
    router.push({
      pathname: '/(caretaker)/add-med/[dependentId]/timing',
      params: { dependentId, treatmentId, medType: selectedType },
    } as never);
  };

  if (!dependentId || !treatmentId) {
    router.back();
    return null;
  }

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} accessibilityLabel={t('common.back')}>
          <MaterialIcons name="arrow-back" size={28} color={Theme.colors.textDark} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('schedule.add.pickFrequencyTitle')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ScheduleFrequencyIllustration width={250} height={220} />

        <Text style={styles.lead}>{t('schedule.add.pickFrequencyLead')}</Text>

        <View style={styles.list}>
          {OPTIONS.map(opt => {
            const selected = selectedType === opt.type;
            return (
              <Pressable
                key={opt.type}
                onPress={() => setSelectedType(opt.type)}
                style={[
                  styles.row,
                  selected && styles.rowSelected,
                  { borderColor: selected ? opt.color : Theme.colors.border },
                ]}
              >
                <View style={[styles.iconCircle, { backgroundColor: opt.color + '22' }]}>
                  <MaterialIcons name={opt.icon} size={26} color={opt.color} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{t(opt.titleKey)}</Text>
                  <Text style={styles.rowSubtitle}>{t(opt.hintKey)}</Text>
                </View>
                <View style={[styles.radio, selected && { backgroundColor: opt.color, borderColor: opt.color }]}>
                  {selected ? (
                    <MaterialIcons name="check" size={18} color={Theme.colors.surfaceWhite} />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + Theme.spacing.m }]}>
        <HugeButton
          title={t('schedule.add.continue')}
          onPress={handleContinue}
          disabled={!canContinue}
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
    marginTop: 4,
    fontSize: Theme.typography.caption,
    color: Theme.colors.textLight,
    lineHeight: 18,
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
