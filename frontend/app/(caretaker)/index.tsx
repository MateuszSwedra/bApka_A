import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Card } from '../../components/Card';
import { Theme } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

export default function CaretakerDashboard() {
  const { logout } = useAuth();

  const handleAddDependent = () => {
    router.push('/(caretaker)/pairing');
  };

  const handleDependentPress = (id: string) => {
    router.push(`/(caretaker)/dependent/${id}`);
  };

  const handleLogout = () => {
    logout();
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Witaj, Opiekunie</Text>
          <Text style={styles.subtitle}>Twoi podopieczni</Text>
        </View>
        <Pressable onPress={handleLogout} style={styles.logoutBtn}>
          <MaterialIcons name="logout" size={24} color={Theme.colors.accentOrange} />
        </Pressable>
      </View>

      <ScrollView style={styles.scroll}>
        <Pressable onPress={() => handleDependentPress('1')}>
          <Card variant="white" style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>AK</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.dependentName}>Anna Kowalska</Text>
                <Text style={styles.statusOk}>Ostatnio: 08:30 (Wzięto leki)</Text>
              </View>
              <MaterialIcons name="chevron-right" size={28} color={Theme.colors.textLight} />
            </View>
          </Card>
        </Pressable>

        <Pressable onPress={() => handleDependentPress('2')}>
          <Card variant="white" style={styles.cardWarning}>
            <View style={styles.cardHeader}>
              <View style={[styles.avatar, { backgroundColor: Theme.colors.accentOrange }]}>
                <Text style={styles.avatarText}>JN</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.dependentName}>Jan Nowak</Text>
                <Text style={styles.statusWarning}>POMINIĘTY LEK: 12:00</Text>
              </View>
              <MaterialIcons name="chevron-right" size={28} color={Theme.colors.textLight} />
            </View>
          </Card>
        </Pressable>
      </ScrollView>

      {/* FAB */}
      <Pressable style={styles.fab} onPress={handleAddDependent}>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Theme.spacing.l,
    paddingTop: Theme.spacing.xxl,
    backgroundColor: Theme.colors.surfaceWhite,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    zIndex: 10,
  },
  greeting: {
    fontSize: Theme.typography.title,
    fontWeight: '800',
    color: Theme.colors.textDark,
  },
  subtitle: {
    fontSize: Theme.typography.caption,
    color: Theme.colors.textLight,
    marginTop: Theme.spacing.xs,
  },
  logoutBtn: {
    padding: Theme.spacing.s,
  },
  scroll: {
    padding: Theme.spacing.m,
  },
  card: {
    marginBottom: Theme.spacing.m,
  },
  cardWarning: {
    marginBottom: Theme.spacing.m,
    borderColor: Theme.colors.accentOrange,
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Theme.colors.primaryLime,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: Theme.colors.textDark,
    fontSize: Theme.typography.body,
    fontWeight: 'bold',
  },
  cardInfo: {
    flex: 1,
    marginLeft: Theme.spacing.m,
  },
  dependentName: {
    fontSize: Theme.typography.body,
    fontWeight: '700',
    color: Theme.colors.textDark,
  },
  statusOk: {
    fontSize: Theme.typography.caption,
    color: Theme.colors.success,
    marginTop: Theme.spacing.xs,
    fontWeight: '600',
  },
  statusWarning: {
    fontSize: Theme.typography.caption,
    color: Theme.colors.accentOrange,
    marginTop: Theme.spacing.xs,
    fontWeight: '700',
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
