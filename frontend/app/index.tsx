import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { HugeButton } from '../components/HugeButton';
import { Theme } from '../constants/theme';
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
    console.log("Halo Expo! Adres API to:", process.env.EXPO_PUBLIC_API_URL);
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
            <MaterialIcons name="medical-services" size={48} color={Theme.colors.surfaceWhite} />
          </View>
          <Text style={styles.logoText}>bApka</Text>
          <Text style={styles.subtitle}>Zdrowie pod pełną kontrolą</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Zaloguj się</Text>
          
          <View style={styles.inputContainer}>
            <MaterialIcons name="email" size={24} color={Theme.colors.textLight} style={styles.inputIcon} />
            <TextInput 
              style={styles.input} 
              placeholder="Adres E-mail" 
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={Theme.colors.textLight}
            />
          </View>

          <View style={styles.inputContainer}>
            <MaterialIcons name="lock" size={24} color={Theme.colors.textLight} style={styles.inputIcon} />
            <TextInput 
              style={styles.input} 
              placeholder="Hasło" 
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              placeholderTextColor={Theme.colors.textLight}
            />
          </View>

          <HugeButton 
            title={isLoading ? "ŁADOWANIE..." : "ZALOGUJ SIĘ"} 
            onPress={handleLogin} 
            disabled={isLoading}
            style={styles.loginButton} 
          />
          
          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.or}>LUB</Text>
            <View style={styles.divider} />
          </View>
          
          <HugeButton 
            title="ZAREJESTRUJ NOWE KONTO" 
            onPress={handleRegister} 
            variant="outline" 
            disabled={isLoading}
            style={styles.registerButton} 
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.surfaceGrey,
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
    backgroundColor: Theme.colors.primaryLimeDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.m,
    shadowColor: Theme.colors.primaryLimeDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  logoText: {
    fontSize: Theme.typography.huge,
    fontWeight: '900',
    color: Theme.colors.textDark,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: Theme.typography.body,
    color: Theme.colors.textLight,
    marginTop: Theme.spacing.xs,
    fontWeight: '500',
  },
  card: {
    backgroundColor: Theme.colors.surfaceWhite,
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
    color: Theme.colors.textDark,
    marginBottom: Theme.spacing.l,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceGrey,
    borderRadius: Theme.borderRadius.medium,
    marginBottom: Theme.spacing.m,
    paddingHorizontal: Theme.spacing.m,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputIcon: {
    marginRight: Theme.spacing.s,
  },
  input: {
    flex: 1,
    paddingVertical: Theme.spacing.m,
    fontSize: Theme.typography.body,
    color: Theme.colors.textDark,
  },
  loginButton: {
    marginTop: Theme.spacing.m,
    borderRadius: Theme.borderRadius.round,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Theme.spacing.l,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: Theme.colors.border,
  },
  or: {
    marginHorizontal: Theme.spacing.m,
    color: Theme.colors.textLight,
    fontSize: Theme.typography.small,
    fontWeight: 'bold',
  },
  registerButton: {
    borderRadius: Theme.borderRadius.round,
  }
});
