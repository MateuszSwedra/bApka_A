import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Platform,
  Alert,
  Pressable,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { HugeButton } from '../../components/HugeButton';
import { Theme } from '../../constants/theme';
import {
  IOT_PROVISION_URL,
  IOT_SOFTAP_PASS,
  IOT_SOFTAP_SSID,
  IotPrepareResult,
  isAuthApiError,
  iotAPI,
} from '../../services/api';
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

type Phase = 'form' | 'setup' | 'waiting' | 'done';

export default function AddIotDeviceScreen() {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const bottomPadding = useScreenBottomPadding(Theme.spacing.l);

  const [name, setName] = useState('');
  const [phase, setPhase] = useState<Phase>('form');
  const [busy, setBusy] = useState(false);
  const [prepared, setPrepared] = useState<IotPrepareResult | null>(null);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPoll(), [stopPoll]);

  const handleAuthError = async (e: unknown) => {
    if (!isAuthApiError(e)) return false;
    await logout();
    showAlert(t('common.error'), t('caretaker.iot.alertSessionExpired'));
    router.replace('/login');
    return true;
  };

  const startPolling = (deviceId: string, dependentUserId: string) => {
    stopPoll();
    setPhase('waiting');
    pollRef.current = setInterval(() => {
      void (async () => {
        try {
          const devices = await iotAPI.listDevices();
          const mine = devices.find((d) => d.id === deviceId);
          if (mine?.claimedAt) {
            stopPoll();
            setPhase('done');
            showAlert(
              t('caretaker.iot.alertReadyTitle'),
              t('caretaker.iot.alertReadyMessage'),
            );
            router.replace(`/(caretaker)/dependent/${dependentUserId}`);
          }
        } catch (e) {
          if (await handleAuthError(e)) {
            stopPoll();
          }
        }
      })();
    }, 3000);
  };

  const handlePrepare = async () => {
    setBusy(true);
    try {
      const result = await iotAPI.prepare(name);
      setPrepared(result);
      setPhase('setup');
    } catch (e) {
      if (await handleAuthError(e)) return;
      const detail = e instanceof Error ? e.message : '';
      showAlert(t('common.error'), detail || t('caretaker.iot.alertPrepareError'));
    } finally {
      setBusy(false);
    }
  };

  const handleCopyToken = async () => {
    if (!prepared?.claimToken) return;
    await Clipboard.setStringAsync(prepared.claimToken);
    setCopied(true);
    showAlert(t('caretaker.iot.alertCopiedTitle'), t('caretaker.iot.alertCopiedMessage'));
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartWaiting = () => {
    if (!prepared) return;
    startPolling(prepared.deviceId, prepared.dependentUserId);
  };

  const expiresLabel = prepared?.claimExpiresAt
    ? new Date(prepared.claimExpiresAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#E8F2F8', Theme.colors.surfaceGrey, Theme.colors.background]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.badgePill}>
            <MaterialIcons name="developer-board" size={14} color={Theme.colors.primaryLimeDark} />
            <Text style={styles.badgeText}>{t('caretaker.iot.badge')}</Text>
          </View>
          <Text style={styles.title}>{t('caretaker.iot.title')}</Text>
          <Text style={styles.subtitle}>{t('caretaker.iot.subtitle')}</Text>
        </View>

        {phase === 'form' ? (
          <View style={styles.card}>
            <Text style={styles.label}>{t('caretaker.iot.nameLabel')}</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={t('caretaker.iot.namePlaceholder')}
              placeholderTextColor={Theme.colors.textLight}
              maxLength={80}
              editable={!busy}
            />
            <Text style={styles.hint}>{t('caretaker.iot.prepareHint')}</Text>
            {busy ? (
              <ActivityIndicator
                size="large"
                color={Theme.colors.primaryLimeDark}
                style={styles.loader}
              />
            ) : (
              <HugeButton
                title={t('caretaker.iot.prepareCta')}
                onPress={() => void handlePrepare()}
                style={styles.button}
              />
            )}
            <HugeButton
              title={t('common.cancel')}
              variant="outline"
              onPress={() => router.back()}
              style={styles.button}
            />
          </View>
        ) : null}

        {(phase === 'setup' || phase === 'waiting' || phase === 'done') && prepared ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('caretaker.iot.tokenTitle')}</Text>
            <View style={styles.tokenRow}>
              <Text style={styles.token} selectable numberOfLines={2}>
                {prepared.claimToken}
              </Text>
              <Pressable
                onPress={() => void handleCopyToken()}
                style={({ pressed }) => [styles.copyBtn, pressed && styles.copyBtnPressed]}
                accessibilityLabel={t('caretaker.iot.a11yCopyToken')}
              >
                <MaterialIcons
                  name={copied ? 'check' : 'content-copy'}
                  size={24}
                  color={Theme.colors.primaryLimeDark}
                />
              </Pressable>
            </View>
            <Text style={styles.meta}>
              {t('caretaker.iot.publicId', { id: prepared.publicId })}
            </Text>
            {expiresLabel ? (
              <Text style={styles.meta}>
                {t('caretaker.iot.expires', { time: expiresLabel })}
              </Text>
            ) : null}

            <Text style={[styles.sectionTitle, styles.sectionSpaced]}>
              {t('caretaker.iot.stepsTitle')}
            </Text>
            <Text style={styles.step}>{t('caretaker.iot.step1')}</Text>
            <Text style={styles.step}>
              {t('caretaker.iot.step2', {
                ssid: IOT_SOFTAP_SSID,
                pass: IOT_SOFTAP_PASS,
              })}
            </Text>
            <Text style={styles.step}>
              {t('caretaker.iot.step3', { url: IOT_PROVISION_URL })}
            </Text>
            <Text style={styles.step}>{t('caretaker.iot.step4')}</Text>
            <Text style={styles.step}>{t('caretaker.iot.step5')}</Text>

            {phase === 'setup' ? (
              <HugeButton
                title={t('caretaker.iot.waitCta')}
                onPress={handleStartWaiting}
                style={styles.waitButton}
              />
            ) : null}

            {phase === 'waiting' ? (
              <View style={styles.waitingBox}>
                <ActivityIndicator size="large" color={Theme.colors.primaryLimeDark} />
                <Text style={styles.waitingText}>{t('caretaker.iot.waiting')}</Text>
                <Text style={styles.hint}>{t('caretaker.iot.waitingHint')}</Text>
              </View>
            ) : null}

            <HugeButton
              title={t('common.cancel')}
              variant="outline"
              onPress={() => {
                stopPoll();
                router.replace('/(caretaker)');
              }}
              style={styles.button}
            />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
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
    fontSize: 30,
    fontWeight: '800',
    color: Theme.colors.textDark,
    letterSpacing: -0.4,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: Theme.typography.body,
    color: Theme.colors.textLight,
    lineHeight: 22,
    marginTop: Theme.spacing.s,
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
    gap: Theme.spacing.s,
  },
  label: {
    fontSize: Theme.typography.caption,
    fontWeight: '700',
    color: Theme.colors.primaryLimeDark,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  input: {
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.medium,
    paddingHorizontal: Theme.spacing.m,
    paddingVertical: 12,
    fontSize: Theme.typography.body,
    color: Theme.colors.textDark,
    backgroundColor: 'rgba(200, 224, 240, 0.18)',
  },
  hint: {
    fontSize: Theme.typography.caption,
    color: Theme.colors.textLight,
    lineHeight: 18,
  },
  loader: {
    marginVertical: Theme.spacing.m,
  },
  button: {
    width: '100%',
    marginTop: Theme.spacing.s,
  },
  waitButton: {
    width: '100%',
    marginTop: Theme.spacing.m,
  },
  sectionTitle: {
    fontSize: Theme.typography.title,
    fontWeight: '700',
    color: Theme.colors.textDark,
  },
  sectionSpaced: {
    marginTop: Theme.spacing.m,
  },
  tokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.s,
    backgroundColor: 'rgba(200, 224, 240, 0.22)',
    borderRadius: Theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.m,
  },
  token: {
    flex: 1,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 3,
    color: Theme.colors.primaryLimeDark,
  },
  copyBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  copyBtnPressed: {
    opacity: 0.75,
  },
  meta: {
    fontSize: Theme.typography.caption,
    color: Theme.colors.textLight,
  },
  step: {
    fontSize: Theme.typography.body,
    color: Theme.colors.textDark,
    lineHeight: 22,
    marginTop: 4,
  },
  waitingBox: {
    alignItems: 'center',
    gap: Theme.spacing.s,
    paddingVertical: Theme.spacing.m,
  },
  waitingText: {
    fontSize: Theme.typography.body,
    fontWeight: '700',
    color: Theme.colors.primaryLimeDark,
    textAlign: 'center',
  },
});
