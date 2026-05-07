import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { HugeButton } from '../components/HugeButton';
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
      
      const token = await SecureStore.getItemAsync('userToken');
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
      Alert.alert('Błąd', 'Nie udało się zaktualizować roli na serwerze.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCaretaker = () => updateAndNavigate('CARETAKER');
  const handleDependent = () => updateAndNavigate('DEPENDENT');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kim jesteś?</Text>
      
      {isLoading ? (
        <ActivityIndicator size="large" color={Theme.colors.primaryLimeDark} />
      ) : (
        <View style={styles.buttonsContainer}>
          <HugeButton 
            title="OPIEKUN" 
            size="huge" 
            onPress={handleCaretaker} 
            style={styles.button}
          />
          
          <HugeButton 
            title="PODOPIECZNY" 
            size="huge" 
            variant="success"
            onPress={handleDependent} 
            style={styles.button}
          />
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
  title: {
    fontSize: Theme.typography.largeTitle,
    fontWeight: 'bold',
    color: Theme.colors.text,
    textAlign: 'center',
    marginBottom: Theme.spacing.xxl,
  },
  buttonsContainer: {
    gap: Theme.spacing.xl,
  },
  button: {
    marginBottom: Theme.spacing.l,
  }
});
