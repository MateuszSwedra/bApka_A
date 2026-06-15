import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Vibration,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { cancelAllNotifeeNotifications } from '../services/notifeeSafe';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { resolveSosSoundAsset } from '../constants/notificationSounds';
import { getSosSoundChoice } from '../services/notificationSoundPreferences';
import { navigateAfterSosDismiss } from '../services/sosDismissRouting';

const SOS_SOUND = resolveSosSoundAsset('strong');

export default function SosAlarmScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    dependentId?: string;
    dependentName?: string;
    body?: string;
  }>();
  const soundRef = useRef<Audio.Sound | null>(null);
  const vibrateInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const dependentName = params.dependentName?.trim() || t('sosAlarm.unknownSenior');
  const bodyText = params.body?.trim() || t('sosAlarm.defaultBody', { name: dependentName });

  useEffect(() => {
    if (Platform.OS === 'android') {
      void cancelAllNotifeeNotifications();
    }
  }, []);

  const stopAlarm = useCallback(async () => {
    if (vibrateInterval.current) {
      clearInterval(vibrateInterval.current);
      vibrateInterval.current = null;
    }
    Vibration.cancel();
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch {
        /* ignore */
      }
      soundRef.current = null;
    }
    if (Platform.OS === 'android') {
      await cancelAllNotifeeNotifications();
    }
  }, []);

  const dismiss = useCallback(async () => {
    await stopAlarm();
    if (router.canGoBack()) {
      router.back();
      return;
    }
    await navigateAfterSosDismiss(params.dependentId);
  }, [stopAlarm, params.dependentId]);

  useEffect(() => {
    let mounted = true;

    const startAlarm = async () => {
      if (Platform.OS !== 'web') {
        vibrateInterval.current = setInterval(() => {
          Vibration.vibrate([0, 600, 200, 600]);
        }, 1800);
      }

      const choice = await getSosSoundChoice();
      const asset = resolveSosSoundAsset(choice) ?? SOS_SOUND;
      if (!asset || !mounted) return;

      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          interruptionModeIOS: InterruptionModeIOS.DoNotMix,
          interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
          shouldDuckAndroid: false,
          staysActiveInBackground: true,
        });
        const { sound } = await Audio.Sound.createAsync(asset, { isLooping: true, volume: 1 });
        if (!mounted) {
          await sound.unloadAsync();
          return;
        }
        soundRef.current = sound;
        await sound.playAsync();
      } catch {
        /* fallback: vibration only */
      }
    };

    void startAlarm();
    return () => {
      mounted = false;
      void stopAlarm();
    };
  }, [stopAlarm]);

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.content}>
        <MaterialIcons name="crisis-alert" size={72} color="#FFFFFF" />
        <Text style={styles.title}>{t('sosAlarm.title')}</Text>
        <Text style={styles.name}>{dependentName}</Text>
        <Text style={styles.body}>{bodyText}</Text>
      </View>

      <Pressable
        style={styles.dismissBtn}
        onPress={() => void dismiss()}
        accessibilityRole="button"
        accessibilityLabel={t('sosAlarm.dismiss')}
      >
        <Text style={styles.dismissText}>{t('sosAlarm.dismiss')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#B91C1C',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  name: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFEBEE',
    textAlign: 'center',
  },
  body: {
    fontSize: 18,
    color: '#FFCDD2',
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 8,
  },
  dismissBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  dismissText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#B91C1C',
  },
});
