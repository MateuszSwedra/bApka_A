import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
  Pressable,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { HugeButton } from '../../components/HugeButton';
import { Theme } from '../../constants/theme';
import { isAuthApiError, usersAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useScreenBottomPadding } from '../../utils/safeAreaInsets';

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}: ${message}`);
  } else {
    Alert.alert(title, message);
  }
};

function formatPinDisplay(pin: string): string {
  return `${pin.substring(0, 3)} ${pin.substring(3, 6)}`;
}

export default function CaretakerPairingScreen() {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const { width: screenWidth } = useWindowDimensions();
  const pinFontSize = screenWidth < 380 ? 40 : screenWidth < 420 ? 48 : 56;
  const pinLetterSpacing = screenWidth < 380 ? 2 : 4;
  const bottomPadding = useScreenBottomPadding(Theme.spacing.l);
  const [pinCode, setPinCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchPin = async () => {
      try {
        const data = await usersAPI.generatePin();
        setPinCode(data.pin);
      } catch (e) {
        if (isAuthApiError(e)) {
          await logout();
          showAlert(t('common.error'), t('caretaker.pairing.alertSessionExpired'));
          router.replace('/login');
          return;
        }
        const detail = e instanceof Error ? e.message : '';
        showAlert(
          t('common.error'),
          detail || t('caretaker.pairing.alertGenerateError'),
        );
        router.back();
      } finally {
        setIsLoading(false);
      }
    };
    fetchPin();
  }, []);

  const handleCopy = async () => {
    if (!pinCode) return;
    await Clipboard.setStringAsync(pinCode);
    setCopied(true);
    showAlert(t('caretaker.pairing.alertCopiedTitle'), t('caretaker.pairing.alertCopiedMessage'));
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDone = () => {
    router.replace('/(caretaker)');
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#E8F2F8', Theme.colors.surfaceGrey, Theme.colors.background]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.decorOrb, styles.decorOrbPrimary]} />
      <View style={[styles.decorOrb, styles.decorOrbAccent]} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.badgePill}>
            <MaterialIcons name="verified-user" size={14} color={Theme.colors.primaryLimeDark} />
            <Text style={styles.badgeText}>{t('caretaker.dashboard.badge')}</Text>
          </View>
          <Text style={styles.title}>{t('caretaker.pairing.title')}</Text>
          <Text style={styles.subtitle}>{t('caretaker.pairing.instructions')}</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color={Theme.colors.primaryLimeDark} style={styles.loader} />
        ) : (
          <>
            <View style={styles.card}>
              <View style={styles.cardAccent} />
              <View style={styles.pinPanel}>
                <Text style={styles.pinLabel}>{t('pairing.enterPin.title')}</Text>
                <View style={styles.pinRowWrap}>
                  <View style={styles.pinRow}>
                    <Text
                      selectable
                      numberOfLines={1}
                      adjustsFontSizeToFit={Platform.OS === 'ios'}
                      minimumFontScale={0.7}
                      style={[
                        styles.pin,
                        { fontSize: pinFontSize, letterSpacing: pinLetterSpacing },
                      ]}
                      accessibilityLabel={t('caretaker.pairing.a11yCode', { code: pinCode ?? '' })}
                    >
                      {pinCode ? formatPinDisplay(pinCode) : t('pairing.pinPlaceholder')}
                    </Text>
                    <Pressable
                      onPress={() => void handleCopy()}
                      style={({ pressed }) => [styles.copyBtn, pressed && styles.copyBtnPressed]}
                      accessibilityRole="button"
                      accessibilityLabel={t('caretaker.pairing.a11yCopy')}
                      disabled={!pinCode}
                    >
                      <MaterialIcons
                        name={copied ? 'check' : 'content-copy'}
                        size={26}
                        color={Theme.colors.primaryLimeDark}
                      />
                    </Pressable>
                  </View>
                </View>
              </View>
              <Text style={styles.pinHint}>{t('caretaker.pairing.hint')}</Text>
            </View>

            <View style={styles.actions}>
              <HugeButton title={t('common.done')} onPress={handleDone} style={styles.button} />
              <HugeButton title={t('common.cancel')} variant="outline" onPress={() => router.back()} style={styles.button} />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
    top: 130,
    left: -55,
    backgroundColor: 'rgba(233, 164, 61, 0.35)',
  },
  content: {
    paddingHorizontal: Theme.spacing.l,
    paddingTop: Theme.spacing.m,
    gap: Theme.spacing.l,
  },
  hero: {
    marginTop: Theme.spacing.s,
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
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: Theme.colors.textDark,
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  card: {
    borderRadius: Theme.borderRadius.xlarge,
    backgroundColor: Theme.colors.surfaceWhite,
    padding: Theme.spacing.l,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    shadowColor: Theme.colors.shadowNeutral,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 4,
    overflow: 'hidden',
  },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    backgroundColor: Theme.colors.primaryLimeDark,
  },
  subtitle: {
    fontSize: Theme.typography.body,
    color: Theme.colors.textLight,
    lineHeight: 22,
    maxWidth: 320,
    marginTop: Theme.spacing.s,
  },
  pinPanel: {
    backgroundColor: 'rgba(200, 224, 240, 0.22)',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.large,
    padding: Theme.spacing.m,
  },
  pinLabel: {
    fontSize: Theme.typography.caption,
    color: Theme.colors.primaryLimeDark,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: Theme.spacing.s,
  },
  pinRowWrap: {
    width: '100%',
  },
  pinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.s,
    width: '100%',
    flexWrap: 'nowrap',
  },
  pin: {
    flexShrink: 1,
    fontWeight: 'bold',
    color: Theme.colors.primaryLimeDark,
    textAlign: 'center',
  },
  copyBtn: {
    flexShrink: 0,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  copyBtnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  pinHint: {
    marginTop: Theme.spacing.m,
    fontSize: Theme.typography.caption,
    color: Theme.colors.textLight,
    lineHeight: 18,
  },
  loader: {
    marginTop: Theme.spacing.xl,
    marginBottom: Theme.spacing.xxl,
  },
  actions: {
    gap: Theme.spacing.m,
    marginTop: Theme.spacing.m,
  },
  button: {
    width: '100%',
  },
});
