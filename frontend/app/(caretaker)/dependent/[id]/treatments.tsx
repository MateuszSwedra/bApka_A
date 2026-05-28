import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
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
import { openAddTreatmentForDependent } from '../../../../utils/caretakerNavigation';
import { pickDependentUserId } from '../../../../utils/resolveMedsTargetUserId';
import { useFabBottomOffset } from '../../../../utils/useFabBottomOffset';
import { useDependentTabTopInset } from '../../../../utils/useDependentTabTopInset';
import { useTranslation } from 'react-i18next';
import { getTreatmentGroupLabel } from '../../../../i18n/treatmentLabels';

export default function DependentTreatmentsScreen() {
  const { t } = useTranslation();
  const localParams = useLocalSearchParams<{ id?: string }>();
  const globalParams = useGlobalSearchParams<{ id?: string }>();
  const segments = useSegments();
  const fabBottom = useFabBottomOffset();
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

      <Pressable
        style={[styles.fab, { bottom: fabBottom }]}
        onPress={() => {
          if (!dependentId) {
            Alert.alert(t('common.error'), t('errors.invalidDependentProfile'));
            return;
          }
          openAddTreatmentForDependent(dependentId);
        }}
      >
        <MaterialIcons name="add" size={32} color={Theme.colors.textDark} />
      </Pressable>
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
    <Card variant="white" style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <View style={{ flex: 1, paddingRight: Theme.spacing.s }}>
          <Text style={styles.itemName}>{item.name}</Text>
          {item.type === 'MEDICATION' && typeof item.totalPills === 'number' && (
            <Text style={[styles.itemMeta, { color: accent }]}>
              {t('treatment.list.stock', { count: item.totalPills })}
            </Text>
          )}
          {item.description ? (
            <Text style={styles.itemDescription}>{item.description}</Text>
          ) : (
            <Text style={styles.itemDescriptionMuted}>{t('treatment.list.noDescription')}</Text>
          )}
        </View>
        <View style={styles.actions}>
          <Pressable onPress={onEdit} style={styles.actionBtn} hitSlop={8}>
            <MaterialIcons name="edit" size={22} color={Theme.colors.primaryLimeDark} />
          </Pressable>
          <Pressable onPress={onRemove} style={styles.actionBtn} hitSlop={8}>
            <MaterialIcons name="delete-outline" size={24} color={Theme.colors.accentOrange} />
          </Pressable>
        </View>
      </View>
    </Card>
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
  emptyText: {
    textAlign: 'center',
    color: Theme.colors.textLight,
    marginTop: Theme.spacing.xl,
    lineHeight: 22,
  },
  fab: {
    position: 'absolute',
    right: Theme.spacing.xl,
    zIndex: 10,
    elevation: 8,
    backgroundColor: Theme.colors.primaryLime,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.primaryLimeDark,
  },
});
