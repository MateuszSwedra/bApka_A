import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Card } from '../../../../components/Card';
import { Theme } from '../../../../constants/theme';
import { useLocalSearchParams, router } from 'expo-router';

export default function DependentTodayDashboard() {
  const { id } = useLocalSearchParams();
  const dependentName = id === '1' ? 'Anna Kowalska' : 'Jan Nowak';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>{dependentName}</Text>

      <Card variant="lime" style={styles.mainCard}>
        <Text style={styles.mainCardSubtitle}>Next required action:</Text>
        <Text style={styles.mainCardTime}>11:00 AM</Text>
        <Text style={styles.mainCardDetails}>6 medications (6 pills)</Text>
      </Card>

      <Card variant="white" style={styles.infoCard}>
        <View style={styles.infoCardTop}>
          <Text style={styles.infoCardText}>Urządzenie poprawnie zsynchronizowane</Text>
        </View>
        <View style={styles.infoCardBottom}>
          <Text style={styles.setupText}>Status: OK</Text>
          <MaterialIcons name="check-circle" size={36} color={Theme.colors.success} />
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Today's schedule</Text>

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
      </Card>

      <Card variant="lime" style={styles.activeScheduleCard}>
        <View>
          <Text style={styles.scheduleTimeDark}>11:00 AM</Text>
          <Text style={styles.activeMedName}>Acard 75mg</Text>
        </View>
        <View style={styles.nowBtn}>
          <Text style={styles.nowBtnText}>Oczekuje</Text>
        </View>
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
    paddingTop: Theme.spacing.m,
  },
  greeting: {
    fontSize: Theme.typography.title,
    fontWeight: 'bold',
    color: Theme.colors.textDark,
    marginBottom: Theme.spacing.m,
  },
  mainCard: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.xl,
    borderRadius: 8,
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
    color: Theme.colors.success,
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
  activeScheduleCard: {
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Theme.spacing.m,
    marginTop: Theme.spacing.s,
  },
  scheduleTimeDark: {
    fontSize: Theme.typography.body,
    fontWeight: '600',
    color: Theme.colors.textDark,
  },
  activeMedName: {
    fontSize: Theme.typography.caption,
    color: Theme.colors.primaryLimeDark,
    marginTop: 4,
    fontWeight: 'bold',
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
