import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Platform } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { Theme } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { usersAPI } from '../../services/api';

interface Dependent {
  id: string;
  email: string;
  name?: string;
  role: string;
  lastMood?: string;
  lastMoodAt?: string;
}

export default function CaretakerDashboard() {
  const { logout } = useAuth();
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDependents = useCallback(async () => {
    setIsLoading(true);
    try {
      let token: string | null = null;
      try {
        if (Platform.OS === 'web') {
          token = localStorage.getItem('userToken');
        } else {
          token = await SecureStore.getItemAsync('userToken');
        }
      } catch {
        token = null;
      }
      if (!token) {
        setDependents([]);
        return;
      }
      const data = await usersAPI.getDependents();
      setDependents(data);
    } catch (e) {
      console.error('Failed to fetch dependents', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchDependents();
    }, [fetchDependents])
  );

  const handleAddDependent = () => {
    router.push('/(caretaker)/pairing');
  };

  const handleDependentPress = (id: string) => {
    router.push(`/(caretaker)/dependent/${id}`);
  };

  const handleLogout = async () => {
    await logout();
    if (Platform.OS === 'web') {
      window.location.href = '/login';
    } else {
      router.replace('/login');
    }
  };

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  const renderMood = (dependent: Dependent) => {
    if (!dependent.lastMood || !dependent.lastMoodAt) return null;
    const moodEmoji = dependent.lastMood === 'happy' ? '🙂' : dependent.lastMood === 'neutral' ? '😐' : '🙁';
    const date = new Date(dependent.lastMoodAt);
    const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    return (
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: Theme.colors.surfaceGrey, 
        paddingHorizontal: 8, 
        paddingVertical: 4, 
        borderRadius: 16, 
        alignSelf: 'flex-start', 
        marginTop: 6,
        borderWidth: 1,
        borderColor: Theme.colors.border
      }}>
        <Text style={{ fontSize: 18 }}>{moodEmoji}</Text>
        <Text style={{ fontSize: 12, color: Theme.colors.textDark, marginLeft: 6, fontWeight: '700' }}>
          Humor z {timeStr}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.greeting}>
          <Text style={styles.greetingText}>Panel Opiekuna</Text>
          <Text style={styles.nameText}>Twoi podopieczni</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={() => router.push('/notification-sound-settings' as any)} style={styles.iconBtn}>
            <MaterialIcons name="settings" size={28} color={Theme.colors.primaryLimeDark} />
          </Pressable>
          <Pressable onPress={handleLogout} style={styles.logoutBtn}>
            <MaterialIcons name="logout" size={28} color={Theme.colors.accentOrange} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ActivityIndicator size="large" color={Theme.colors.primaryLimeDark} style={{ marginTop: 60 }} />
        ) : dependents.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <MaterialIcons name="people-outline" size={48} color={Theme.colors.primaryLimeDark} />
            </View>
            <Text style={styles.emptyStateText}>Brak podopiecznych</Text>
            <Text style={styles.emptyStateSubText}>Kliknij przycisk + poniżej, aby połączyć się z kontem seniora i śledzić jego leki.</Text>
          </View>
        ) : (
          dependents.map((dependent, index) => (
            <Pressable 
              key={dependent.id} 
              onPress={() => handleDependentPress(dependent.id)}
              style={({ pressed }) => [
                styles.card, 
                index % 2 !== 0 && styles.cardWarning,
                pressed && styles.cardPressed
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.avatar, index % 2 !== 0 && styles.avatarWarning]}>
                  <Text style={[styles.avatarText, index % 2 !== 0 && styles.avatarTextWarning]}>
                    {getInitials(dependent.email)}
                  </Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.dependentName}>{dependent.name || dependent.email}</Text>
                  {renderMood(dependent)}
                  {index % 2 !== 0 ? (
                    <View style={[styles.statusBadgeWarning, { marginTop: 4 }]}>
                      <MaterialIcons name="error-outline" size={14} color={Theme.colors.accentOrange} />
                      <Text style={styles.statusWarningText}>Wymaga uwagi</Text>
                    </View>
                  ) : (
                    <View style={[styles.statusBadgeSuccess, { marginTop: 4 }]}>
                      <MaterialIcons name="check-circle-outline" size={14} color={Theme.colors.success} />
                      <Text style={styles.statusSuccessText}>Wszystko ok</Text>
                    </View>
                  )}
                </View>
                <MaterialIcons name="chevron-right" size={28} color={Theme.colors.textLight} />
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* FAB */}
      <Pressable 
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]} 
        onPress={handleAddDependent}
      >
        <MaterialIcons name="add" size={32} color={Theme.colors.textDark} />
      </Pressable>
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.s,
  },
  iconBtn: {
    padding: Theme.spacing.s,
    backgroundColor: Theme.colors.primaryLime,
    borderRadius: Theme.borderRadius.round,
  },
  greeting: {
    flex: 1,
  },
  greetingText: {
    fontSize: Theme.typography.caption,
    color: Theme.colors.textLight,
  },
  nameText: {
    fontSize: Theme.typography.largeTitle,
    fontWeight: 'bold',
    color: Theme.colors.textDark,
  },
  logoutBtn: {
    padding: Theme.spacing.s,
    backgroundColor: Theme.colors.surfaceSoftOrange,
    borderRadius: Theme.borderRadius.round,
  },
  scrollContent: {
    padding: Theme.spacing.l,
    paddingBottom: Theme.spacing.xxl * 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Theme.spacing.xxl,
    marginTop: Theme.spacing.xl,
    backgroundColor: Theme.colors.surfaceWhite,
    borderRadius: Theme.borderRadius.xlarge,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderStyle: 'dashed',
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Theme.colors.primaryLime,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.l,
  },
  emptyStateText: {
    fontSize: Theme.typography.title,
    fontWeight: 'bold',
    color: Theme.colors.textDark,
    textAlign: 'center',
  },
  emptyStateSubText: {
    fontSize: Theme.typography.body,
    color: Theme.colors.textLight,
    textAlign: 'center',
    marginTop: Theme.spacing.s,
    lineHeight: 22,
  },
  card: {
    backgroundColor: Theme.colors.surfaceWhite,
    padding: Theme.spacing.l,
    borderRadius: Theme.borderRadius.large,
    marginBottom: Theme.spacing.m,
    borderWidth: 1,
    borderColor: 'transparent',
    shadowColor: Theme.colors.shadowNeutral,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  cardWarning: {
    borderColor: Theme.colors.accentOrange,
    backgroundColor: Theme.colors.surfaceWarmHighlight,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Theme.colors.primaryLime,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarWarning: {
    backgroundColor: Theme.colors.surfaceSoftOrange,
  },
  avatarText: {
    color: Theme.colors.textDark,
    fontSize: Theme.typography.title,
    fontWeight: 'bold',
  },
  avatarTextWarning: {
    color: Theme.colors.accentOrange,
  },
  cardInfo: {
    flex: 1,
    marginLeft: Theme.spacing.m,
  },
  dependentName: {
    fontSize: Theme.typography.title,
    fontWeight: 'bold',
    color: Theme.colors.textDark,
    marginBottom: 4,
  },
  statusBadgeSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.badgeSuccessBackground,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusSuccessText: {
    fontSize: Theme.typography.small,
    color: Theme.colors.primaryLimeDark,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  statusBadgeWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.badgeWarningBackground,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusWarningText: {
    fontSize: Theme.typography.small,
    color: Theme.colors.accentOrange,
    fontWeight: 'bold',
    marginLeft: 4,
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
    shadowColor: Theme.colors.primaryLimeDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabPressed: {
    transform: [{ scale: 0.95 }],
  }
});
