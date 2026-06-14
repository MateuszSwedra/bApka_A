import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Theme } from '../../../constants/theme';
import { TREATMENT_TYPE_ORDER, TREATMENT_VISUAL } from '../../../constants/treatmentVisuals';
import { useMeds, Treatment } from '../../../context/MedsContext';
import { Card } from '../../../components/Card';
import { useFocusEffect } from 'expo-router';
import { useDependentTabTopInset } from '../../../utils/useDependentTabTopInset';
import { useTranslation } from 'react-i18next';
import { getTreatmentGroupLabel } from '../../../i18n/treatmentLabels';
import { useSelfUserId } from '../../../hooks/useSelfUserId';
import { openAddTreatment, openEditTreatment } from '../../../utils/medsFlowNavigation';
import { SeniorTourAnchor } from '../../../components/senior/SeniorTourAnchor';
import { getSeniorTourStepSeen, setSeniorTourStepSeen } from '../../../services/seniorTourState';
import {
  CaretakerTourScrollProvider,
  CaretakerTourScrollView,
} from '../../../context/CaretakerTourScrollContext';

export default function HybridTreatmentsScreen() {
  const { t } = useTranslation();
  const selfUserId = useSelfUserId();
  const topInset = useDependentTabTopInset();
  const { treatments, removeTreatment, refetchFromServer } = useMeds();

  const grouped = TREATMENT_TYPE_ORDER.map(type => ({
    type,
    meta: TREATMENT_VISUAL[type],
    items: treatments.filter(tr => tr.type === type),
  })).filter(group => group.items.length > 0);

  const firstTreatmentId = grouped.flatMap(group => group.items)[0]?.id;

  useFocusEffect(
    useCallback(() => {
      if (selfUserId) void refetchFromServer(selfUserId);
      void (async () => {
        if (!firstTreatmentId && (await getSeniorTourStepSeen('treatments-add'))) {
          await setSeniorTourStepSeen('treatments-edit');
        }
      })();
    }, [selfUserId, refetchFromServer, firstTreatmentId]),
  );

  const handleOpenAddTreatment = () => {
    if (selfUserId) openAddTreatment(selfUserId, 'hybrid');
  };

  return (
    <CaretakerTourScrollProvider>
      <View style={styles.container}>
        <CaretakerTourScrollView contentContainerStyle={[styles.content, { paddingTop: topInset + Theme.spacing.l }]}>
          <Text style={styles.sectionTitle}>{t('treatment.list.title')}</Text>
          <Text style={styles.sectionSubtitle}>{t('hybrid.treatmentsSubtitle')}</Text>

          <SeniorTourAnchor
            stepId="treatments-add"
            titleKey="senior.tour.treatmentsAdd.title"
            bodyKey="senior.tour.treatmentsAdd.body"
            placement="bottom"
            wrapStyle={styles.addRowWrap}
          >
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
          </SeniorTourAnchor>

          {grouped.length === 0 ? (
            <Text style={styles.emptyText}>{t('treatment.list.empty')}</Text>
          ) : (
            grouped.map(group => (
              <View key={group.type} style={styles.groupSection}>
                <View style={styles.groupHeader}>
                  <View style={[styles.groupIconCircle, { backgroundColor: group.meta.accent + '22' }]}>
                    <MaterialIcons name={group.meta.icon} size={20} color={group.meta.accent} />
                  </View>
                  <Text style={styles.groupTitle}>{getTreatmentGroupLabel(group.type)}</Text>
                  <Text style={styles.groupCount}>{group.items.length}</Text>
                </View>
                {group.items.map(item => {
                  const card = (
                    <TreatmentCard
                      key={item.id}
                      item={item}
                      accent={group.meta.accent}
                      onEdit={() => openEditTreatment(item.id, 'hybrid')}
                      onRemove={() => void removeTreatment(item.id, selfUserId ?? undefined)}
                    />
                  );

                  if (item.id !== firstTreatmentId) {
                    return card;
                  }

                  return (
                    <SeniorTourAnchor
                      key={item.id}
                      stepId="treatments-edit"
                      titleKey="senior.tour.treatmentsEdit.title"
                      bodyKey="senior.tour.treatmentsEdit.body"
                      placement="bottom"
                      afterStepId="treatments-add"
                      tooltipGap={24}
                      wrapStyle={styles.tourCardWrap}
                    >
                      {card}
                    </SeniorTourAnchor>
                  );
                })}
              </View>
            ))
          )}
        </CaretakerTourScrollView>
      </View>
    </CaretakerTourScrollProvider>
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
            {item.type === 'MEDICATION' && typeof item.totalPills === 'number' ? (
              <Text style={[styles.itemMeta, { color: accent }]}>
                {t('treatment.list.stock', { count: item.totalPills })}
              </Text>
            ) : null}
            {item.description ? (
              <Text style={styles.itemDescription}>{item.description}</Text>
            ) : (
              <Text style={styles.itemDescriptionMuted}>{t('treatment.list.noDescription')}</Text>
            )}
          </View>
          <View style={styles.actions}>
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
  container: { flex: 1, backgroundColor: Theme.colors.background },
  content: { padding: Theme.spacing.l, paddingBottom: 120 },
  sectionTitle: { fontSize: Theme.typography.title, fontWeight: '800', color: Theme.colors.textDark },
  sectionSubtitle: { marginTop: Theme.spacing.xs, marginBottom: Theme.spacing.m, color: Theme.colors.textLight, lineHeight: 20 },
  addRowWrap: { width: '100%' },
  tourCardWrap: { width: '100%' },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.m,
    borderRadius: Theme.borderRadius.medium,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Theme.colors.primaryLimeDark,
    backgroundColor: Theme.colors.primaryLime + '55',
    marginBottom: Theme.spacing.l,
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
  groupSection: { marginTop: Theme.spacing.m },
  groupHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Theme.spacing.s },
  groupIconCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: Theme.spacing.s },
  groupTitle: { flex: 1, fontSize: Theme.typography.body, fontWeight: '700', color: Theme.colors.textDark, textTransform: 'uppercase', letterSpacing: 0.5 },
  groupCount: { fontSize: Theme.typography.caption, color: Theme.colors.textLight, fontWeight: '600' },
  itemCard: { marginBottom: Theme.spacing.s },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  itemName: { fontSize: Theme.typography.body, fontWeight: '700', color: Theme.colors.textDark },
  itemMeta: { marginTop: 2, fontSize: Theme.typography.caption, fontWeight: '600' },
  itemDescription: { marginTop: Theme.spacing.xs, fontSize: Theme.typography.caption, color: Theme.colors.textDark, lineHeight: 18 },
  itemDescriptionMuted: { marginTop: Theme.spacing.xs, fontSize: Theme.typography.caption, color: Theme.colors.textLight, fontStyle: 'italic' },
  actions: { flexDirection: 'row', alignItems: 'center' },
  actionBtn: { padding: 4, marginLeft: 4 },
  emptyText: { textAlign: 'center', color: Theme.colors.textLight, marginTop: Theme.spacing.xl, lineHeight: 22 },
});
