import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { HugeButton } from '../../components/HugeButton';
import { Theme } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { usersAPI } from '../../services/api';
import * as SecureStore from 'expo-secure-store';
import { normalizePinInput } from '../../utils/pin';
import { useTranslation } from 'react-i18next';
import { useScreenBottomPadding } from '../../utils/safeAreaInsets';

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}: ${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function DependentPairingScreen() {
  const { t } = useTranslation();
  const { loginFake, setUserSession } = useAuth();
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomPadding = useScreenBottomPadding(Theme.spacing.l);

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

      showAlert(t('pairing.alertSuccessTitle'), t('pairing.alertSuccessMessage'));
      router.replace('/(dependent)');
    } catch {
      showAlert(t('pairing.alertErrorTitle'), t('pairing.alertInvalidPin'));
    } finally {
      setIsLoading(false);
    }
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
            <MaterialIcons name="link" size={14} color={Theme.colors.primaryLimeDark} />
            <Text style={styles.badgeText}>{t('pairing.ctaConnect')}</Text>
          </View>
          <Text style={styles.title}>{t('pairing.dependent.title')}</Text>
          <Text style={styles.subtitle}>{t('pairing.enterPin.subtitle')}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardAccent} />
          <Text style={styles.inputLabel}>{t('pairing.enterPin.title')}</Text>
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
              maxLength={6}
            />
          </View>
          <Text style={styles.pinHint}>{t('pairing.validationLength')}</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color={Theme.colors.primaryLimeDark} style={styles.loader} />
        ) : (
          <View style={styles.actions}>
            <HugeButton title={t('pairing.ctaConnectUpper')} onPress={() => void handlePair()} style={styles.button} />
          </View>
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
  subtitle: {
    fontSize: Theme.typography.body,
    color: Theme.colors.textLight,
    lineHeight: 22,
    marginTop: Theme.spacing.s,
    maxWidth: 320,
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
  inputLabel: {
    fontSize: Theme.typography.caption,
    color: Theme.colors.primaryLimeDark,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: Theme.spacing.s,
  },
  inputContainer: {
    borderRadius: Theme.borderRadius.large,
    backgroundColor: 'rgba(200, 224, 240, 0.22)',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingHorizontal: Theme.spacing.s,
    paddingVertical: Theme.spacing.m,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: Theme.spacing.m,
    paddingHorizontal: Theme.spacing.s,
    borderRadius: Theme.borderRadius.medium,
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: 6,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    color: Theme.colors.primaryLimeDark,
    width: '100%',
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
    marginTop: Theme.spacing.s,
  },
  button: {
    width: '100%',
  },
});
