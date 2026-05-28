import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, Pressable, Platform } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Theme } from '../constants/theme';
import { OnboardingPalette } from '../constants/onboardingTheme';
import { useAuth } from '../context/AuthContext';
import { usersAPI } from '../services/api';
import * as SecureStore from 'expo-secure-store';
import { useTranslation } from 'react-i18next';

export default function RoleSelectionScreen() {
  const { t } = useTranslation();
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

      if (role === 'DEPENDENT') {
        router.replace('/senior-type');
      } else {
        router.replace('/profile-ready');
      }
    } catch (e) {
      if (Platform.OS === 'web') {
        window.alert(`${t('common.error')}: ${t('role.errorUpdate')}`);
      } else {
        Alert.alert(t('common.error'), t('role.errorUpdate'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="account-circle" size={64} color={OnboardingPalette.navy} />
        <Text style={styles.title}>{t('role.title')}</Text>
        <Text style={styles.subtitle}>{t('role.subtitle')}</Text>
      </View>
      
      {isLoading ? (
        <ActivityIndicator size="large" color={OnboardingPalette.navy} style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.cardsContainer}>
          <Pressable 
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => updateAndNavigate('CARETAKER')}
          >
            <View style={[styles.iconWrapper, { backgroundColor: OnboardingPalette.background }]}>
              <MaterialIcons name="favorite" size={40} color={OnboardingPalette.navy} />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{t('role.caretaker.title')}</Text>
              <Text style={styles.cardDescription}>{t('role.caretaker.desc')}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={28} color={OnboardingPalette.textSecondary} />
          </Pressable>

          <Pressable 
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed, styles.cardDependent]}
            onPress={() => updateAndNavigate('DEPENDENT')}
          >
            <View style={[styles.iconWrapper, { backgroundColor: OnboardingPalette.background }]}>
              <MaterialIcons name="elderly" size={40} color={OnboardingPalette.orange} />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{t('role.dependent.title')}</Text>
              <Text style={styles.cardDescription}>{t('role.dependent.desc')}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={28} color={OnboardingPalette.textSecondary} />
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
    backgroundColor: OnboardingPalette.background,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Theme.spacing.xxl,
  },
  title: {
    fontSize: Theme.typography.largeTitle,
    fontWeight: 'bold',
    color: OnboardingPalette.textPrimary,
    marginTop: Theme.spacing.m,
    marginBottom: Theme.spacing.xs,
  },
  subtitle: {
    fontSize: Theme.typography.body,
    color: OnboardingPalette.textPrimary,
    textAlign: 'center',
    opacity: 0.65,
  },
  cardsContainer: {
    gap: Theme.spacing.l,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: OnboardingPalette.surface,
    padding: Theme.spacing.l,
    borderRadius: Theme.borderRadius.large,
    borderWidth: 2,
    borderColor: OnboardingPalette.navy,
    shadowColor: Theme.colors.shadowNeutral,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardDependent: {
    borderColor: OnboardingPalette.orange,
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
    shadowColor: Theme.colors.shadowNeutral,
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
    color: OnboardingPalette.textPrimary,
    marginBottom: Theme.spacing.xs,
  },
  cardDescription: {
    fontSize: Theme.typography.small,
    color: OnboardingPalette.textPrimary,
    lineHeight: 20,
    opacity: 0.7,
  }
});
