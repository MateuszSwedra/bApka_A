import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Theme } from '../../../../constants/theme';
import { TREATMENT_TYPE_ORDER, TREATMENT_VISUAL } from '../../../../constants/treatmentVisuals';
import { useMeds, Treatment } from '../../../../context/MedsContext';
import { Card } from '../../../../components/Card';
import {
  useLocalSearchParams,
  router,
  useFocusEffect,
  useGlobalSearchParams,
  useSegments,
} from 'expo-router';
import { pickDependentUserId } from '../../../../utils/resolveMedsTargetUserId';
import { useDependentTabTopInset } from '../../../../utils/useDependentTabTopInset';
import { useTranslation } from 'react-i18next';
import { getTreatmentGroupLabel } from '../../../../i18n/treatmentLabels';

export default function DependentTreatmentsScreen() {
  const { t } = useTranslation();
  const localParams = useLocalSearchParams<{ id?: string }>();
  const globalParams = useGlobalSearchParams<{ id?: string }>();
  const segments = useSegments();
  const topInset = useDependentTabTopInset();
  const { treatments, removeTreatment, refetchFromServer, targetUserId } = useMeds();

  const dependentId = useMemo(
    () =>
      pickDependentUserId({
        localId: localParams.id,
        globalId: globalParams.id,
        segments: segments as string[],
        contextUserId: targetUserId,
      }),
    [localParams.id, globalParams.id, segments, targetUserId],
  );

  useFocusEffect(
    useCallback(() => {
      if (dependentId) void refetchFromServer(dependentId);
    }, [dependentId, refetchFromServer]),
  );

  const grouped = TREATMENT_TYPE_ORDER.map(type => ({
    type,
    meta: TREATMENT_VISUAL[type],
    items: treatments.filter(t => t.type === type),
  })).filter(group => group.items.length > 0);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: topInset + Theme.spacing.l }]}>
        <Text style={styles.sectionTitle}>{t('treatment.list.title')}</Text>
        <Text style={styles.sectionSubtitle}>{t('treatment.list.subtitle')}</Text>

        {grouped.length === 0 && (
          <Text style={styles.emptyText}>{t('treatment.list.empty')}</Text>
        )}

        {grouped.map(group => (
          <View key={group.type} style={styles.groupSection}>
            <View style={styles.groupHeader}>
              <View style={[styles.groupIconCircle, { backgroundColor: group.meta.accent + '22' }]}>
                <MaterialIcons name={group.meta.icon} size={20} color={group.meta.accent} />
              </View>
              <Text style={styles.groupTitle}>{getTreatmentGroupLabel(group.type)}</Text>
              <Text style={styles.groupCount}>{group.items.length}</Text>
            </View>

            {group.items.map(item => (
              <TreatmentCard
                key={item.id}
                item={item}
                accent={group.meta.accent}
                onEdit={() => router.push(`/(caretaker)/edit-treatment/${item.id}` as any)}
                onRemove={() => void removeTreatment(item.id, dependentId ?? undefined)}
              />
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function TreatmentCard({
  item,
  accent,
  onEdit,
  onRemove,
}: {
  item: Treatment;
  accent: string;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Pressable onPress={onEdit}>
      <Card variant="white" style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <View style={{ flex: 1, paddingRight: Theme.spacing.s }}>
            <Text style={styles.itemName}>{item.name}</Text>
            {item.type === 'MEDICATION' &&
            (item.currentPills ?? item.totalPills ?? 999) <= 10 ? (
              <Text style={[styles.itemMeta, { color: accent }]}>
                {t('dependent.home.lowMedToday', { names: item.name })}
              </Text>
            ) : null}
            {item.description ? (
              <Text style={styles.itemDescription}>{item.description}</Text>
            ) : (
              <Text style={styles.itemDescriptionMuted}>{t('treatment.list.noDescription')}</Text>
            )}
          </View>
          <View style={styles.actions}>
            {item.type === 'MEDICATION' ? (
              <Text
                style={[
                  styles.stockMarginBadge,
                  (item.currentPills ?? item.totalPills ?? 999) <= 10 && styles.stockMarginBadgeLow,
                ]}
              >
                {item.currentPills ?? item.totalPills ?? 0}
              </Text>
            ) : null}
            <Pressable onPress={onRemove} style={styles.actionBtn} hitSlop={8}>
              <MaterialIcons name="delete-outline" size={24} color={Theme.colors.accentOrange} />
            </Pressable>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  content: {
    padding: Theme.spacing.l,
    paddingBottom: 120,
  },
  sectionTitle: {
    fontSize: Theme.typography.title,
    fontWeight: '800',
    color: Theme.colors.textDark,
  },
  sectionSubtitle: {
    marginTop: Theme.spacing.xs,
    marginBottom: Theme.spacing.l,
    color: Theme.colors.textLight,
    lineHeight: 20,
  },
  groupSection: {
    marginTop: Theme.spacing.m,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.s,
  },
  groupIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.s,
  },
  groupTitle: {
    flex: 1,
    fontSize: Theme.typography.body,
    fontWeight: '700',
    color: Theme.colors.textDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  groupCount: {
    fontSize: Theme.typography.caption,
    color: Theme.colors.textLight,
    fontWeight: '600',
  },
  itemCard: {
    marginBottom: Theme.spacing.s,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemName: {
    fontSize: Theme.typography.body,
    fontWeight: '700',
    color: Theme.colors.textDark,
  },
  itemMeta: {
    marginTop: 2,
    fontSize: Theme.typography.caption,
    fontWeight: '600',
  },
  itemDescription: {
    marginTop: Theme.spacing.xs,
    fontSize: Theme.typography.caption,
    color: Theme.colors.textDark,
    lineHeight: 18,
  },
  itemDescriptionMuted: {
    marginTop: Theme.spacing.xs,
    fontSize: Theme.typography.caption,
    color: Theme.colors.textLight,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    padding: 4,
    marginLeft: 4,
  },
  stockMarginBadge: {
    fontSize: 18,
    fontWeight: '900',
    color: Theme.colors.textDark,
    minWidth: 36,
    textAlign: 'center',
    marginRight: Theme.spacing.xs,
  },
  stockMarginBadgeLow: {
    color: Theme.colors.accentOrange,
  },
  emptyText: {
    textAlign: 'center',
    color: Theme.colors.textLight,
    marginTop: Theme.spacing.xl,
    lineHeight: 22,
  },
});
