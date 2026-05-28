import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { HugeButton } from '../../components/HugeButton';
import { Theme } from '../../constants/theme';
import { normalizePinInput } from '../../utils/pin';
import { useTranslation } from 'react-i18next';

export default function DependentPairingScreen() {
  const { t } = useTranslation();
  const [pin, setPin] = useState('');

  const handlePair = () => {
    const digits = normalizePinInput(pin);
    if (digits.length !== 6) {
      alert(t('pairing.validationLength'));
      return;
    }
    router.replace('/(dependent)');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('pairing.dependent.title')}</Text>
      
      <TextInput 
        style={styles.pinInput}
        value={pin}
        onChangeText={(text) => setPin(normalizePinInput(text))}
        keyboardType="number-pad"
        placeholder={t('pairing.pinPlaceholder')}
        autoFocus
      />

      <HugeButton 
        title={t('pairing.ctaConnectUpper')} 
        size="huge" 
        onPress={handlePair} 
        disabled={normalizePinInput(pin).length !== 6}
        style={styles.button}
      />
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
  title: {
    fontSize: Theme.typography.largeTitle,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: Theme.spacing.xxl,
  },
  pinInput: {
    backgroundColor: Theme.colors.surfaceWhite,
    fontSize: 64,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 12,
    borderRadius: Theme.borderRadius.large,
    padding: Theme.spacing.m,
    marginBottom: Theme.spacing.xxl,
    elevation: 2,
    shadowColor: Theme.colors.shadowNeutral,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  button: {
    marginTop: Theme.spacing.xl,
  }
});
