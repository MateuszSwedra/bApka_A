import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { HugeButton } from '../../components/HugeButton';
import { Card } from '../../components/Card';
import { Theme } from '../../constants/theme';

export default function CaretakerPairingScreen() {
  const pinCode = "123456"; // Mocked PIN

  const handleDone = () => {
    router.replace('/(caretaker)');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dodaj Podopiecznego</Text>
      
      <Card style={styles.card}>
        <Text style={styles.subtitle}>Poproś podopiecznego o wpisanie poniższego kodu w swojej aplikacji:</Text>
        <Text style={styles.pin}>{pinCode}</Text>
      </Card>

      <HugeButton title="Gotowe" onPress={handleDone} style={styles.button} />
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
    fontSize: Theme.typography.title,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: Theme.spacing.xl,
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
  pin: {
    fontSize: 64,
    fontWeight: 'bold',
    letterSpacing: 8,
    color: Theme.colors.primary,
  },
  button: {
    marginTop: Theme.spacing.m,
  }
});
