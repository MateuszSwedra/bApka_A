import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Switch, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/theme';

export default function DependentSettingsScreen() {
  const [countdown, setCountdown] = useState(10);
  const [colorblindMode, setColorblindMode] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [audioSignal, setAudioSignal] = useState('local');

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      router.back();
    }
  }, [countdown]);

  const handleResetCountdown = () => {
    setCountdown(10);
  };

  const confirmChange = (title: string, onConfirm: () => void) => {
    handleResetCountdown();
    Alert.alert('Potwierdzenie', `Czy na pewno chcesz zmienić: ${title}?`, [
      { text: 'Anuluj', style: 'cancel', onPress: handleResetCountdown },
      { text: 'Tak', onPress: () => { onConfirm(); handleResetCountdown(); } },
    ]);
  };

  const toggleColorblind = (value: boolean) => {
    confirmChange('Tryb dla daltonistów', () => setColorblindMode(value));
  };

  const toggleHighContrast = (value: boolean) => {
    confirmChange('Wysoki kontrast', () => setHighContrast(value));
  };

  const changeAudio = (type: string) => {
    if (type === audioSignal) return;
    confirmChange(`Sygnał dźwiękowy na ${type}`, () => setAudioSignal(type));
  };

  const getBackgroundColor = () => {
    if (highContrast) return '#000000';
    return Theme.colors.surfaceGrey;
  };

  const getTextColor = () => {
    if (highContrast) return '#FFFFFF';
    return Theme.colors.textDark;
  };

  return (
    <View style={[styles.container, { backgroundColor: getBackgroundColor() }]}>
      <View style={[styles.header, highContrast && { backgroundColor: '#111', borderBottomColor: '#333' }]}>
        <Text style={[styles.headerTitle, { color: getTextColor() }]}>Ustawienia</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} onScrollBeginDrag={handleResetCountdown}>
        <View style={styles.settingItem}>
          <Text style={[styles.settingText, { color: getTextColor() }]}>Tryb dla daltonistów</Text>
          <Switch value={colorblindMode} onValueChange={toggleColorblind} />
        </View>

        <View style={styles.settingItem}>
          <Text style={[styles.settingText, { color: getTextColor() }]}>Wysoki kontrast</Text>
          <Switch value={highContrast} onValueChange={toggleHighContrast} />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: getTextColor() }]}>Sygnał dźwiękowy</Text>
          {['lokalny', 'systemowy 1', 'systemowy 2', 'systemowy 3'].map((sig) => (
            <Pressable
              key={sig}
              style={[
                styles.radioBtn,
                audioSignal === sig && styles.radioBtnActive,
                highContrast && audioSignal === sig && { backgroundColor: '#444' }
              ]}
              onPress={() => changeAudio(sig)}
            >
              <MaterialIcons
                name={audioSignal === sig ? "radio-button-checked" : "radio-button-unchecked"}
                size={32}
                color={audioSignal === sig ? (highContrast ? '#FFF' : Theme.colors.primaryLimeDark) : getTextColor()}
              />
              <Text style={[
                styles.radioText,
                { color: getTextColor() },
                audioSignal === sig && { fontWeight: 'bold' }
              ]}>{sig.charAt(0).toUpperCase() + sig.slice(1)}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>POWRÓT ({countdown}s)</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Theme.spacing.l,
    paddingTop: Theme.spacing.xxl,
    paddingBottom: Theme.spacing.m,
    backgroundColor: Theme.colors.surfaceWhite,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Theme.typography.largeTitle,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: Theme.spacing.l,
    paddingBottom: 120,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Theme.spacing.l,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  settingText: {
    fontSize: Theme.typography.title,
    fontWeight: '600',
  },
  section: {
    marginTop: Theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: Theme.typography.title,
    fontWeight: 'bold',
    marginBottom: Theme.spacing.m,
  },
  radioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.m,
    paddingHorizontal: Theme.spacing.s,
    borderRadius: Theme.borderRadius.medium,
    marginBottom: Theme.spacing.s,
  },
  radioBtnActive: {
    backgroundColor: Theme.colors.badgeSuccessBackground,
  },
  radioText: {
    fontSize: Theme.typography.title,
    marginLeft: Theme.spacing.m,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Theme.spacing.l,
    backgroundColor: 'transparent',
  },
  backBtn: {
    backgroundColor: Theme.colors.primaryLimeDark,
    paddingVertical: Theme.spacing.xl,
    borderRadius: Theme.borderRadius.xlarge,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  backBtnText: {
    color: Theme.colors.surfaceWhite,
    fontSize: Theme.typography.largeTitle,
    fontWeight: '900',
  }
});
