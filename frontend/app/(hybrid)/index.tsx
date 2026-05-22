import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Card } from '../../components/Card';
import { Theme } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function HybridDashboard() {
  const { t } = useTranslation();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    if (Platform.OS === 'web') {
      window.location.href = '/login';
    } else {
      router.replace('/login');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greetingText}>{t('hybrid.greeting')}</Text>
          <Text style={styles.greeting}>{t('hybrid.nameFallback')}</Text>
        </View>
        <View style={styles.headerIcons}>
          <Pressable
            onPress={() => router.push('/notification-sound-settings' as any)}
            style={styles.iconBtn}
          >
            <MaterialIcons name="settings" size={28} color={Theme.colors.textLight} />
          </Pressable>
          <Pressable onPress={handleLogout} style={[styles.iconBtn, styles.logoutBtn]}>
            <MaterialIcons name="logout" size={28} color={Theme.colors.accentOrange} />
          </Pressable>
        </View>
      </View>

      {/* Główny kafelek - Lime Green */}
      <Pressable 
        onPress={() => alert(t('hybrid.medTakenAlert'))}
        style={({ pressed }) => pressed && styles.pressedCard}
      >
        <Card variant="lime" style={styles.mainCard}>
          <MaterialIcons name="notifications-active" size={24} color={Theme.colors.textDark} style={styles.bellIcon} />
          <Text style={styles.mainCardSubtitle}>{t('hybrid.medsDue')}</Text>
          <Text style={styles.mainCardTime}>11:00</Text>
          <Text style={styles.mainCardDetails}>{t('hybrid.mockMedsDetail')}</Text>
        </Card>
      </Pressable>

      {/* Karta informacyjna z pomarańczowym akcentem */}
      <Card variant="white" style={styles.infoCard}>
        <View style={styles.infoCardTop}>
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoCardText}>{t('hybrid.pinBanner')}</Text>
          </View>
          <MaterialIcons name="close" size={24} color={Theme.colors.textLight} />
        </View>
        <View style={styles.infoCardBottom}>
          <Text style={styles.setupText}>{t('hybrid.pinBannerCta')}</Text>
          <MaterialIcons name="security" size={40} color={Theme.colors.accentOrange} />
        </View>
      </Card>

      {/* Sekcja Harmonogramu */}
      <Text style={styles.sectionTitle}>{t('hybrid.scheduleTitle')}</Text>

      {/* Szara karta (przeszłość) */}
      <Card variant="grey" style={styles.scheduleCard}>
        <Text style={styles.scheduleTime}>10:00</Text>
        
        <View style={styles.scheduleRow}>
          <MaterialIcons name="check-circle" size={24} color={Theme.colors.success} />
          <Text style={styles.scheduleItemDone}>{t('hybrid.mockTaken', { time: '10:02' })}</Text>
        </View>

        <View style={styles.scheduleRow}>
          <MaterialIcons name="error" size={24} color={Theme.colors.accentOrange} />
          <Text style={styles.scheduleItemWarning}>{t('hybrid.mockPartial')}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.scheduleRow}>
          <Text style={styles.scheduleTimeInner}>10:30</Text>
          <MaterialIcons name="check-circle" size={24} color={Theme.colors.success} />
          <Text style={styles.scheduleItemDone}>{t('hybrid.mockTakenShort')}</Text>
          <View style={{ flex: 1 }} />
          <MaterialIcons name="medication" size={24} color={Theme.colors.textLight} />
        </View>
      </Card>

      {/* Aktywna, limonkowa sekcja */}
      <Card variant="lime" style={styles.activeScheduleCard}>
        <View style={styles.activeLeft}>
          <MaterialIcons name="schedule" size={24} color={Theme.colors.textDark} />
          <Text style={styles.scheduleTimeDark}>11:00</Text>
        </View>
        <Pressable style={styles.nowBtn}>
          <Text style={styles.nowBtnText}>{t('hybrid.now')}</Text>
        </Pressable>
      </Card>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.surfaceGrey,
  },
  content: {
    padding: Theme.spacing.l,
    paddingTop: Theme.spacing.xxl,
    paddingBottom: Theme.spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.xl,
  },
  greetingText: {
    fontSize: Theme.typography.caption,
    color: Theme.colors.textLight,
  },
  greeting: {
    fontSize: Theme.typography.largeTitle,
    fontWeight: 'bold',
    color: Theme.colors.textDark,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.s,
  },
  iconBtn: {
    backgroundColor: Theme.colors.surfaceWhite,
    padding: Theme.spacing.s,
    borderRadius: Theme.borderRadius.round,
    shadowColor: Theme.colors.shadowNeutral,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  logoutBtn: {
    backgroundColor: Theme.colors.surfaceSoftOrange,
  },
  pressedCard: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  mainCard: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.xxl,
    borderRadius: Theme.borderRadius.xlarge,
    shadowColor: Theme.colors.primaryLimeDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  bellIcon: {
    marginBottom: Theme.spacing.s,
  },
  mainCardSubtitle: {
    fontSize: Theme.typography.body,
    fontWeight: '600',
    color: Theme.colors.textDark,
    marginBottom: Theme.spacing.xs,
  },
  mainCardTime: {
    fontSize: 64,
    fontWeight: '900',
    color: Theme.colors.textDark,
    marginBottom: Theme.spacing.xs,
    letterSpacing: -2,
  },
  mainCardDetails: {
    fontSize: Theme.typography.title,
    fontWeight: '700',
    color: Theme.colors.textDark,
  },
  infoCard: {
    borderRadius: Theme.borderRadius.xlarge,
    marginTop: Theme.spacing.xl,
    padding: Theme.spacing.xl,
    shadowColor: Theme.colors.shadowNeutral,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
  infoCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  infoTextContainer: {
    flex: 1,
    paddingRight: Theme.spacing.m,
  },
  infoCardText: {
    fontSize: Theme.typography.body,
    fontWeight: '600',
    color: Theme.colors.textDark,
    lineHeight: 24,
  },
  infoCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Theme.spacing.l,
  },
  setupText: {
    color: Theme.colors.accentOrange,
    fontWeight: 'bold',
    fontSize: Theme.typography.title,
  },
  sectionTitle: {
    fontSize: Theme.typography.title,
    fontWeight: 'bold',
    color: Theme.colors.textDark,
    marginTop: Theme.spacing.xxl,
    marginBottom: Theme.spacing.m,
  },
  scheduleCard: {
    borderRadius: Theme.borderRadius.large,
    padding: Theme.spacing.l,
  },
  scheduleTime: {
    fontSize: Theme.typography.title,
    fontWeight: 'bold',
    color: Theme.colors.textDark,
    marginBottom: Theme.spacing.m,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.m,
  },
  scheduleItemDone: {
    fontSize: Theme.typography.body,
    fontWeight: '500',
    color: Theme.colors.textDark,
    marginLeft: Theme.spacing.s,
  },
  scheduleItemWarning: {
    fontSize: Theme.typography.body,
    fontWeight: '600',
    color: Theme.colors.accentOrange,
    marginLeft: Theme.spacing.s,
  },
  divider: {
    height: 1,
    backgroundColor: Theme.colors.border,
    marginVertical: Theme.spacing.s,
    marginBottom: Theme.spacing.l,
  },
  scheduleTimeInner: {
    fontSize: Theme.typography.body,
    fontWeight: 'bold',
    color: Theme.colors.textDark,
    marginRight: Theme.spacing.m,
  },
  activeScheduleCard: {
    borderRadius: Theme.borderRadius.large,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Theme.spacing.l,
    marginTop: Theme.spacing.m,
  },
  activeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scheduleTimeDark: {
    fontSize: Theme.typography.title,
    fontWeight: 'bold',
    color: Theme.colors.textDark,
    marginLeft: Theme.spacing.s,
  },
  nowBtn: {
    backgroundColor: Theme.colors.primaryLimeDark,
    paddingHorizontal: Theme.spacing.l,
    paddingVertical: Theme.spacing.s,
    borderRadius: Theme.borderRadius.round,
  },
  nowBtnText: {
    color: Theme.colors.surfaceWhite,
    fontWeight: '900',
    fontSize: Theme.typography.body,
    letterSpacing: 1,
  }
});
