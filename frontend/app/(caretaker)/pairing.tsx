import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { HugeButton } from '../../components/HugeButton';
import { Card } from '../../components/Card';
import { Theme } from '../../constants/theme';
import { usersAPI } from '../../services/api';
import { useTranslation } from 'react-i18next';

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
  const [pinCode, setPinCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchPin = async () => {
      try {
        const data = await usersAPI.generatePin();
        setPinCode(data.pin);
      } catch {
        showAlert(t('common.error'), t('caretaker.pairing.alertGenerateError'));
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
      <MaterialIcons name="link" size={64} color={Theme.colors.primaryLimeDark} style={styles.icon} />
      <Text style={styles.title}>{t('caretaker.pairing.title')}</Text>

      {isLoading ? (
        <ActivityIndicator size="large" color={Theme.colors.primaryLimeDark} style={styles.loader} />
      ) : (
        <>
          <Card style={styles.card}>
            <Text style={styles.subtitle}>{t('caretaker.pairing.instructions')}</Text>
            <View style={styles.pinRow}>
              <Text
                selectable
                style={styles.pin}
                accessibilityLabel={t('caretaker.pairing.a11yCode', { code: pinCode ?? '' })}
              >
                {pinCode ? formatPinDisplay(pinCode) : t('pairing.pinPlaceholder')}
              </Text>
              <Pressable
                onPress={() => void handleCopy()}
                style={({ pressed }) => [styles.copyBtn, pressed && { opacity: 0.75 }]}
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
            <Text style={styles.pinHint}>{t('caretaker.pairing.hint')}</Text>
          </Card>

          <View style={styles.actions}>
            <HugeButton title={t('common.done')} onPress={handleDone} style={styles.button} />
            <HugeButton title={t('common.cancel')} variant="outline" onPress={() => router.back()} style={styles.button} />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Theme.spacing.l,
    backgroundColor: Theme.colors.background,
    justifyContent: 'center',
  },
  icon: {
    alignSelf: 'center',
    marginBottom: Theme.spacing.m,
  },
  title: {
    fontSize: Theme.typography.largeTitle,
    fontWeight: 'bold',
    textAlign: 'center',
    color: Theme.colors.textDark,
    marginBottom: Theme.spacing.xxl,
  },
  card: {
    alignItems: 'center',
    padding: Theme.spacing.xxl,
    marginBottom: Theme.spacing.xxl,
  },
  subtitle: {
    fontSize: Theme.typography.body,
    textAlign: 'center',
    marginBottom: Theme.spacing.l,
    color: Theme.colors.textLight,
  },
  pinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.m,
    width: '100%',
  },
  pin: {
    fontSize: 56,
    fontWeight: 'bold',
    letterSpacing: 4,
    color: Theme.colors.primaryLimeDark,
    textAlign: 'center',
  },
  copyBtn: {
    padding: Theme.spacing.s,
    borderRadius: Theme.borderRadius.medium,
    backgroundColor: Theme.colors.surfaceGrey,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  pinHint: {
    marginTop: Theme.spacing.m,
    fontSize: Theme.typography.caption,
    color: Theme.colors.textLight,
    textAlign: 'center',
    lineHeight: 18,
  },
  loader: {
    marginVertical: Theme.spacing.xxl,
  },
  actions: {
    gap: Theme.spacing.m,
  },
  button: {
    width: '100%',
  },
});
