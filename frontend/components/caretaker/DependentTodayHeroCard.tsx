import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/theme';
import { MoodIcon } from '../mood/MoodIcon';
import { MOOD_VISUAL, parseMood } from '../../constants/moodVisual';
import { useTranslation } from 'react-i18next';

export type TodayDoseStats = {
  taken: number;
  late: number;
  missed: number;
  pending: number;
  total: number;
};

type Accent = { solid: string; soft: string };

const STAT_CONFIG = [
  {
    key: 'taken',
    field: 'taken' as const,
    icon: 'check-circle',
    color: '#1F7A4D',
    activeBg: 'rgba(31, 122, 77, 0.12)',
  },
  {
    key: 'late',
    field: 'late' as const,
    icon: 'schedule',
    color: Theme.colors.accentOrange,
    activeBg: Theme.colors.surfaceSoftOrange,
  },
  {
    key: 'missed',
    field: 'missed' as const,
    icon: 'cancel',
    color: '#C23D3D',
    activeBg: 'rgba(194, 61, 61, 0.1)',
  },
  {
    key: 'pending',
    field: 'pending' as const,
    icon: 'radio-button-unchecked',
    color: Theme.colors.primaryLimeDark,
    activeBg: 'rgba(69, 104, 130, 0.1)',
  },
] as const;

type Props = {
  initials: string;
  greeting: string;
  accent: Accent;
  mood?: string | null;
  moodSubtitle?: string | null;
  stats: TodayDoseStats;
  statLabel: (key: string) => string;
  overviewLabel: string;
  emptyDayLabel: string;
};

export function DependentTodayHeroCard({
  initials,
  greeting,
  accent,
  mood,
  moodSubtitle,
  stats,
  statLabel,
  overviewLabel,
  emptyDayLabel,
}: Props) {
  const { t } = useTranslation();
  const parsedMood = mood ? parseMood(mood) : null;
  const moodVisual = parsedMood ? MOOD_VISUAL[parsedMood] : null;

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={['#FFFFFF', '#F8FAFC']}
        style={styles.card}
      >
        <View style={[styles.accentBar, { backgroundColor: accent.solid }]} />

        <View style={styles.topRow}>
          <View style={[styles.avatar, { borderColor: accent.solid, backgroundColor: accent.soft }]}>
            <Text style={[styles.initials, { color: accent.solid }]}>{initials}</Text>
          </View>
          <Text style={styles.greeting}>{greeting}</Text>
        </View>

        {parsedMood && moodVisual && moodSubtitle ? (
          <View
            style={[
              styles.moodStrip,
              { backgroundColor: moodVisual.background, borderColor: moodVisual.ring },
            ]}
          >
            <MoodIcon mood={parsedMood} size="md" />
            <Text style={[styles.moodText, { color: moodVisual.color }]}>{moodSubtitle}</Text>
          </View>
        ) : null}

        <View style={styles.syncStrip}>
          <View style={styles.syncIconWrap}>
            <MaterialIcons name="phonelink" size={22} color={Theme.colors.success} />
          </View>
          <View style={styles.syncTextCol}>
            <Text style={styles.syncTitle}>{t('caretaker.device.statusOk')}</Text>
            <Text style={styles.syncSubtitle}>{t('caretaker.device.synced')}</Text>
          </View>
          <MaterialIcons name="check-circle" size={24} color={Theme.colors.success} />
        </View>

        <Text style={styles.overviewLabel}>{overviewLabel}</Text>

        {stats.total > 0 ? (
          <View style={styles.statsRow}>
            {STAT_CONFIG.map((item, index) => {
              const count = stats[item.field];
              const isActive = count > 0;
              return (
                <View
                  key={item.key}
                  style={[
                    styles.statCell,
                    index < STAT_CONFIG.length - 1 && styles.statCellBorder,
                    isActive && { backgroundColor: item.activeBg },
                  ]}
                >
                  <MaterialIcons
                    name={item.icon as 'check-circle'}
                    size={18}
                    color={isActive ? item.color : Theme.colors.textLight}
                  />
                  <Text
                    style={[
                      styles.statCount,
                      { color: isActive ? item.color : Theme.colors.textLight },
                    ]}
                  >
                    {count}
                  </Text>
                  <Text style={styles.statLabel} numberOfLines={1}>
                    {statLabel(item.key)}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.statsEmpty}>
            <MaterialIcons name="event-available" size={22} color={Theme.colors.textLight} />
            <Text style={styles.statsEmptyText}>{emptyDayLabel}</Text>
          </View>
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: Theme.spacing.m,
  },
  card: {
    borderRadius: Theme.borderRadius.xlarge,
    padding: Theme.spacing.l,
    paddingLeft: Theme.spacing.l + 4,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    overflow: 'hidden',
    shadowColor: Theme.colors.shadowNeutral,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.m,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  greeting: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: Theme.colors.textDark,
    lineHeight: 24,
  },
  moodStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.m,
    marginTop: Theme.spacing.m,
    paddingVertical: 10,
    paddingHorizontal: Theme.spacing.m,
    borderRadius: Theme.borderRadius.large,
    borderWidth: 1,
  },
  moodText: {
    flex: 1,
    fontSize: Theme.typography.caption,
    fontWeight: '700',
  },
  syncStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.m,
    marginTop: Theme.spacing.m,
    paddingVertical: 12,
    paddingHorizontal: Theme.spacing.m,
    borderRadius: Theme.borderRadius.large,
    backgroundColor: Theme.colors.badgeSuccessBackground,
    borderWidth: 1,
    borderColor: 'rgba(31, 122, 77, 0.2)',
  },
  syncIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Theme.colors.surfaceWhite,
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncTextCol: {
    flex: 1,
    minWidth: 0,
  },
  syncTitle: {
    fontSize: Theme.typography.caption,
    fontWeight: '800',
    color: Theme.colors.textDark,
  },
  syncSubtitle: {
    marginTop: 2,
    fontSize: Theme.typography.small,
    fontWeight: '600',
    color: Theme.colors.textLight,
    lineHeight: 18,
  },
  overviewLabel: {
    marginTop: Theme.spacing.l,
    marginBottom: Theme.spacing.s,
    fontSize: Theme.typography.small,
    fontWeight: '700',
    color: Theme.colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.surfaceGrey,
    borderRadius: Theme.borderRadius.large,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 2,
    backgroundColor: Theme.colors.surfaceWhite,
  },
  statCellBorder: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: Theme.colors.border,
  },
  statCount: {
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 26,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Theme.colors.textLight,
    textAlign: 'center',
  },
  statsEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.s,
    paddingVertical: Theme.spacing.m,
    backgroundColor: Theme.colors.surfaceGrey,
    borderRadius: Theme.borderRadius.large,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  statsEmptyText: {
    fontSize: Theme.typography.caption,
    color: Theme.colors.textLight,
    fontWeight: '600',
  },
});
