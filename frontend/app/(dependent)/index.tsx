import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { HugeButton } from '../../components/HugeButton';
import { Card } from '../../components/Card';
import { Theme } from '../../constants/theme';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { scheduleAPI } from '../../services/api';

export default function DependentDashboard() {
  const isTimeForMeds = true; // Dla celów prezentacyjnych

  const handleTakeMeds = async () => {
    try {
      await scheduleAPI.markTaken('mock-schedule-id');
      alert("Zanotowano przyjęcie leku!");
    } catch (e) {
      alert("Wystąpił błąd podczas łączenia z serwerem.");
    }
  };

  const handleSOS = () => {
    alert("Powiadomiono opiekuna poprzez backend!");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.clock}>12:30</Text>
      
      {isTimeForMeds ? (
        <Text style={styles.subtitle}>Pora na Twój lek!</Text>
      ) : (
        <Text style={styles.subtitle}>Następny lek o 16:00</Text>
      )}

      <View style={styles.mainActionContainer}>
        <HugeButton 
          title="WZIĄŁEM LEK" 
          size="huge" 
          variant={isTimeForMeds ? 'success' : 'primary'}
          disabled={!isTimeForMeds}
          onPress={handleTakeMeds} 
          style={styles.hugeButton}
        />
        
        <HugeButton 
          title="SOS - NAGŁY WYPADEK" 
          variant="warning"
          onPress={handleSOS} 
          style={styles.sosButton}
        />
      </View>

      <Pressable onPress={() => router.push('/(dependent)/calendar')} style={styles.scheduleContainer}>
        <Card variant="grey" style={styles.scheduleCard}>
          <View style={styles.scheduleHeader}>
            <Text style={styles.scheduleTitle}>Dzisiejszy harmonogram</Text>
            <MaterialIcons name="chevron-right" size={32} color={Theme.colors.textLight} />
          </View>
          <View style={styles.scheduleRow}>
            <Text style={styles.scheduleTime}>08:00</Text>
            <MaterialIcons name="check-circle" size={24} color={Theme.colors.success} />
            <Text style={styles.scheduleItem}>Lek poranny</Text>
          </View>
          <View style={styles.scheduleRow}>
            <Text style={styles.scheduleTime}>12:30</Text>
            <MaterialIcons name="radio-button-unchecked" size={24} color={Theme.colors.textLight} />
            <Text style={styles.scheduleItem}>Lek popołudniowy</Text>
          </View>
        </Card>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    alignItems: 'center',
    padding: Theme.spacing.l,
    paddingTop: Theme.spacing.xxl,
  },
  clock: {
    fontSize: 72,
    fontWeight: 'bold',
    color: Theme.colors.textDark,
  },
  subtitle: {
    fontSize: Theme.typography.title,
    color: Theme.colors.textLight,
    marginBottom: Theme.spacing.m,
  },
  mainActionContainer: {
    width: '100%',
    flex: 1,
    justifyContent: 'center',
    marginBottom: Theme.spacing.l,
  },
  hugeButton: {
    flex: 1,
    minHeight: 180,
    marginBottom: Theme.spacing.m,
  },
  sosButton: {
    minHeight: 80,
  },
  scheduleContainer: {
    width: '100%',
  },
  scheduleCard: {
    padding: Theme.spacing.m,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.s,
  },
  scheduleTitle: {
    fontSize: Theme.typography.title,
    fontWeight: 'bold',
    color: Theme.colors.textDark,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Theme.spacing.s,
  },
  scheduleTime: {
    fontSize: Theme.typography.body,
    fontWeight: 'bold',
    color: Theme.colors.textDark,
    width: 60,
  },
  scheduleItem: {
    fontSize: Theme.typography.body,
    color: Theme.colors.textDark,
    marginLeft: Theme.spacing.s,
  }
});
