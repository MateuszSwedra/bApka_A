import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Platform,
  Alert,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { HugeButton } from '../components/HugeButton';
import { Theme } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { usersAPI } from '../services/api';
import * as SecureStore from 'expo-secure-store';
import { normalizePinInput } from '../utils/pin';
import { setRequiresCaretakerPairing } from '../services/caretakerPairingState';
import { resolvePostAuthRoute, type MeProfile } from '../services/postAuthRouting';
import { useTranslation } from 'react-i18next';
import { useScreenBottomPadding } from '../utils/safeAreaInsets';

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}: ${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function EnterPinScreen() {
  const { t } = useTranslation();
  const { loginFake, setUserSession } = useAuth();
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomPadding = useScreenBottomPadding(Theme.spacing.l);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  const handlePair = async () => {
    const digits = normalizePinInput(pin);
    if (digits.length !== 6) {
      showAlert(t('common.error'), t('pairing.validationLength'));
      return;
    }

    setIsLoading(true);
    try {
      await usersAPI.pairWithPin(digits);
      await usersAPI.updateRole('DEPENDENT');

      let token = null;
      if (Platform.OS === 'web') {
        token = localStorage.getItem('userToken');
      } else {
        token = await SecureStore.getItemAsync('userToken');
      }

      if (token) {
        await setUserSession(token, 'DEPENDENT');
      } else {
        loginFake('DEPENDENT');
      }

      await setRequiresCaretakerPairing(false);

      showAlert(t('pairing.alertSuccessTitle'), t('pairing.alertSuccessMessage'));
      const me = (await usersAPI.getMe().catch(() => null)) as MeProfile | null;
      const destination = await resolvePostAuthRoute(me, { storedRole: 'DEPENDENT' });
      router.replace(destination as Parameters<typeof router.replace>[0]);
    } catch {
      showAlert(t('pairing.alertErrorTitle'), t('pairing.alertInvalidPin'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: bottomPadding }]}>
      <MaterialIcons name="dialpad" size={64} color={Theme.colors.primaryLimeDark} style={styles.icon} />
      <Text style={styles.title}>{t('pairing.enterPin.title')}</Text>
      <Text style={styles.subtitle}>{t('pairing.enterPin.subtitle')}</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder={t('pairing.pinPlaceholder')}
          value={pin}
          onChangeText={text => setPin(normalizePinInput(text))}
          keyboardType="number-pad"
          editable={!isLoading}
          textAlign="center"
          autoFocus
        />
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={Theme.colors.primaryLimeDark} style={styles.loader} />
      ) : (
        <View style={styles.actions}>
          <HugeButton title={t('pairing.ctaConnect')} onPress={() => void handlePair()} style={styles.button} />
        </View>
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
    marginBottom: Theme.spacing.s,
  },
  subtitle: {
    fontSize: Theme.typography.body,
    textAlign: 'center',
    color: Theme.colors.textLight,
    marginBottom: Theme.spacing.xxl,
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: Theme.spacing.xxl,
    alignItems: 'center',
  },
  input: {
    backgroundColor: Theme.colors.surfaceWhite,
    padding: Theme.spacing.m,
    borderRadius: Theme.borderRadius.medium,
    fontSize: 48,
    fontWeight: 'bold',
    letterSpacing: 8,
    borderWidth: 2,
    borderColor: Theme.colors.primaryLime,
    color: Theme.colors.primaryLimeDark,
    width: '100%',
  },
  loader: {
    marginVertical: Theme.spacing.xl,
  },
  actions: {
    gap: Theme.spacing.m,
  },
  button: {
    width: '100%',
  },
});
