import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Theme } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { usersAPI } from '../services/api';
import * as SecureStore from 'expo-secure-store';

export default function SeniorTypeScreen() {
  const { loginFake, setUserSession } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleWithCaretaker = () => {
    // Role is already DEPENDENT from role-selection.tsx
    router.replace('/enter-pin');
  };

  const handleIndependent = async () => {
    setIsLoading(true);
    try {
      await usersAPI.updateRole('HYBRID');
      
      let token = null;
      if (Platform.OS === 'web') {
        token = localStorage.getItem('userToken');
      } else {
        token = await SecureStore.getItemAsync('userToken');
      }

      if (token) {
        await setUserSession(token, 'HYBRID');
      } else {
        loginFake('HYBRID');
      }
      
      router.replace('/(hybrid)');
    } catch (e) {
      if (Platform.OS === 'web') {
        window.alert('Błąd: Nie udało się zaktualizować typu konta.');
      } else {
        Alert.alert('Błąd', 'Nie udało się zaktualizować typu konta.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="settings-accessibility" size={64} color={Theme.colors.accentOrange} />
        <Text style={styles.title}>Jak chcesz korzystać?</Text>
        <Text style={styles.subtitle}>Wybierz tryb dopasowany do Twoich potrzeb</Text>
      </View>
      
      {isLoading ? (
        <ActivityIndicator size="large" color={Theme.colors.accentOrange} style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.cardsContainer}>
          <Pressable 
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={handleWithCaretaker}
          >
            <View style={[styles.iconWrapper, { backgroundColor: Theme.colors.surfaceWhite }]}>
              <MaterialIcons name="group" size={40} color={Theme.colors.primaryLimeDark} />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Z Opiekunem</Text>
              <Text style={styles.cardDescription}>
                Mój opiekun skonfiguruje mi harmonogram i będzie czuwał nad moimi lekami.
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={28} color={Theme.colors.textLight} />
          </Pressable>

          <Pressable 
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed, styles.cardIndependent]}
            onPress={handleIndependent}
          >
            <View style={[styles.iconWrapper, { backgroundColor: Theme.colors.surfaceWhite }]}>
              <MaterialIcons name="person" size={40} color={Theme.colors.accentOrange} />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Samodzielnie</Text>
              <Text style={styles.cardDescription}>
                Chcę samodzielnie zarządzać swoimi lekami oraz korzystać ze wszystkich zaawansowanych opcji aplikacji.
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={28} color={Theme.colors.textLight} />
          </Pressable>
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
  header: {
    alignItems: 'center',
    marginBottom: Theme.spacing.xxl,
  },
  title: {
    fontSize: Theme.typography.largeTitle,
    fontWeight: 'bold',
    color: Theme.colors.textDark,
    marginTop: Theme.spacing.m,
    marginBottom: Theme.spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Theme.typography.body,
    color: Theme.colors.textLight,
    textAlign: 'center',
  },
  cardsContainer: {
    gap: Theme.spacing.l,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceWhite,
    padding: Theme.spacing.l,
    borderRadius: Theme.borderRadius.large,
    borderWidth: 2,
    borderColor: Theme.colors.primaryLime,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardIndependent: {
    borderColor: Theme.colors.accentOrange,
  },
  cardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  cardContent: {
    flex: 1,
    marginLeft: Theme.spacing.m,
    marginRight: Theme.spacing.s,
  },
  cardTitle: {
    fontSize: Theme.typography.title,
    fontWeight: 'bold',
    color: Theme.colors.textDark,
    marginBottom: Theme.spacing.xs,
  },
  cardDescription: {
    fontSize: Theme.typography.small,
    color: Theme.colors.textLight,
    lineHeight: 20,
  }
});
