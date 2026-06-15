import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getScreenBottomPadding } from '../utils/safeAreaInsets';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Theme } from '../constants/theme';
import {
  NOTIFICATION_SOUND_CHOICE_IDS,
  type NotificationSoundChoiceId,
  resolveMedicationSoundAsset,
  resolveSosSoundAsset,
} from '../constants/notificationSounds';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import {
  getMedicationSoundChoice,
  getSosSoundChoice,
  setMedicationSoundChoice,
  setSosSoundChoice,
} from '../services/notificationSoundPreferences';
import { previewNotificationAsset } from '../services/notificationSoundPreview';
import { HugeButton } from '../components/HugeButton';
import { CaretakerTourAnchor } from '../components/caretaker/CaretakerTourAnchor';
import {
  CaretakerTourScrollProvider,
  CaretakerTourScrollView,
} from '../context/CaretakerTourScrollContext';

function exitSettings(userRole: string | null) {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  if (userRole === 'CARETAKER') router.replace('/(caretaker)');
  else if (userRole === 'DEPENDENT') router.replace('/(dependent)');
  else if (userRole === 'HYBRID') router.replace('/(hybrid)/(tabs)');
  else router.replace('/login');
}

export default function NotificationSoundSettingsScreen() {
  const { t } = useTranslation();
  const { userRole } = useAuth();
  const insets = useSafeAreaInsets();
  const [med, setMed] = useState<NotificationSoundChoiceId>('default');
  const [sos, setSos] = useState<NotificationSoundChoiceId>('default');
  const [loading, setLoading] = useState(true);
  const [previewKey, setPreviewKey] = useState<string | null>(null);

  const showSos = userRole === 'CARETAKER' || userRole === 'HYBRID';
  const headerTop = Math.max(insets.top, Platform.OS === 'web' ? 12 : 8);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, s] = await Promise.all([getMedicationSoundChoice(), getSosSoundChoice()]);
      setMed(m);
      setSos(s);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onSelectMed = async (id: NotificationSoundChoiceId) => {
    setMed(id);
    await setMedicationSoundChoice(id);
  };

  const onSelectSos = async (id: NotificationSoundChoiceId) => {
    setSos(id);
    await setSosSoundChoice(id);
  };

  const onPreviewMed = async (id: NotificationSoundChoiceId) => {
    const key = `med-${id}`;
    setPreviewKey(key);
    try {
      await previewNotificationAsset(resolveMedicationSoundAsset(id));
    } finally {
      setPreviewKey(null);
    }
  };

  const onPreviewSos = async (id: NotificationSoundChoiceId) => {
    const key = `sos-${id}`;
    setPreviewKey(key);
    try {
      await previewNotificationAsset(resolveSosSoundAsset(id));
    } finally {
      setPreviewKey(null);
    }
  };

  const renderSoundGroup = (
    title: string,
    subtitle: string,
    value: NotificationSoundChoiceId,
    onSelect: (id: NotificationSoundChoiceId) => void,
    onPreview: (id: NotificationSoundChoiceId) => void,
    busyKey: 'med' | 'sos',
    icon: keyof typeof MaterialIcons.glyphMap,
  ) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconWrap}>
          <MaterialIcons name={icon} size={22} color={Theme.colors.primaryLimeDark} />
        </View>
        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        </View>
      </View>

      <View style={styles.optionStack}>
        {NOTIFICATION_SOUND_CHOICE_IDS.map(id => {
          const selected = value === id;
          const rowPreviewKey = `${busyKey}-${id}`;
          const label = t(`sounds.${id}.label`);
          const description = t(`sounds.${id}.description`);
          return (
            <View key={id} style={styles.optionRow}>
              <Pressable
                onPress={() => void onSelect(id)}
                style={({ pressed }) => [
                  styles.optionCard,
                  selected && styles.optionCardSelected,
                  pressed && styles.optionCardPressed,
                ]}
              >
                <MaterialIcons
                  name={selected ? 'radio-button-checked' : 'radio-button-unchecked'}
                  size={24}
                  color={selected ? Theme.colors.primaryLimeDark : Theme.colors.textLight}
                />
                <View style={styles.optionText}>
                  <Text style={styles.optionLabel}>{label}</Text>
                  <Text style={styles.optionDesc}>{description}</Text>
                </View>
              </Pressable>
              <Pressable
                onPress={() => void onPreview(id)}
                style={({ pressed }) => [styles.previewBtn, pressed && styles.previewBtnPressed]}
                accessibilityLabel={t('sounds.a11yPreview', { label })}
                disabled={previewKey !== null}
              >
                {previewKey === rowPreviewKey ? (
                  <ActivityIndicator size="small" color={Theme.colors.primaryLimeDark} />
                ) : (
                  <MaterialIcons name="volume-up" size={22} color={Theme.colors.primaryLimeDark} />
                )}
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );

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
        <Pressable
          onPress={() => exitSettings(userRole)}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <MaterialIcons name="arrow-back" size={24} color={Theme.colors.textDark} />
        </Pressable>
      </View>

      <CaretakerTourScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: getScreenBottomPadding(insets.bottom, Theme.spacing.xl) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.badgePill}>
            <MaterialIcons name="notifications-active" size={14} color={Theme.colors.primaryLimeDark} />
            <Text style={styles.badgeText}>{t('sounds.screenTitle')}</Text>
          </View>
          <Text style={styles.heroTitle}>{t('sounds.screenTitle')}</Text>
          <Text style={styles.heroSubtitle}>
            {userRole === 'DEPENDENT'
              ? t('sounds.sectionMedicationSubtitleDependent')
              : t('sounds.sectionMedicationSubtitleCaretaker')}
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={Theme.colors.primaryLimeDark} style={styles.loader} />
        ) : (
          <>
            <CaretakerTourAnchor
              stepId="sounds-medication"
              titleKey="caretaker.tour.soundsMedication.title"
              bodyKey="caretaker.tour.soundsMedication.body"
              placement="bottom"
              wrapStyle={styles.sectionTourWrap}
              enabled={userRole === 'CARETAKER'}
              measureDelayMs={500}
            >
              {renderSoundGroup(
                t('sounds.sectionMedication'),
                userRole === 'DEPENDENT'
                  ? t('sounds.sectionMedicationSubtitleDependent')
                  : t('sounds.sectionMedicationSubtitleCaretaker'),
                med,
                onSelectMed,
                onPreviewMed,
                'med',
                'medication',
              )}
            </CaretakerTourAnchor>
            {showSos &&
              renderSoundGroup(
                t('sounds.sectionSos'),
                t('sounds.sectionSosSubtitle'),
                sos,
                onSelectSos,
                onPreviewSos,
                'sos',
                'warning-amber',
              )}
            {Platform.OS === 'web' && (
              <Text style={styles.webHint}>{t('sounds.webHint')}</Text>
            )}
          </>
        )}
      </CaretakerTourScrollView>

      <View style={[styles.footer, { paddingBottom: getScreenBottomPadding(insets.bottom, Theme.spacing.m) }]}>
        <HugeButton title={t('common.done')} onPress={() => exitSettings(userRole)} style={styles.doneBtn} />
      </View>
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
    width: 200,
    height: 200,
    top: -30,
    right: -50,
    backgroundColor: Theme.colors.primaryLime,
  },
  decorOrbAccent: {
    width: 120,
    height: 120,
    top: 100,
    left: -40,
    backgroundColor: 'rgba(233, 164, 61, 0.35)',
  },
  topBar: {
    paddingHorizontal: Theme.spacing.l,
    paddingBottom: Theme.spacing.xs,
    zIndex: 2,
  },
  backBtn: {
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
  backBtnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  scroll: {
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
    fontSize: 32,
    fontWeight: '800',
    color: Theme.colors.textDark,
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  heroSubtitle: {
    marginTop: Theme.spacing.s,
    fontSize: Theme.typography.body,
    color: Theme.colors.textLight,
    lineHeight: 22,
    maxWidth: 340,
  },
  loader: {
    marginTop: 40,
  },
  sectionTourWrap: {
    width: '100%',
  },
  section: {
    marginBottom: Theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Theme.spacing.m,
  },
  sectionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.m,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: Theme.typography.title,
    fontWeight: '800',
    color: Theme.colors.textDark,
  },
  sectionSubtitle: {
    marginTop: 4,
    fontSize: Theme.typography.caption,
    color: Theme.colors.textLight,
    lineHeight: 20,
  },
  optionStack: {
    gap: Theme.spacing.s,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  optionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Theme.spacing.m,
    marginRight: Theme.spacing.s,
    borderRadius: Theme.borderRadius.xlarge,
    backgroundColor: Theme.colors.surfaceWhite,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    shadowColor: Theme.colors.shadowNeutral,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  optionCardSelected: {
    borderColor: Theme.colors.primaryLimeDark,
    backgroundColor: Theme.colors.surfaceWarmHighlight,
    borderWidth: 2,
  },
  optionCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  optionText: {
    flex: 1,
    marginLeft: Theme.spacing.s,
  },
  optionLabel: {
    fontSize: Theme.typography.body,
    fontWeight: '700',
    color: Theme.colors.textDark,
  },
  optionDesc: {
    fontSize: Theme.typography.small,
    color: Theme.colors.textLight,
    marginTop: 4,
    lineHeight: 18,
  },
  previewBtn: {
    width: 52,
    height: 52,
    alignSelf: 'center',
    borderRadius: 26,
    backgroundColor: Theme.colors.surfaceWhite,
    borderWidth: 1.5,
    borderColor: Theme.colors.primaryLimeDark,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Theme.colors.shadowNeutral,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  previewBtnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  webHint: {
    fontSize: Theme.typography.small,
    color: Theme.colors.textLight,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: Theme.spacing.l,
    paddingTop: Theme.spacing.s,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Theme.colors.border,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
  },
  doneBtn: {
    width: '100%',
    minHeight: 52,
  },
});
