import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform, ScrollView } from 'react-native';
import { Card } from '../../components/Card';
import { Theme } from '../../constants/theme';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { scheduleAPI } from '../../services/api';

export default function DependentDashboard() {
  const { logout } = useAuth();
  const isTimeForMeds = true; // Dla celów prezentacyjnych

  const handleLogout = async () => {
    await logout();
    if (Platform.OS === 'web') {
      window.location.href = '/';
    } else {
      router.replace('/');
    }
  };

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
      <View style={styles.header}>
        <View style={styles.greeting}>
          <Text style={styles.greetingText}>Dzień dobry,</Text>
          <Text style={styles.nameText}>Seniorze</Text>
        </View>
        <Pressable onPress={handleLogout} style={styles.logoutBtn}>
          <MaterialIcons name="logout" size={28} color={Theme.colors.accentOrange} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.clockContainer}>
          <Text style={styles.clock}>12:30</Text>
          {isTimeForMeds ? (
            <View style={styles.statusBadge}>
              <MaterialIcons name="notifications-active" size={16} color={Theme.colors.surfaceWhite} />
              <Text style={styles.statusText}>Pora na Twój lek!</Text>
            </View>
          ) : (
            <View style={[styles.statusBadge, styles.statusBadgeNormal]}>
              <MaterialIcons name="schedule" size={16} color={Theme.colors.textDark} />
              <Text style={[styles.statusText, {color: Theme.colors.textDark}]}>Następny lek o 16:00</Text>
            </View>
          )}
        </View>

        <Pressable 
          style={({ pressed }) => [styles.mainActionCard, pressed && styles.pressedCard, !isTimeForMeds && styles.disabledCard]}
          onPress={handleTakeMeds}
          disabled={!isTimeForMeds}
        >
          <View style={styles.mainActionIcon}>
            <MaterialIcons name="medication" size={64} color={Theme.colors.surfaceWhite} />
          </View>
          <Text style={styles.mainActionText}>WZIĄŁEM LEK</Text>
        </Pressable>

        <Pressable 
          style={({ pressed }) => [styles.sosCard, pressed && styles.pressedCard]}
          onPress={handleSOS}
        >
          <MaterialIcons name="emergency" size={32} color={Theme.colors.surfaceWhite} />
          <Text style={styles.sosText}>SOS - NAGŁY WYPADEK</Text>
        </Pressable>

        <Pressable onPress={() => router.push('/(dependent)/calendar')} style={styles.scheduleContainer}>
          <View style={styles.scheduleHeader}>
            <Text style={styles.scheduleTitle}>Dzisiejszy harmonogram</Text>
            <MaterialIcons name="calendar-today" size={24} color={Theme.colors.textLight} />
          </View>
          
          <Card style={styles.scheduleCard}>
            <View style={styles.scheduleRow}>
              <View style={styles.timeBadge}>
                <Text style={styles.scheduleTime}>08:00</Text>
              </View>
              <Text style={[styles.scheduleItem, styles.scheduleItemTaken]}>Lek poranny</Text>
              <MaterialIcons name="check-circle" size={28} color={Theme.colors.success} />
            </View>
            <View style={styles.scheduleDivider} />
            <View style={styles.scheduleRow}>
              <View style={[styles.timeBadge, styles.timeBadgePending]}>
                <Text style={[styles.scheduleTime, styles.scheduleTimePending]}>12:30</Text>
              </View>
              <Text style={styles.scheduleItem}>Lek popołudniowy</Text>
              <MaterialIcons name="radio-button-unchecked" size={28} color={Theme.colors.textLight} />
            </View>
          </Card>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.surfaceGrey,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.l,
    paddingTop: Theme.spacing.xxl,
    paddingBottom: Theme.spacing.m,
    backgroundColor: Theme.colors.surfaceWhite,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  greeting: {
    flex: 1,
  },
  greetingText: {
    fontSize: Theme.typography.caption,
    color: Theme.colors.textLight,
  },
  nameText: {
    fontSize: Theme.typography.title,
    fontWeight: 'bold',
    color: Theme.colors.textDark,
  },
  logoutBtn: {
    padding: Theme.spacing.s,
    backgroundColor: '#FFE5E0',
    borderRadius: Theme.borderRadius.round,
  },
  scrollContent: {
    padding: Theme.spacing.l,
    paddingBottom: Theme.spacing.xxl,
  },
  clockContainer: {
    alignItems: 'center',
    marginBottom: Theme.spacing.xl,
    marginTop: Theme.spacing.m,
  },
  clock: {
    fontSize: 80,
    fontWeight: '900',
    color: Theme.colors.textDark,
    letterSpacing: -2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.primaryLimeDark,
    paddingHorizontal: Theme.spacing.m,
    paddingVertical: Theme.spacing.s,
    borderRadius: Theme.borderRadius.round,
    marginTop: -Theme.spacing.s,
  },
  statusBadgeNormal: {
    backgroundColor: Theme.colors.border,
  },
  statusText: {
    color: Theme.colors.surfaceWhite,
    fontWeight: 'bold',
    marginLeft: Theme.spacing.xs,
    fontSize: Theme.typography.small,
  },
  mainActionCard: {
    backgroundColor: Theme.colors.primaryLimeDark,
    borderRadius: Theme.borderRadius.xlarge,
    padding: Theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 220,
    marginBottom: Theme.spacing.l,
    shadowColor: Theme.colors.primaryLimeDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  disabledCard: {
    backgroundColor: Theme.colors.textLight,
    shadowOpacity: 0,
    elevation: 0,
  },
  pressedCard: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  mainActionIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.m,
  },
  mainActionText: {
    fontSize: Theme.typography.title,
    fontWeight: '900',
    color: Theme.colors.surfaceWhite,
    letterSpacing: 1,
  },
  sosCard: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.accentOrange,
    borderRadius: Theme.borderRadius.large,
    padding: Theme.spacing.l,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.xl,
    shadowColor: Theme.colors.accentOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sosText: {
    fontSize: Theme.typography.body,
    fontWeight: 'bold',
    color: Theme.colors.surfaceWhite,
    marginLeft: Theme.spacing.s,
  },
  scheduleContainer: {
    width: '100%',
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.m,
    paddingHorizontal: Theme.spacing.xs,
  },
  scheduleTitle: {
    fontSize: Theme.typography.title,
    fontWeight: 'bold',
    color: Theme.colors.textDark,
  },
  scheduleCard: {
    padding: Theme.spacing.m,
    borderRadius: Theme.borderRadius.large,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.s,
  },
  scheduleDivider: {
    height: 1,
    backgroundColor: Theme.colors.border,
    marginVertical: Theme.spacing.xs,
  },
  timeBadge: {
    backgroundColor: Theme.colors.surfaceGrey,
    paddingHorizontal: Theme.spacing.s,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.small,
    width: 60,
    alignItems: 'center',
  },
  timeBadgePending: {
    backgroundColor: '#FFF8E1',
  },
  scheduleTime: {
    fontSize: Theme.typography.small,
    fontWeight: 'bold',
    color: Theme.colors.textLight,
  },
  scheduleTimePending: {
    color: '#F57F17',
  },
  scheduleItem: {
    flex: 1,
    fontSize: Theme.typography.body,
    fontWeight: '600',
    color: Theme.colors.textDark,
    marginLeft: Theme.spacing.m,
  },
  scheduleItemTaken: {
    color: Theme.colors.textLight,
    textDecorationLine: 'line-through',
  }
});
