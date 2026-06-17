import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../constants/theme';
import type { DependentMainScheduleState } from '../../utils/dependentScheduleUi';
import type { ScheduleItem, Treatment } from '../../context/MedsContext';
import { seniorActionTileContent } from '../../utils/seniorActionTile';
import { treatmentTypeForSchedule } from '../../utils/scheduleTreatmentType';
import { phoneIntactWordsTextProps } from '../../utils/phoneText';

import type { SeniorSurfaceColors } from '../../context/DependentDisplayContext';

type HybridTakeMedCardProps = {
  mainState: DependentMainScheduleState;
  schedules: ScheduleItem[];
  treatments: Treatment[];
  onPress: () => void;
  disabled?: boolean;
  colors: SeniorSurfaceColors;
  colorBlindFriendly: boolean;
  highContrast: boolean;
};

export function HybridTakeMedCard({
  mainState,
  schedules,
  treatments,
  onPress,
  disabled,
  colors,
  colorBlindFriendly,
  highContrast,
}: HybridTakeMedCardProps) {
  const { t } = useTranslation();

  const active = mainState.kind === 'due' || mainState.kind === 'missed';
  const actionTile = useMemo(
    () => seniorActionTileContent(mainState, schedules, treatments, t),
    [mainState, schedules, treatments, t],
  );

  const title = active ? actionTile.title : t('hybrid.takeMedIdle');
  const currentScheduleId =
    mainState.kind === 'due' || mainState.kind === 'missed' || mainState.kind === 'upcoming'
      ? mainState.scheduleId
      : null;
  const currentActivityType = currentScheduleId
    ? treatmentTypeForSchedule(currentScheduleId, schedules, treatments)
    : null;
  const showsDose = currentActivityType === 'MEDICATION';
  const isCustomActivity = currentActivityType === 'CUSTOM';
  const line1 =
    mainState.kind === 'due'
      ? isCustomActivity
        ? t('dependent.home.medAt', { time: mainState.time })
        : mainState.name
      : mainState.kind === 'missed'
        ? isCustomActivity
          ? actionTile.lateLabel ?? t('dependent.home.lateLabel')
          : actionTile.lateLabel ?? mainState.name
        : mainState.kind === 'upcoming'
          ? t('dependent.home.medAt', { time: mainState.nextTime })
          : mainState.kind === 'all_done'
            ? t('dependent.mainAllDone')
            : t('dependent.home.medNoPlan');
  const line2 =
    mainState.kind === 'due'
      ? showsDose
        ? mainState.dose
        : ''
      : mainState.kind === 'missed'
        ? showsDose
          ? `${mainState.name} · ${mainState.dose}`
          : ''
        : mainState.kind === 'upcoming'
          ? showsDose
            ? `${mainState.nextName} · ${mainState.dose}`
            : mainState.nextName
          : '';

  const activeAccent =
    colorBlindFriendly || highContrast ? colors.primaryLimeDark : actionTile.accent;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !active}
      style={({ pressed }) => [
        styles.card,
        {
          borderWidth: colors.mainButtonBorderWidth ?? 2,
          backgroundColor: active ? activeAccent : colors.surfaceWhite,
          borderColor: active
            ? colorBlindFriendly || highContrast
              ? colors.border
              : activeAccent
            : colors.border,
        },
        pressed && active && styles.pressed,
        (!active || disabled) && { opacity: active ? 1 : 0.92 },
      ]}
    >
      <MaterialIcons
        name={actionTile.icon}
        size={40}
        color={active ? colors.surfaceWhite : colors.textLight}
      />
      <Text
        style={[styles.title, { color: colors.textDark }, active && styles.titleActive]}
        {...phoneIntactWordsTextProps()}
      >
        {title}
      </Text>
      <Text
        style={[styles.line1, { color: colors.textLight }, active && styles.line1Active]}
        {...phoneIntactWordsTextProps()}
      >
        {line1}
      </Text>
      {line2 ? (
        <Text
          style={[styles.line2, { color: colors.textLight }, active && styles.line2Active]}
          {...phoneIntactWordsTextProps()}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {line2}
        </Text>
      ) : null}
      {active ? (
        <View style={[styles.ctaPill, { backgroundColor: colors.accentOrange }]}>
          <Text style={[styles.ctaText, { color: colors.surfaceWhite }]}>{t('hybrid.takeMedCta')}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Theme.borderRadius.xlarge,
    padding: Theme.spacing.l,
    alignItems: 'center',
    marginBottom: Theme.spacing.l,
  },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.95 },
  title: {
    marginTop: Theme.spacing.s,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  titleActive: { color: Theme.colors.surfaceWhite },
  line1: {
    marginTop: 4,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  line1Active: { color: '#E3F2FD' },
  line2: {
    marginTop: 2,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  line2Active: { color: '#E8F5E9' },
  ctaPill: {
    marginTop: Theme.spacing.m,
    paddingHorizontal: Theme.spacing.l,
    paddingVertical: Theme.spacing.s,
    borderRadius: Theme.borderRadius.round,
  },
  ctaText: {
    fontWeight: '900',
    fontSize: Theme.typography.body,
    letterSpacing: 0.5,
  },
});
