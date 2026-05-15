import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Card } from '../../../../components/Card';
import { Theme } from '../../../../constants/theme';
import { TREATMENT_VISUAL } from '../../../../constants/treatmentVisuals';
import { useLocalSearchParams, router, useFocusEffect, useGlobalSearchParams, useSegments } from 'expo-router';
import { pickDependentUserId } from '../../../../utils/resolveMedsTargetUserId';
import { openAddMedForDependent } from '../../../../utils/caretakerNavigation';
import { format } from 'date-fns';
import { getScheduleTreatmentId, useMeds } from '../../../../context/MedsContext';
import type { ScheduleItem } from '../../../../context/MedsContext';
import { scheduleAppliesToDate, timeToMinutes } from '../../../../utils/scheduleHelpers';
import { usersAPI, scheduleAPI } from '../../../../services/api';

interface DependentInfo {
  id: string;
  email?: string;
  name?: string | null;
}

export default function DependentTodayDashboard() {
  const localParams = useLocalSearchParams<{ id?: string }>();
  const globalParams = useGlobalSearchParams<{ id?: string }>();
  const segments = useSegments();

  const { schedules, treatments, depletionAlerts, targetUserId } = useMeds();

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
  const [dependent, setDependent] = useState<DependentInfo | null>(null);
  const [now, setNow] = useState(new Date());

  // Co minutę odświeżamy „teraz”, by status „Oczekuje / Minęło” był aktualny.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const [logs, setLogs] = useState<any[]>([]);

  const fetchDependent = useCallback(async () => {
    if (!dependentId) return;
    try {
      const all = (await usersAPI.getDependents()) as DependentInfo[];
      const found = all?.find?.(d => String(d.id) === String(dependentId));
      if (found) setDependent(found);
      const todayLogs = await scheduleAPI.getTodayLogs(dependentId);
      setLogs(todayLogs);
    } catch (e) {
      console.warn('Nie udało się pobrać danych podopiecznego', e);
    }
  }, [dependentId]);

  useFocusEffect(
    useCallback(() => {
      void fetchDependent();
    }, [fetchDependent])
  );

  const todayStr = format(now, 'yyyy-MM-dd');

  const todaysSchedules = useMemo(() => {
    return [...schedules]
      .filter(s => scheduleAppliesToDate(s, todayStr))
      .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
  }, [schedules, todayStr]);

  const todaysDepletion = useMemo(
    () => depletionAlerts.filter(a => a.date === todayStr),
    [depletionAlerts, todayStr]
  );

  const labelFor = (sch: ScheduleItem) => {
    if (sch.customName) return sch.customName;
    const tid = getScheduleTreatmentId(sch);
    if (tid) return treatments.find(t => t.id === tid)?.name ?? 'Aktywność';
    return 'Aktywność';
  };

  const typeFor = (sch: ScheduleItem) => {
    const tid = getScheduleTreatmentId(sch);
    return treatments.find(t => t.id === tid)?.type;
  };

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const nextSchedule = useMemo(
    () => todaysSchedules.find(s => timeToMinutes(s.time) >= currentMinutes),
    [todaysSchedules, currentMinutes]
  );

  const greeting = dependent?.name?.trim() || dependent?.email || 'Podopieczny';

  const renderMood = () => {
    // @ts-ignore
    if (!dependent?.lastMood || !dependent?.lastMoodAt) return null;
    // @ts-ignore
    const moodEmoji = dependent.lastMood === 'happy' ? '🙂' : dependent.lastMood === 'neutral' ? '😐' : '🙁';
    // @ts-ignore
    const date = new Date(dependent.lastMoodAt);
    const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    return (
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: Theme.colors.surfaceGrey, 
        paddingHorizontal: 12, 
        paddingVertical: 6, 
        borderRadius: 20, 
        alignSelf: 'flex-start', 
        marginBottom: Theme.spacing.l,
        borderWidth: 1,
        borderColor: Theme.colors.border
      }}>
        <Text style={{ fontSize: 24 }}>{moodEmoji}</Text>
        <Text style={{ fontSize: 14, color: Theme.colors.textDark, marginLeft: 8, fontWeight: '700' }}>
          Humor z {timeStr}
        </Text>
      </View>
    );
  };

  const handleAdd = () => {
    if (!dependentId) return;
    openAddMedForDependent(dependentId);
  };

  const getStatusDisplay = (sch: ScheduleItem, minutes: number, isNext: boolean) => {
    const log = logs.find(l => l.scheduleId === sch.id);
    if (log) {
      if (log.status === 'TAKEN') return { label: 'Odebrane', color: Theme.colors.success, pill: styles.statusPillSuccess };
      if (log.status === 'MISSED') return { label: 'Pominięte', color: Theme.colors.surfaceWhite, pill: styles.statusPillMissed };
    }
    const diff = minutes - currentMinutes;
    if (Math.abs(diff) <= 5) return { label: 'Teraz', color: Theme.colors.surfaceWhite, pill: styles.statusPillNext };
    if (diff < -5) return { label: 'Minęło', color: Theme.colors.textLight, pill: styles.statusPillPast };
    if (isNext) return { label: 'Następny', color: Theme.colors.textDark, pill: styles.statusPillUpcoming };
    return { label: 'Zaplanowane', color: Theme.colors.textDark, pill: styles.statusPillUpcoming };
  };

  return (
    <View style={{ flex: 1, backgroundColor: Theme.colors.background }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.greeting}>{greeting}</Text>
        {renderMood()}

        {nextSchedule ? (
          <Card variant="lime" style={styles.mainCard}>
            <Text style={styles.mainCardSubtitle}>Następna aktywność:</Text>
            <Text style={styles.mainCardTime}>{nextSchedule.time}</Text>
            <Text style={styles.mainCardDetails}>{labelFor(nextSchedule)}</Text>
          </Card>
        ) : (
          <Card variant="lime" style={styles.mainCard}>
            <Text style={styles.mainCardSubtitle}>Wszystko na dziś zrobione</Text>
            <Text style={styles.mainCardDetailsMuted}>
              Brak kolejnych aktywności w planie.
            </Text>
          </Card>
        )}

        <Card variant="white" style={styles.infoCard}>
          <View style={styles.infoCardTop}>
            <Text style={styles.infoCardText}>Urządzenie poprawnie zsynchronizowane</Text>
          </View>
          <View style={styles.infoCardBottom}>
            <Text style={styles.setupText}>Status: OK</Text>
            <MaterialIcons name="check-circle" size={36} color={Theme.colors.success} />
          </View>
        </Card>

        {todaysDepletion.length > 0 && (
          <View style={{ marginTop: Theme.spacing.l }}>
            <Text style={styles.sectionTitle}>Alerty</Text>
            {todaysDepletion.map((alert, idx) => (
              <Card
                key={`alert-${idx}`}
                variant="white"
                style={styles.alertCard}
              >
                <Text style={styles.alertTitle}>Koniec zapasu leku</Text>
                <View style={styles.scheduleRow}>
                  <MaterialIcons
                    name="shopping-cart"
                    size={20}
                    color={Theme.colors.accentOrange}
                  />
                  <Text style={styles.alertText}>
                    Kup nową paczkę: {alert.inventoryItemName}
                  </Text>
                </View>
              </Card>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Plan na dziś</Text>

        {todaysSchedules.length === 0 ? (
          <Card variant="grey" style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              Brak aktywności na dziś. Dodaj pierwszą w kalendarzu.
            </Text>
          </Card>
        ) : (
          todaysSchedules.map(sch => {
            const label = labelFor(sch);
            const tType = typeFor(sch);
            const vis = tType ? TREATMENT_VISUAL[tType] : null;
            const minutes = timeToMinutes(sch.time);
            const isNext = nextSchedule?.id === sch.id;
            
            const display = getStatusDisplay(sch, minutes, isNext);

            return (
              <Card
                key={sch.id}
                variant={isNext ? 'lime' : 'grey'}
                style={
                  isNext ? styles.activeScheduleCard : styles.scheduleCard
                }
              >
                <View style={styles.scheduleHead}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {vis ? (
                      <View
                        style={[
                          styles.activityIconCircle,
                          { backgroundColor: vis.accent + '22' },
                        ]}
                      >
                        <MaterialIcons
                          name={vis.icon}
                          size={18}
                          color={vis.accent}
                        />
                      </View>
                    ) : null}
                    <View>
                      <Text style={styles.scheduleTime}>{sch.time}</Text>
                      <Text style={styles.scheduleItemName}>{label}</Text>
                    </View>
                  </View>

                  <View style={[styles.statusPill, display.pill]}>
                    <Text style={[styles.statusPillText, { color: display.color }]}>
                      {display.label}
                    </Text>
                  </View>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      <Pressable style={styles.fab} onPress={handleAdd}>
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
    paddingTop: Theme.spacing.m,
    paddingBottom: 120,
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
  mainCardDetailsMuted: {
    fontSize: Theme.typography.body,
    color: Theme.colors.textLight,
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
    fontWeight: '700',
    color: Theme.colors.textDark,
    marginTop: Theme.spacing.xl,
    marginBottom: Theme.spacing.m,
  },
  scheduleCard: {
    borderRadius: 8,
    padding: Theme.spacing.m,
    marginBottom: Theme.spacing.s,
  },
  emptyCard: {
    padding: Theme.spacing.m,
    alignItems: 'center',
  },
  emptyText: {
    color: Theme.colors.textLight,
  },
  activeScheduleCard: {
    borderRadius: 8,
    padding: Theme.spacing.m,
    marginBottom: Theme.spacing.s,
  },
  scheduleHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activityIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.m,
  },
  scheduleTime: {
    fontSize: Theme.typography.body,
    fontWeight: '700',
    color: Theme.colors.textDark,
  },
  scheduleItemName: {
    fontSize: Theme.typography.caption,
    color: Theme.colors.textLight,
    marginTop: 2,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Theme.spacing.s,
  },
  alertCard: {
    padding: Theme.spacing.m,
    marginBottom: Theme.spacing.s,
    borderColor: Theme.colors.accentOrange,
    borderWidth: 2,
  },
  alertTitle: {
    fontSize: Theme.typography.body,
    fontWeight: '800',
    color: Theme.colors.accentOrange,
  },
  alertText: {
    fontSize: Theme.typography.caption,
    color: Theme.colors.accentOrange,
    marginLeft: Theme.spacing.s,
    fontWeight: '700',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusPillPast: {
    backgroundColor: Theme.colors.surfaceGrey,
  },
  statusPillUpcoming: {
    backgroundColor: Theme.colors.primaryLime,
  },
  statusPillNext: {
    backgroundColor: Theme.colors.primaryLimeDark,
  },
  statusPillText: {
    fontSize: Theme.typography.small,
    fontWeight: '700',
    color: Theme.colors.textDark,
  },
  statusPillSuccess: {
    backgroundColor: Theme.colors.badgeSuccessBackground || '#e8f5e9',
    borderColor: Theme.colors.success || '#4caf50',
    borderWidth: 1,
  },
  statusPillMissed: {
    backgroundColor: Theme.colors.badgeWarningBackground || '#ffebee',
    borderColor: Theme.colors.accentOrange || '#ff9800',
    borderWidth: 1,
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
