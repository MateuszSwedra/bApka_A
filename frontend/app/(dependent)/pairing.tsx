import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { HugeButton } from '../../components/HugeButton';
import { Theme } from '../../constants/theme';

export default function DependentPairingScreen() {
  const [pin, setPin] = useState('');

  const handlePair = () => {
    // Weryfikacja PIN (mock)
    if (pin.length === 6) {
      router.replace('/(dependent)');
    } else {
      alert("PIN musi mieć 6 cyfr.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wpisz kod od Opiekuna</Text>
      
      <TextInput 
        style={styles.pinInput}
        value={pin}
        onChangeText={setPin}
        keyboardType="number-pad"
        maxLength={6}
        placeholder="------"
        autoFocus
      />

      <HugeButton 
        title="POŁĄCZ" 
        size="huge" 
        onPress={handlePair} 
        disabled={pin.length !== 6}
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
    backgroundColor: Theme.colors.surface,
    fontSize: 64,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 12,
    borderRadius: Theme.borderRadius.large,
    padding: Theme.spacing.m,
    marginBottom: Theme.spacing.xxl,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  button: {
    marginTop: Theme.spacing.xl,
  }
});
