import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { Theme } from '../../constants/theme';
import { router } from 'expo-router';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { format, isBefore, isSameDay } from 'date-fns';
import { useMeds } from '../../context/MedsContext';

export default function DependentDashboard() {
  const [moodState, setMoodState] = useState<'ask' | 'thank' | 'hidden'>('ask');
  const [currentTime, setCurrentTime] = useState(format(new Date(), 'HH:mm'));

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(format(new Date(), 'HH:mm'));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const handleMoodSelect = () => {
    setMoodState('thank');
    setTimeout(() => setMoodState('hidden'), 2500);
  };

  const { schedules, treatments, inventory } = useMeds();
  const [takenIds, setTakenIds] = useState<Set<string>>(new Set());

  const getIsoDay = (date: Date) => {
    const d = date.getDay();
    return d === 0 ? 7 : d;
  };

  const todaySchedules = schedules.filter(sch => {
    if (sch.type === 'ONCE') {
      return sch.startDate === format(new Date(), 'yyyy-MM-dd');
    }
    const now = new Date();
    const currentIsoDay = getIsoDay(now);
    if (!sch.daysOfWeek.includes(currentIsoDay)) return false;
    
    const isAfterOrOnStart = !isBefore(now, new Date(sch.startDate)) || isSameDay(now, new Date(sch.startDate));
    let isBeforeOrOnEnd = true;
    if (sch.type === 'TEMPORARY' && sch.endDate) {
      isBeforeOrOnEnd = !isBefore(new Date(sch.endDate), now) || isSameDay(now, new Date(sch.endDate));
    }
    return isAfterOrOnStart && isBeforeOrOnEnd;
  });

  const activities = todaySchedules.map(sch => {
    const treatment = treatments.find(t => t.id === sch.treatmentId || t.id === sch.inventoryId);
    return {
      id: sch.id,
      time: sch.time,
      name: treatment?.name || sch.customName || 'Nieznana aktywność',
      taken: takenIds.has(sch.id),
    };
  }).sort((a, b) => a.time.localeCompare(b.time));

  const medsLeft = inventory.map(inv => ({
    id: inv.id,
    name: inv.name,
    amount: inv.totalPills,
    unit: 'szt.'
  }));

  const nextActivity = activities.find(a => !a.taken);
  
  let buttonState: 'active' | 'inactive' | 'done' = 'done';
  if (nextActivity) {
    if (nextActivity.time <= currentTime) {
      buttonState = 'active';
    } else {
      buttonState = 'inactive';
    }
  }

  const handleMainAction = () => {
    if (buttonState === 'active' && nextActivity) {
      setTakenIds(prev => new Set(prev).add(nextActivity.id));
    }
  };

  const handleSOS = () => {
    Alert.alert("SOS", "Kliknięto guzik SOS. (Powiadomienie dla opiekuna w przygotowaniu)");
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Panel Seniora</Text>
        <Pressable onPress={() => router.push('/(dependent)/settings')} style={styles.iconBtn}>
          <MaterialIcons name="settings" size={36} color={Theme.colors.primaryLimeDark} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* 1. Mood Button */}
        {moodState !== 'hidden' && (
          <View style={styles.moodContainer}>
            {moodState === 'ask' ? (
              <>
                <Text style={styles.moodTitle}>Jak się dzisiaj czujesz?</Text>
                <View style={styles.moodEmojis}>
                  <Pressable onPress={handleMoodSelect} style={styles.emojiBtn}>
                    <FontAwesome5 name="smile" size={48} color={Theme.colors.success} />
                  </Pressable>
                  <Pressable onPress={handleMoodSelect} style={styles.emojiBtn}>
                    <FontAwesome5 name="meh" size={48} color={Theme.colors.accentOrange} />
                  </Pressable>
                  <Pressable onPress={handleMoodSelect} style={styles.emojiBtn}>
                    <FontAwesome5 name="frown" size={48} color="#D32F2F" />
                  </Pressable>
                </View>
              </>
            ) : (
              <Text style={styles.moodThanks}>Dziękuję za informacje!</Text>
            )}
          </View>
        )}

        {/* 2. Main Button */}
        <View style={styles.mainButtonWrapper}>
          {buttonState === 'active' && nextActivity && (
            <Pressable style={[styles.mainBtn, styles.mainBtnActive]} onPress={handleMainAction}>
              <MaterialIcons name="touch-app" size={64} color={Theme.colors.surfaceWhite} />
              <Text style={styles.mainBtnText}>Weź lek lub zrób ćwiczenia</Text>
              <Text style={styles.mainBtnSubText}>{nextActivity.name}</Text>
            </Pressable>
          )}

          {buttonState === 'inactive' && nextActivity && (
            <View style={[styles.mainBtn, styles.mainBtnInactive]}>
              <MaterialIcons name="schedule" size={64} color={Theme.colors.textDark} />
              <Text style={[styles.mainBtnText, { color: Theme.colors.textDark }]}>
                Kolejna aktywność za: {nextActivity.time}
              </Text>
            </View>
          )}

          {buttonState === 'done' && (
            <View style={[styles.mainBtn, styles.mainBtnDone]}>
              <MaterialIcons name="done-all" size={64} color={Theme.colors.surfaceWhite} />
              <Text style={styles.mainBtnText}>Koniec aktywności na dzisiaj</Text>
            </View>
          )}
        </View>

        {/* 3. SOS Button */}
        <Pressable style={styles.sosBtn} onPress={handleSOS}>
          <MaterialIcons name="warning" size={40} color={Theme.colors.surfaceWhite} />
          <Text style={styles.sosText}>SOS</Text>
        </Pressable>

        {/* 4. Activities List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dzisiejsze aktywności</Text>
          {activities.map((item) => (
            <View key={item.id} style={[styles.activityItem, item.taken && styles.activityItemTaken]}>
              <Text style={styles.activityTime}>{item.time}</Text>
              <Text style={styles.activityName}>{item.name}</Text>
              <MaterialIcons
                name={item.taken ? "check-circle" : "radio-button-unchecked"}
                size={32}
                color={item.taken ? Theme.colors.success : Theme.colors.textDark}
              />
            </View>
          ))}
        </View>

        {/* 5. Calendar Button */}
        <Pressable style={styles.calendarBtn} onPress={() => router.push('/(dependent)/calendar')}>
          <MaterialIcons name="calendar-month" size={36} color={Theme.colors.textDark} />
          <Text style={styles.calendarBtnText}>Kalendarz (kolejne dni)</Text>
        </Pressable>

        {/* 6. Remaining Medications List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pozostało leków</Text>
          {medsLeft.map((med) => (
            <View key={med.id} style={styles.medItem}>
              <Text style={styles.medName}>{med.name}</Text>
              <Text style={styles.medAmount}>{med.amount} {med.unit}</Text>
            </View>
          ))}
        </View>

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
  headerTitle: {
    fontSize: Theme.typography.largeTitle,
    fontWeight: 'bold',
    color: Theme.colors.textDark,
  },
  iconBtn: {
    padding: Theme.spacing.xs,
  },
  scrollContent: {
    padding: Theme.spacing.m,
    paddingBottom: Theme.spacing.xxl,
  },
  moodContainer: {
    backgroundColor: Theme.colors.surfaceWhite,
    borderRadius: Theme.borderRadius.large,
    padding: Theme.spacing.l,
    marginBottom: Theme.spacing.l,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  moodTitle: {
    fontSize: Theme.typography.title,
    fontWeight: 'bold',
    marginBottom: Theme.spacing.m,
    color: Theme.colors.textDark,
  },
  moodEmojis: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  emojiBtn: {
    padding: Theme.spacing.s,
  },
  moodThanks: {
    fontSize: Theme.typography.title,
    fontWeight: 'bold',
    color: Theme.colors.success,
    paddingVertical: Theme.spacing.m,
  },
  mainButtonWrapper: {
    marginBottom: Theme.spacing.l,
  },
  mainBtn: {
    borderRadius: Theme.borderRadius.xlarge,
    padding: Theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  mainBtnActive: {
    backgroundColor: Theme.colors.primaryLimeDark,
  },
  mainBtnInactive: {
    backgroundColor: '#E0E0E0',
  },
  mainBtnDone: {
    backgroundColor: Theme.colors.success,
  },
  mainBtnText: {
    fontSize: 26,
    fontWeight: '900',
    color: Theme.colors.surfaceWhite,
    textAlign: 'center',
    marginTop: Theme.spacing.m,
  },
  mainBtnSubText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Theme.colors.primaryLime,
    textAlign: 'center',
    marginTop: Theme.spacing.s,
  },
  sosBtn: {
    flexDirection: 'row',
    backgroundColor: '#D32F2F',
    borderRadius: Theme.borderRadius.large,
    padding: Theme.spacing.m,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.xl,
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
  sosText: {
    fontSize: 28,
    fontWeight: '900',
    color: Theme.colors.surfaceWhite,
    marginLeft: Theme.spacing.m,
  },
  section: {
    marginBottom: Theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: Theme.typography.largeTitle,
    fontWeight: 'bold',
    color: Theme.colors.textDark,
    marginBottom: Theme.spacing.m,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceWhite,
    padding: Theme.spacing.m,
    borderRadius: Theme.borderRadius.medium,
    marginBottom: Theme.spacing.s,
  },
  activityItemTaken: {
    opacity: 0.6,
  },
  activityTime: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Theme.colors.textDark,
    width: 80,
  },
  activityName: {
    flex: 1,
    fontSize: 22,
    fontWeight: '600',
    color: Theme.colors.textDark,
  },
  calendarBtn: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.primaryLime,
    borderRadius: Theme.borderRadius.large,
    padding: Theme.spacing.l,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.xl,
  },
  calendarBtnText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Theme.colors.textDark,
    marginLeft: Theme.spacing.s,
  },
  medItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.surfaceWhite,
    padding: Theme.spacing.m,
    borderRadius: Theme.borderRadius.medium,
    marginBottom: Theme.spacing.s,
  },
  medName: {
    fontSize: 22,
    fontWeight: '600',
    color: Theme.colors.textDark,
  },
  medAmount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Theme.colors.accentOrange,
  },
});
