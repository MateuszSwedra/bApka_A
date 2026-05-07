import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, Pressable, Platform } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Theme } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { usersAPI } from '../services/api';
import * as SecureStore from 'expo-secure-store';

export default function RoleSelectionScreen() {
  const { loginFake, setUserSession } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const updateAndNavigate = async (role: 'CARETAKER' | 'DEPENDENT') => {
    setIsLoading(true);
    try {
      await usersAPI.updateRole(role);
      
      let token = null;
      if (Platform.OS === 'web') {
        token = localStorage.getItem('userToken');
      } else {
        token = await SecureStore.getItemAsync('userToken');
      }

      if (token) {
        await setUserSession(token, role);
      } else {
        loginFake(role);
      }

      if (role === 'CARETAKER') {
        router.replace('/(caretaker)');
      } else {
        router.push('/senior-type');
      }
    } catch (e) {
      if (Platform.OS === 'web') {
        window.alert('Błąd: Nie udało się zaktualizować roli na serwerze.');
      } else {
        Alert.alert('Błąd', 'Nie udało się zaktualizować roli na serwerze.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="account-circle" size={64} color={Theme.colors.primaryLimeDark} />
        <Text style={styles.title}>Wybierz swoją rolę</Text>
        <Text style={styles.subtitle}>Dostosujemy aplikację do Twoich potrzeb</Text>
      </View>
      
      {isLoading ? (
        <ActivityIndicator size="large" color={Theme.colors.primaryLimeDark} style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.cardsContainer}>
          <Pressable 
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => updateAndNavigate('CARETAKER')}
          >
            <View style={[styles.iconWrapper, { backgroundColor: Theme.colors.surfaceWhite }]}>
              <MaterialIcons name="favorite" size={40} color={Theme.colors.primaryLimeDark} />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Opiekun</Text>
              <Text style={styles.cardDescription}>
                Chcę pomagać moim bliskim w przyjmowaniu leków i zarządzać ich harmonogramem.
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={28} color={Theme.colors.textLight} />
          </Pressable>

          <Pressable 
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed, styles.cardDependent]}
            onPress={() => updateAndNavigate('DEPENDENT')}
          >
            <View style={[styles.iconWrapper, { backgroundColor: Theme.colors.surfaceWhite }]}>
              <MaterialIcons name="elderly" size={40} color={Theme.colors.accentOrange} />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Podopieczny</Text>
              <Text style={styles.cardDescription}>
                Będę korzystać z aplikacji, aby pamiętać o swoich lekach i wizytach.
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
  cardDependent: {
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
