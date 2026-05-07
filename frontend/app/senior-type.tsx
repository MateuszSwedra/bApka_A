import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { HugeButton } from '../components/HugeButton';
import { Theme } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

export default function SeniorTypeScreen() {
  const { loginFake } = useAuth();

  const handleWithCaretaker = () => {
    loginFake('DEPENDENT');
    router.replace('/(dependent)/pairing'); // Kierujemy do parowania PIN
  };

  const handleIndependent = () => {
    loginFake('HYBRID');
    router.replace('/(hybrid)');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Jak chcesz korzystać z aplikacji?</Text>
      
      <View style={styles.buttonsContainer}>
        <HugeButton 
          title="Z OPIEKUNEM" 
          size="huge" 
          onPress={handleWithCaretaker} 
          style={styles.button}
        />
        
        <HugeButton 
          title="SAMODZIELNY" 
          size="huge" 
          variant="success"
          onPress={handleIndependent} 
          style={styles.button}
        />
      </View>
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
