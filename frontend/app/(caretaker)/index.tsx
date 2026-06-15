import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';
import { Theme } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { usersAPI } from '../../services/api';
import { isUserUuid } from '../../utils/resolveMedsTargetUserId';
import { useTranslation } from 'react-i18next';
import { HugeButton } from '../../components/HugeButton';
import { MoodBadge } from '../../components/mood/MoodBadge';
import { CaretakerTourTarget } from '../../components/caretaker/CaretakerTourTarget';
import { CaretakerTourMockTabBar } from '../../components/caretaker/CaretakerTourMockTabBar';
import {
  CaretakerTourScrollProvider,
  CaretakerTourScrollView,
} from '../../context/CaretakerTourScrollContext';
import { useCaretakerGuidedTourOptional } from '../../context/CaretakerGuidedTourContext';
import { setCaretakerPreTourComplete } from '../../services/caretakerTourState';

interface Dependent {
  id: string;
  email: string;
  name?: string;
  role: string;
  lastMood?: string;
  lastMoodAt?: string;
}

const AVATAR_PALETTE = [
  { solid: Theme.colors.primaryLimeDark, soft: 'rgba(69, 104, 130, 0.14)' },
  { solid: Theme.colors.accentOrange, soft: 'rgba(233, 164, 61, 0.2)' },
  { solid: '#5B8FA8', soft: 'rgba(91, 143, 168, 0.16)' },
  { solid: '#6B8E6B', soft: 'rgba(107, 142, 107, 0.16)' },
] as const;

function getInitials(nameOrEmail: string) {
  const trimmed = nameOrEmail.trim();
  if (!trimmed) return '??';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return trimmed.substring(0, 2).toUpperCase();
}

function SeniorProfileCard({
  dependent,
  accentIndex,
  onPress,
  moodSubtitle,
  profileHint,
}: {
  dependent: Dependent;
  accentIndex: number;
  onPress: () => void;
  moodSubtitle: string | null;
  profileHint: string;
}) {
  const accent = AVATAR_PALETTE[accentIndex % AVATAR_PALETTE.length];
  const displayName = dependent.name?.trim() || dependent.email;
  const showEmail = !!dependent.name?.trim() && dependent.email;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.profileCard, pressed && styles.profileCardPressed]}
    >
      <View style={[styles.profileAccent, { backgroundColor: accent.solid }]} />
      <View style={styles.profileCardInner}>
        <View style={[styles.avatarRing, { borderColor: accent.solid, backgroundColor: accent.soft }]}>
          <Text style={[styles.avatarText, { color: accent.solid }]}>
            {getInitials(displayName)}
          </Text>
        </View>

        <View style={styles.profileBody}>
          <Text style={styles.profileName} numberOfLines={1}>
            {displayName}
          </Text>
          {showEmail ? (
            <Text style={styles.profileEmail} numberOfLines={1}>
              {dependent.email}
            </Text>
          ) : null}
          {dependent.lastMood && moodSubtitle ? (
            <MoodBadge mood={dependent.lastMood} subtitle={moodSubtitle} style={styles.moodBadge} />
          ) : (
            <Text style={styles.profileHint}>{profileHint}</Text>
          )}
        </View>

        <View style={[styles.goCircle, { backgroundColor: accent.soft }]}>
          <MaterialIcons name="arrow-forward" size={22} color={accent.solid} />
        </View>
      </View>
    </Pressable>
  );
}

export default function CaretakerDashboard() {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const insets = useSafeAreaInsets();
  const guidedTour = useCaretakerGuidedTourOptional();
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
      const list = Array.isArray(data) ? data : [];
      setDependents(
        list.filter((d): d is Dependent => !!d?.id && isUserUuid(String(d.id))),
      );
    } catch (e) {
      console.error('Failed to fetch dependents', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchDependents();
    }, [fetchDependents]),
  );

  useFocusEffect(
    useCallback(() => {
      if (isLoading || dependents.length > 0) return;
      const timer = setTimeout(() => {
        guidedTour?.tryStartPreTour();
      }, Platform.OS === 'web' ? 400 : 500);
      return () => clearTimeout(timer);
    }, [dependents.length, guidedTour, isLoading]),
  );

  useEffect(() => {
    if (dependents.length > 0) {
      void setCaretakerPreTourComplete();
    }
  }, [dependents.length]);

  const countLabel = useMemo(() => {
    if (dependents.length === 0) return null;
    return t('caretaker.dashboard.count', { count: dependents.length });
  }, [dependents.length, t]);

  const handleAddDependent = () => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push('/(caretaker)/pairing');
  };

  const handleDependentPress = (id: string) => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
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

  const moodSubtitleFor = (dependent: Dependent) => {
    if (!dependent.lastMood || !dependent.lastMoodAt) return null;
    const date = new Date(dependent.lastMoodAt);
    const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    return t('caretaker.moodAt', { time: timeStr });
  };

  const headerTop = Math.max(insets.top, Platform.OS === 'web' ? 12 : 8);

  return (
    <CaretakerTourScrollProvider>
      <View style={styles.root}>
      <LinearGradient
        colors={['#E8F2F8', Theme.colors.surfaceGrey, Theme.colors.background]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.decorOrb, styles.decorOrbPrimary]} />
      <View style={[styles.decorOrb, styles.decorOrbAccent]} />

      <View style={[styles.topBar, { paddingTop: headerTop }]}>
        <CaretakerTourTarget
          stepId="dashboard-sounds"
        >
          <Pressable
            onPress={() => router.push('/notification-sound-settings' as never)}
            style={({ pressed }) => [styles.topBarBtn, pressed && styles.topBarBtnPressed]}
            accessibilityLabel={t('sounds.screenTitle')}
          >
            <MaterialIcons name="tune" size={22} color={Theme.colors.primaryLimeDark} />
          </Pressable>
        </CaretakerTourTarget>
        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [styles.topBarBtn, pressed && styles.topBarBtnPressed]}
        >
          <MaterialIcons name="logout" size={22} color={Theme.colors.textLight} />
        </Pressable>
      </View>

      <CaretakerTourScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: insets.bottom + Theme.spacing.xl + (guidedTour?.currentStepUsesMockTabs ? 88 : 0),
            paddingTop: Theme.spacing.s,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.badgePill}>
            <MaterialIcons name="verified-user" size={14} color={Theme.colors.primaryLimeDark} />
            <Text style={styles.badgeText}>{t('caretaker.dashboard.badge')}</Text>
          </View>
          <Text style={styles.heroTitle}>{t('caretaker.dashboard.title')}</Text>
          <Text style={styles.heroSubtitle}>{t('caretaker.dashboard.subtitle')}</Text>
          {countLabel ? <Text style={styles.countLine}>{countLabel}</Text> : null}
        </View>

        {isLoading ? (
          <ActivityIndicator
            size="large"
            color={Theme.colors.primaryLimeDark}
            style={styles.loader}
          />
        ) : dependents.length === 0 ? (
          <View style={styles.emptyCard}>
            <LinearGradient
              colors={[Theme.colors.primaryLime + 'CC', Theme.colors.surfaceWhite]}
              style={styles.emptyIconWrap}
            >
              <MaterialIcons name="groups" size={40} color={Theme.colors.primaryLimeDark} />
            </LinearGradient>
            <Text style={styles.emptyTitle}>{t('caretaker.dashboard.emptyTitle')}</Text>
            <Text style={styles.emptySubtitle}>{t('caretaker.dashboard.emptySubtitle')}</Text>
            <CaretakerTourTarget stepId="dashboard-add-dependent" wrapStyle={styles.emptyCtaWrap}>
              <HugeButton
                title={t('caretaker.dashboard.emptyCta')}
                onPress={handleAddDependent}
                style={styles.emptyCta}
              />
            </CaretakerTourTarget>
          </View>
        ) : (
          <View style={styles.cardStack}>
            {dependents.map((dependent, index) => (
              <SeniorProfileCard
                key={dependent.id}
                dependent={dependent}
                accentIndex={index}
                onPress={() => handleDependentPress(dependent.id)}
                moodSubtitle={moodSubtitleFor(dependent)}
                profileHint={t('caretaker.dashboard.profileHint')}
              />
            ))}

            <CaretakerTourTarget stepId="dashboard-add-dependent" wrapStyle={styles.addCardWrap}>
              <Pressable
                onPress={handleAddDependent}
                accessibilityRole="button"
                style={({ pressed }) => [styles.addCard, pressed && styles.profileCardPressed]}
              >
                <View style={styles.addIconWrap}>
                  <MaterialIcons name="person-add-alt-1" size={26} color={Theme.colors.primaryLimeDark} />
                </View>
                <View style={styles.addTextWrap}>
                  <Text style={styles.addTitle}>{t('caretaker.dashboard.addCardTitle')}</Text>
                  <Text style={styles.addSubtitle}>{t('caretaker.dashboard.addCardSubtitle')}</Text>
                </View>
                <MaterialIcons name="add-circle" size={28} color={Theme.colors.primaryLimeDark} />
              </Pressable>
            </CaretakerTourTarget>
          </View>
        )}
      </CaretakerTourScrollView>
      {dependents.length === 0 ? <CaretakerTourMockTabBar /> : null}
    </View>
    </CaretakerTourScrollProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  decorOrb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.55,
  },
  decorOrbPrimary: {
    width: 220,
    height: 220,
    top: -40,
    right: -60,
    backgroundColor: Theme.colors.primaryLime,
  },
  decorOrbAccent: {
    width: 140,
    height: 140,
    top: 120,
    left: -50,
    backgroundColor: 'rgba(233, 164, 61, 0.35)',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Theme.spacing.s,
    paddingHorizontal: Theme.spacing.l,
    paddingBottom: Theme.spacing.xs,
    zIndex: 2,
  },
  topBarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: Theme.colors.shadowNeutral,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  topBarBtnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  scrollContent: {
    paddingHorizontal: Theme.spacing.l,
  },
  hero: {
    marginBottom: Theme.spacing.l,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.round,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    marginBottom: Theme.spacing.m,
  },
  badgeText: {
    fontSize: Theme.typography.small,
    fontWeight: '700',
    color: Theme.colors.primaryLimeDark,
    letterSpacing: 0.3,
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: Theme.colors.textDark,
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  heroSubtitle: {
    marginTop: Theme.spacing.s,
    fontSize: Theme.typography.body,
    color: Theme.colors.textLight,
    lineHeight: 22,
    maxWidth: 320,
  },
  countLine: {
    marginTop: Theme.spacing.m,
    fontSize: Theme.typography.caption,
    fontWeight: '700',
    color: Theme.colors.primaryLimeDark,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  loader: {
    marginTop: 48,
  },
  cardStack: {
    gap: Theme.spacing.m,
  },
  profileCard: {
    borderRadius: Theme.borderRadius.xlarge,
    backgroundColor: Theme.colors.surfaceWhite,
    overflow: 'hidden',
    shadowColor: Theme.colors.shadowNeutral,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  profileCardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  profileAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
  },
  profileCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.m + 2,
    paddingRight: Theme.spacing.m,
    paddingLeft: Theme.spacing.m + 4,
  },
  avatarRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.m,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  profileBody: {
    flex: 1,
    minWidth: 0,
    paddingRight: Theme.spacing.s,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: Theme.colors.textDark,
    letterSpacing: -0.2,
  },
  profileEmail: {
    marginTop: 2,
    fontSize: Theme.typography.caption,
    color: Theme.colors.textLight,
  },
  profileHint: {
    marginTop: 6,
    fontSize: Theme.typography.small,
    color: Theme.colors.textLight,
    fontWeight: '500',
  },
  moodBadge: {
    marginTop: 8,
  },
  goCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.m,
    borderRadius: Theme.borderRadius.xlarge,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Theme.colors.primaryLimeDark,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
  },
  addIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Theme.colors.primaryLime,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.m,
  },
  addTextWrap: {
    flex: 1,
  },
  addTitle: {
    fontSize: Theme.typography.body,
    fontWeight: '800',
    color: Theme.colors.primaryLimeDark,
  },
  addSubtitle: {
    marginTop: 2,
    fontSize: Theme.typography.caption,
    color: Theme.colors.textLight,
  },
  emptyCard: {
    alignItems: 'center',
    padding: Theme.spacing.xl,
    borderRadius: Theme.borderRadius.xlarge,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: Theme.colors.shadowNeutral,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
    marginTop: Theme.spacing.m,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.l,
  },
  emptyTitle: {
    fontSize: Theme.typography.title,
    fontWeight: '800',
    color: Theme.colors.textDark,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: Theme.typography.body,
    color: Theme.colors.textLight,
    textAlign: 'center',
    marginTop: Theme.spacing.s,
    lineHeight: 22,
    marginBottom: Theme.spacing.l,
  },
  emptyCtaWrap: {
    width: '100%',
  },
  emptyCta: {
    width: '100%',
    minHeight: 52,
  },
  addCardWrap: {
    width: '100%',
    marginTop: Theme.spacing.xs,
  },
});
