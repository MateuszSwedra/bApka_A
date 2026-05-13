import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Theme } from '../../../../constants/theme';
import { TREATMENT_TYPE_ORDER, TREATMENT_VISUAL } from '../../../../constants/treatmentVisuals';
import { useMeds, Treatment } from '../../../../context/MedsContext';
import { Card } from '../../../../components/Card';
import { useLocalSearchParams, router } from 'expo-router';

export default function DependentTreatmentsScreen() {
  const { id } = useLocalSearchParams();
  const { treatments, removeTreatment } = useMeds();

  const grouped = TREATMENT_TYPE_ORDER.map(type => ({
    type,
    meta: TREATMENT_VISUAL[type],
    items: treatments.filter(t => t.type === type),
  })).filter(group => group.items.length > 0);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Aktywności medyczne</Text>
        <Text style={styles.sectionSubtitle}>
          Lista aktywności podopiecznego. Każda może zawierać opis (np. „przyjmować z jedzeniem").
        </Text>

        {grouped.length === 0 && (
          <Text style={styles.emptyText}>
            Brak aktywności. Dodaj pierwszą za pomocą przycisku „+".
          </Text>
        )}

        {grouped.map(group => (
          <View key={group.type} style={styles.groupSection}>
            <View style={styles.groupHeader}>
              <View style={[styles.groupIconCircle, { backgroundColor: group.meta.accent + '22' }]}>
                <MaterialIcons name={group.meta.icon} size={20} color={group.meta.accent} />
              </View>
              <Text style={styles.groupTitle}>{group.meta.groupLabel}</Text>
              <Text style={styles.groupCount}>{group.items.length}</Text>
            </View>

            {group.items.map(item => (
              <TreatmentCard
                key={item.id}
                item={item}
                accent={group.meta.accent}
                onEdit={() => router.push(`/(caretaker)/edit-treatment/${item.id}` as any)}
                onRemove={() => removeTreatment(item.id)}
              />
            ))}
          </View>
        ))}
      </ScrollView>

      <Pressable
        style={styles.fab}
        onPress={() => router.push(`/(caretaker)/add-treatment/${id}` as any)}
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
  return (
    <Card variant="white" style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <View style={{ flex: 1, paddingRight: Theme.spacing.s }}>
          <Text style={styles.itemName}>{item.name}</Text>
          {item.type === 'MEDICATION' && typeof item.totalPills === 'number' && (
            <Text style={[styles.itemMeta, { color: accent }]}>
              Zapas: {item.totalPills} szt.
            </Text>
          )}
          {item.description ? (
            <Text style={styles.itemDescription}>{item.description}</Text>
          ) : (
            <Text style={styles.itemDescriptionMuted}>Brak opisu</Text>
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
    bottom: Theme.spacing.xl,
    right: Theme.spacing.xl,
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
