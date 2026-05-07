import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { HugeButton } from '../../components/HugeButton';
import { Card } from '../../components/Card';
import { Theme } from '../../constants/theme';
import { usersAPI } from '../../services/api';

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}: ${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function CaretakerPairingScreen() {
  const [pinCode, setPinCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPin = async () => {
      try {
        const data = await usersAPI.generatePin();
        setPinCode(data.pin);
      } catch (e: any) {
        showAlert('Błąd', 'Nie udało się wygenerować kodu parowania.');
        router.back();
      } finally {
        setIsLoading(false);
      }
    };
    fetchPin();
  }, []);

  const handleDone = () => {
    router.replace('/(caretaker)');
  };

  return (
    <View style={styles.container}>
      <MaterialIcons name="link" size={64} color={Theme.colors.primaryLimeDark} style={styles.icon} />
      <Text style={styles.title}>Dodaj Podopiecznego</Text>
      
      {isLoading ? (
        <ActivityIndicator size="large" color={Theme.colors.primaryLimeDark} style={styles.loader} />
      ) : (
        <>
          <Card style={styles.card}>
            <Text style={styles.subtitle}>Poproś podopiecznego o wybranie opcji "Mam Opiekuna" i wpisanie poniższego kodu:</Text>
            <Text style={styles.pin}>{pinCode ? `${pinCode.substring(0, 3)} ${pinCode.substring(3, 6)}` : '------'}</Text>
          </Card>

          <View style={styles.actions}>
            <HugeButton title="Gotowe" onPress={handleDone} style={styles.button} />
            <HugeButton title="Anuluj" variant="outline" onPress={() => router.back()} style={styles.button} />
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
  pin: {
    fontSize: 56,
    fontWeight: 'bold',
    letterSpacing: 4,
    color: Theme.colors.primaryLimeDark,
  },
  loader: {
    marginVertical: Theme.spacing.xxl,
  },
  actions: {
    gap: Theme.spacing.m,
  },
  button: {
    width: '100%',
  }
});
