import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Theme } from '../../../../constants/theme';
import { useMeds } from '../../../../context/MedsContext';
import { Card } from '../../../../components/Card';
import { useLocalSearchParams, router } from 'expo-router';

export default function DependentMedsScreen() {
  const { id } = useLocalSearchParams();
  const { inventory, removeInventoryItem } = useMeds();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        
        <Text style={styles.sectionTitle}>Stan Apteczki</Text>

        {inventory.map(item => (
          <Card key={item.id} variant="white" style={styles.inventoryCard}>
            <View style={styles.itemHeader}>
              <View>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemDetails}>
                  Fizyczny zapas w pudełku: {item.totalPills} szt.
                </Text>
              </View>
              <Pressable onPress={() => removeInventoryItem(item.id)} style={styles.deleteBtn}>
                <MaterialIcons name="delete-outline" size={24} color={Theme.colors.accentOrange} />
              </Pressable>
            </View>
          </Card>
        ))}

        {inventory.length === 0 && (
          <Text style={styles.emptyText}>Apteczka jest pusta. Dodaj lek, aby móc zarządzać jego harmonogramem.</Text>
        )}

      </ScrollView>

      {/* FAB przeniósł się tutaj, przenosi do ekranu dodawania zapasu */}
      <Pressable style={styles.fab} onPress={() => router.push(`/(caretaker)/add-inventory/${id}`)}>
        <MaterialIcons name="add" size={32} color={Theme.colors.textDark} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  content: {
    padding: Theme.spacing.l,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: Theme.typography.title,
    fontWeight: '800',
    color: Theme.colors.textDark,
    marginBottom: Theme.spacing.m,
  },
  inventoryCard: {
    marginBottom: Theme.spacing.m,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    fontSize: Theme.typography.title,
    fontWeight: '700',
    color: Theme.colors.textDark,
  },
  itemDetails: {
    fontSize: Theme.typography.body,
    color: Theme.colors.textLight,
    marginTop: 4,
  },
  deleteBtn: {
    padding: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: Theme.colors.textLight,
    marginTop: Theme.spacing.xl,
    lineHeight: 24,
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
  }
});
