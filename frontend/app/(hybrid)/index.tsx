import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Card } from '../../components/Card';
import { Theme } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { router } from 'expo-router';

export default function HybridDashboard() {
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.replace('/');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Good evening: Barbara</Text>
        <Pressable onPress={handleLogout} style={styles.giftIcon}>
          <MaterialIcons name="card-giftcard" size={24} color={Theme.colors.textDark} />
        </Pressable>
      </View>

      {/* Główny kafelek - Lime Green */}
      <Pressable onPress={() => alert('Wzięto lek!')}>
        <Card variant="lime" style={styles.mainCard}>
          <Text style={styles.mainCardSubtitle}>Time to take:</Text>
          <Text style={styles.mainCardTime}>11:00 AM</Text>
          <Text style={styles.mainCardDetails}>6 medications (6 pills)</Text>
        </Card>
      </Pressable>

      {/* Karta informacyjna z pomarańczowym akcentem */}
      <Card variant="white" style={styles.infoCard}>
        <View style={styles.infoCardTop}>
          <Text style={styles.infoCardText}>Protect your device settings with 4-digit passcode.</Text>
          <MaterialIcons name="close" size={20} color={Theme.colors.textLight} />
        </View>
        <View style={styles.infoCardBottom}>
          <Text style={styles.setupText}>Setup now</Text>
          <MaterialIcons name="campaign" size={36} color={Theme.colors.accentOrange} />
        </View>
      </Card>

      {/* Sekcja Harmonogramu */}
      <Text style={styles.sectionTitle}>Today's schedule</Text>

      {/* Szara karta (przeszłość) */}
      <Card variant="grey" style={styles.scheduleCard}>
        <Text style={styles.scheduleTime}>10:00 AM</Text>
        
        <View style={styles.scheduleRow}>
          <MaterialIcons name="check-circle" size={20} color={Theme.colors.success} />
          <Text style={styles.scheduleItemDone}>6 Meds: Taken 10:02 AM</Text>
        </View>

        <View style={styles.scheduleRow}>
          <MaterialIcons name="circle" size={8} color={Theme.colors.accentOrange} style={{ marginLeft: 6, marginRight: 6 }} />
          <Text style={styles.scheduleItemWarning}>Incomplete dose: 3/4 pills taken</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.scheduleRow}>
          <MaterialIcons name="check-circle" size={20} color={Theme.colors.success} />
          <Text style={styles.scheduleItemDone}>3 Meds: Taken 10:30 AM</Text>
          <View style={{ flex: 1 }} />
          <MaterialIcons name="medication" size={20} color={Theme.colors.textLight} />
        </View>
      </Card>

      {/* Aktywna, limonkowa sekcja */}
      <Card variant="lime" style={styles.activeScheduleCard}>
        <Text style={styles.scheduleTimeDark}>11:00 AM</Text>
        <Pressable style={styles.nowBtn}>
          <Text style={styles.nowBtnText}>Now</Text>
        </Pressable>
      </Card>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  content: {
    padding: Theme.spacing.l,
    paddingTop: Theme.spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.m,
  },
  greeting: {
    fontSize: Theme.typography.body,
    fontWeight: 'bold',
    color: Theme.colors.textDark,
  },
  giftIcon: {
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 8,
    padding: 6,
  },
  mainCard: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.xl,
    borderRadius: 8, // Mniejsze zaokrąglenie, jak na zdjęciu
  },
  mainCardSubtitle: {
    fontSize: Theme.typography.body,
    fontWeight: '600',
    color: Theme.colors.textDark,
    marginBottom: Theme.spacing.xs,
  },
  mainCardTime: {
    fontSize: Theme.typography.huge,
    fontWeight: '900',
    color: Theme.colors.textDark,
    marginBottom: Theme.spacing.xs,
  },
  mainCardDetails: {
    fontSize: Theme.typography.body,
    fontWeight: '600',
    color: Theme.colors.textDark,
  },
  infoCard: {
    borderRadius: 8,
    marginTop: Theme.spacing.m,
  },
  infoCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoCardText: {
    flex: 1,
    fontSize: Theme.typography.body,
    fontWeight: '600',
    color: Theme.colors.textDark,
    paddingRight: Theme.spacing.m,
  },
  infoCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: Theme.spacing.m,
  },
  setupText: {
    color: Theme.colors.accentOrange,
    fontWeight: 'bold',
    fontSize: Theme.typography.body,
  },
  sectionTitle: {
    fontSize: Theme.typography.body,
    fontWeight: '500',
    color: Theme.colors.textDark,
    marginTop: Theme.spacing.xl,
    marginBottom: Theme.spacing.m,
  },
  scheduleCard: {
    borderRadius: 8,
    padding: Theme.spacing.m,
  },
  scheduleTime: {
    fontSize: Theme.typography.body,
    fontWeight: '600',
    color: Theme.colors.textDark,
    marginBottom: Theme.spacing.m,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.s,
  },
  scheduleItemDone: {
    fontSize: Theme.typography.caption,
    color: Theme.colors.textLight,
    marginLeft: Theme.spacing.s,
  },
  scheduleItemWarning: {
    fontSize: Theme.typography.caption,
    color: Theme.colors.textLight,
    marginLeft: Theme.spacing.s,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: Theme.spacing.m,
  },
  activeScheduleCard: {
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Theme.spacing.m,
  },
  scheduleTimeDark: {
    fontSize: Theme.typography.body,
    fontWeight: '600',
    color: Theme.colors.textDark,
  },
  nowBtn: {
    backgroundColor: Theme.colors.primaryLimeDark,
    paddingHorizontal: Theme.spacing.m,
    paddingVertical: Theme.spacing.xs,
    borderRadius: 16,
  },
  nowBtnText: {
    color: Theme.colors.surfaceWhite,
    fontWeight: 'bold',
    fontSize: Theme.typography.small,
  }
});
