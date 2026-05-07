import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Theme } from '../../../constants/theme';
import { useMeds } from '../../../context/MedsContext';

export default function AddInventoryScreen() {
  const { addInventoryItem } = useMeds();
  const [name, setName] = useState('');
  const [pillsStr, setPillsStr] = useState('');

  const handleSave = () => {
    const pills = parseInt(pillsStr.replace(/[^0-9]/g, ''));
    if (name && pills > 0) {
      addInventoryItem(name, pills);
      router.back();
    } else {
      alert('Wpisz nazwę i poprawną ilość tabletek.');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <MaterialIcons name="close" size={28} color={Theme.colors.textDark} />
        </Pressable>
        <Text style={styles.headerTitle}>Dodaj Zapas</Text>
        <Pressable onPress={handleSave} style={styles.saveBtn} disabled={!name || !pillsStr}>
          <Text style={[styles.saveBtnText, (!name || !pillsStr) && { color: Theme.colors.textLight }]}>Zapisz</Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>Nazwa leku</Text>
        <TextInput 
          style={styles.textInput} 
          placeholder="np. Ibuprom, Witamina C..."
          value={name}
          onChangeText={setName}
          placeholderTextColor={Theme.colors.border}
        />

        <Text style={styles.label}>Ilość tabletek w paczce</Text>
        <TextInput 
          style={styles.textInput} 
          placeholder="np. 60"
          value={pillsStr}
          onChangeText={setPillsStr}
          keyboardType="number-pad"
          placeholderTextColor={Theme.colors.border}
        />
        <Text style={styles.hint}>Ten lek pojawi się w zakładce "Meds", gdzie będziesz mógł go wybrać i przypisać do harmonogramu w Kalendarzu.</Text>
      </View>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Theme.spacing.l,
    paddingTop: Theme.spacing.xxl,
    backgroundColor: Theme.colors.background,
  },
  headerTitle: {
    fontSize: Theme.typography.title,
    fontWeight: '800',
    color: Theme.colors.textDark,
  },
  iconBtn: {
    padding: 8,
  },
  saveBtn: {
    padding: 8,
  },
  saveBtnText: {
    color: Theme.colors.primaryLimeDark,
    fontWeight: '800',
    fontSize: Theme.typography.body,
  },
  content: {
    padding: Theme.spacing.l,
  },
  label: {
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '700',
    color: Theme.colors.textLight,
    marginTop: Theme.spacing.xl,
    marginBottom: Theme.spacing.s,
  },
  textInput: {
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    paddingVertical: Theme.spacing.m,
    fontSize: Theme.typography.largeTitle,
    color: Theme.colors.textDark,
    fontWeight: '400',
  },
  hint: {
    marginTop: Theme.spacing.m,
    fontSize: Theme.typography.caption,
    color: Theme.colors.textLight,
    lineHeight: 20,
  }
});
