import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, Platform, KeyboardAvoidingView, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Theme } from '../constants/theme';
import { OnboardingPalette } from '../constants/onboardingTheme';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}: ${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setUserSession, userRole, isReady } = useAuth();

  // Ominięcie logowania jeśli user posiada już ważną sesję
  useEffect(() => {
    if (isReady && userRole) {
      if (userRole === 'CARETAKER') {
        router.replace('/(caretaker)');
      } else if (userRole === 'DEPENDENT') {
        router.replace('/(dependent)');
      } else if (userRole === 'HYBRID') {
        router.replace('/(hybrid)');
      } else {
        router.replace('/role-selection');
      }
    }
  }, [isReady, userRole]);

  const handleLogin = async () => {
    if (!email || !password) {
      showAlert('Błąd', 'Wpisz email i hasło');
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await authAPI.login({ email, password });
      await setUserSession(response.access_token, response.user.role);
    } catch (error) {
      showAlert('Błąd logowania', 'Nieprawidłowy e-mail lub hasło');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !password) {
      showAlert('Błąd', 'Wpisz email i hasło');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authAPI.register({ email, password });
      // Zapisujemy sam token, żeby upewnić się, że nie przerzuci nas od razu do panelu podopiecznego
      if (Platform.OS === 'web') {
        localStorage.setItem('userToken', response.access_token);
        localStorage.removeItem('userRole');
      } else {
        await SecureStore.setItemAsync('userToken', response.access_token);
        await SecureStore.deleteItemAsync('userRole');
      }
      
      router.replace('/role-selection');
    } catch (error: any) {
      showAlert('Błąd rejestracji', 'Użytkownik już istnieje lub dane są niepoprawne.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <MaterialIcons name="medical-services" size={48} color={OnboardingPalette.surface} />
          </View>
          <Text style={styles.logoText}>bApka</Text>
          <Text style={styles.subtitle}>Zdrowie pod pełną kontrolą</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Zaloguj się</Text>
          
          <View style={styles.inputContainer}>
            <MaterialIcons name="email" size={24} color={OnboardingPalette.textSecondary} style={styles.inputIcon} />
            <TextInput 
              style={styles.input} 
              placeholder="Adres E-mail" 
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={OnboardingPalette.textSecondary}
            />
          </View>

          <View style={styles.inputContainer}>
            <MaterialIcons name="lock" size={24} color={OnboardingPalette.textSecondary} style={styles.inputIcon} />
            <TextInput 
              style={styles.input} 
              placeholder="Hasło" 
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              placeholderTextColor={OnboardingPalette.textSecondary}
            />
          </View>

          <Pressable
            onPress={handleLogin}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
              isLoading && { opacity: 0.6 },
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {isLoading ? 'ŁADOWANIE...' : 'ZALOGUJ SIĘ'}
            </Text>
          </Pressable>

          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.or}>LUB</Text>
            <View style={styles.divider} />
          </View>

          <Pressable
            onPress={handleRegister}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
              isLoading && { opacity: 0.6 },
            ]}
          >
            <Text style={styles.secondaryButtonText}>ZAREJESTRUJ NOWE KONTO</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: OnboardingPalette.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Theme.spacing.l,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Theme.spacing.xxl,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: OnboardingPalette.navy,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.m,
    shadowColor: OnboardingPalette.navy,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  logoText: {
    fontSize: Theme.typography.huge,
    fontWeight: '900',
    color: OnboardingPalette.textPrimary,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: Theme.typography.body,
    color: OnboardingPalette.textPrimary,
    marginTop: Theme.spacing.xs,
    fontWeight: '500',
    opacity: 0.65,
  },
  card: {
    backgroundColor: OnboardingPalette.surface,
    borderRadius: Theme.borderRadius.xlarge,
    padding: Theme.spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 4,
  },
  cardTitle: {
    fontSize: Theme.typography.title,
    fontWeight: 'bold',
    color: OnboardingPalette.textPrimary,
    marginBottom: Theme.spacing.l,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: OnboardingPalette.background,
    borderRadius: Theme.borderRadius.medium,
    marginBottom: Theme.spacing.m,
    paddingHorizontal: Theme.spacing.m,
    borderWidth: 1,
    borderColor: OnboardingPalette.border,
  },
  inputIcon: {
    marginRight: Theme.spacing.s,
  },
  input: {
    flex: 1,
    paddingVertical: Theme.spacing.m,
    fontSize: Theme.typography.body,
    color: OnboardingPalette.textPrimary,
  },
  primaryButton: {
    marginTop: Theme.spacing.m,
    backgroundColor: OnboardingPalette.navy,
    borderRadius: Theme.borderRadius.round,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    shadowColor: OnboardingPalette.navy,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryButtonText: {
    color: OnboardingPalette.surface,
    fontSize: Theme.typography.title,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: Theme.borderRadius.round,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    borderWidth: 2,
    borderColor: OnboardingPalette.orange,
  },
  secondaryButtonText: {
    color: OnboardingPalette.textPrimary,
    fontSize: Theme.typography.title,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Theme.spacing.l,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: OnboardingPalette.border,
  },
  or: {
    marginHorizontal: Theme.spacing.m,
    color: OnboardingPalette.textPrimary,
    fontSize: Theme.typography.small,
    fontWeight: 'bold',
    opacity: 0.5,
  },
});
