import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { HugeButton } from '../components/HugeButton';
import { Theme } from '../constants/theme';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

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
      Alert.alert('Błąd', 'Wpisz email i hasło');
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await authAPI.login({ email, password });
      await setUserSession(response.access_token, response.user.role);
    } catch (error) {
      Alert.alert('Błąd logowania', 'Nieprawidłowy e-mail lub hasło');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !password) {
      Alert.alert('Błąd', 'Wpisz email i hasło');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authAPI.register({ email, password });
      await setUserSession(response.access_token, response.user.role);
      // Nowy użytkownik, przekierowanie do wyboru roli (zabezpieczone przez auth context if domyślnie dało DEPENDENT)
      router.replace('/role-selection');
    } catch (error: any) {
      Alert.alert('Błąd rejestracji', 'Użytkownik już istnieje lub dane są niepoprawne.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>bApka</Text>
      <Text style={styles.subtitle}>Zaloguj się, aby kontynuować</Text>

      <View style={styles.inputContainer}>
        <TextInput 
          style={styles.input} 
          placeholder="E-mail" 
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput 
          style={styles.input} 
          placeholder="Hasło" 
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
      </View>

      <HugeButton 
        title={isLoading ? "Ładowanie..." : "Zaloguj"} 
        onPress={handleLogin} 
        disabled={isLoading}
        style={styles.button} 
      />
      
      <Text style={styles.or}>LUB</Text>
      
      <HugeButton 
        title="Zarejestruj się" 
        onPress={handleRegister} 
        variant="outline" 
        disabled={isLoading}
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
  logo: {
    fontSize: Theme.typography.huge,
    fontWeight: 'bold',
    color: Theme.colors.primaryLimeDark,
    textAlign: 'center',
    marginBottom: Theme.spacing.s,
  },
  subtitle: {
    fontSize: Theme.typography.body,
    color: Theme.colors.textLight,
    textAlign: 'center',
    marginBottom: Theme.spacing.xl,
  },
  inputContainer: {
    marginBottom: Theme.spacing.l,
  },
  input: {
    backgroundColor: Theme.colors.surfaceWhite,
    padding: Theme.spacing.m,
    borderRadius: Theme.borderRadius.medium,
    marginBottom: Theme.spacing.m,
    fontSize: Theme.typography.body,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  button: {
    marginBottom: Theme.spacing.m,
  },
  or: {
    textAlign: 'center',
    marginVertical: Theme.spacing.s,
    color: Theme.colors.textLight,
    fontSize: Theme.typography.body,
  }
});
