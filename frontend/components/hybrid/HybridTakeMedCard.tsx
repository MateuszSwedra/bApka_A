import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../constants/theme';
import type { DependentMainScheduleState } from '../../utils/dependentScheduleUi';
import type { ScheduleItem, Treatment } from '../../context/MedsContext';
import { seniorActionTileContent } from '../../utils/seniorActionTile';

type HybridTakeMedCardProps = {
  mainState: DependentMainScheduleState;
  schedules: ScheduleItem[];
  treatments: Treatment[];
  onPress: () => void;
  disabled?: boolean;
};

export function HybridTakeMedCard({
  mainState,
  schedules,
  treatments,
  onPress,
  disabled,
}: HybridTakeMedCardProps) {
  const { t } = useTranslation();

  const active = mainState.kind === 'due' || mainState.kind === 'missed';
  const actionTile = useMemo(
    () => seniorActionTileContent(mainState, schedules, treatments, t),
    [mainState, schedules, treatments, t],
  );

  const title = active ? actionTile.title : t('hybrid.takeMedIdle');
  const line1 =
    mainState.kind === 'due' || mainState.kind === 'missed'
      ? mainState.name
      : mainState.kind === 'upcoming'
        ? t('dependent.home.medAt', { time: mainState.nextTime })
        : mainState.kind === 'all_done'
          ? t('dependent.mainAllDone')
          : t('dependent.home.medNoPlan');
  const line2 =
    mainState.kind === 'due' || mainState.kind === 'missed'
      ? mainState.dose
      : mainState.kind === 'upcoming'
        ? `${mainState.nextName} · ${mainState.dose}`
        : '';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !active}
      style={({ pressed }) => [
        styles.card,
        active ? styles.cardActive : styles.cardIdle,
        active && { backgroundColor: actionTile.accent, borderColor: actionTile.accent },
        pressed && active && styles.pressed,
        (!active || disabled) && { opacity: active ? 1 : 0.92 },
      ]}
    >
      <MaterialIcons
        name={actionTile.icon}
        size={40}
        color={active ? Theme.colors.surfaceWhite : Theme.colors.textLight}
      />
      <Text style={[styles.title, active && styles.titleActive]}>{title}</Text>
      <Text style={[styles.line1, active && styles.line1Active]}>{line1}</Text>
      {line2 ? <Text style={[styles.line2, active && styles.line2Active]}>{line2}</Text> : null}
      {active ? (
        <View style={styles.ctaPill}>
          <Text style={styles.ctaText}>{t('hybrid.takeMedCta')}</Text>
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
    borderWidth: 2,
    marginBottom: Theme.spacing.l,
  },
  cardActive: {
    backgroundColor: Theme.colors.primaryLimeDark,
    borderColor: '#1B3C53',
  },
  cardIdle: {
    backgroundColor: Theme.colors.surfaceWhite,
    borderColor: Theme.colors.border,
  },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.95 },
  title: {
    marginTop: Theme.spacing.s,
    fontSize: 22,
    fontWeight: '900',
    color: Theme.colors.textDark,
    textAlign: 'center',
  },
  titleActive: { color: Theme.colors.surfaceWhite },
  line1: {
    marginTop: 4,
    fontSize: 17,
    fontWeight: '700',
    color: Theme.colors.textLight,
    textAlign: 'center',
  },
  line1Active: { color: '#E3F2FD' },
  line2: {
    marginTop: 2,
    fontSize: 15,
    fontWeight: '600',
    color: Theme.colors.textLight,
    textAlign: 'center',
  },
  line2Active: { color: '#E8F5E9' },
  ctaPill: {
    marginTop: Theme.spacing.m,
    backgroundColor: Theme.colors.accentOrange,
    paddingHorizontal: Theme.spacing.l,
    paddingVertical: Theme.spacing.s,
    borderRadius: Theme.borderRadius.round,
  },
  ctaText: {
    color: Theme.colors.surfaceWhite,
    fontWeight: '900',
    fontSize: Theme.typography.body,
    letterSpacing: 0.5,
  },
});
