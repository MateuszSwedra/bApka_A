import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Theme } from '../../../constants/theme';
import { TREATMENT_VISUAL } from '../../../constants/treatmentVisuals';
import { useMeds } from '../../../context/MedsContext';

export default function EditTreatmentScreen() {
  const params = useLocalSearchParams<{ treatmentId: string }>();
  const treatmentId = Array.isArray(params.treatmentId) ? params.treatmentId[0] : params.treatmentId;

  const { treatments, updateTreatment } = useMeds();

  const existing = useMemo(
    () => treatments.find(t => t.id === treatmentId),
    [treatments, treatmentId]
  );

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pillsStr, setPillsStr] = useState('');

  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setDescription(existing.description ?? '');
    setPillsStr(
      existing.type === 'MEDICATION' && typeof existing.totalPills === 'number'
        ? String(existing.totalPills)
        : ''
    );
  }, [existing]);

  const vis = existing ? TREATMENT_VISUAL[existing.type] : null;

  const canSave = () => {
    if (!existing) return false;
    if (!name.trim()) return false;
    if (existing.type === 'MEDICATION') {
      const pills = parseInt(pillsStr.replace(/[^0-9]/g, ''), 10);
      if (!pills || pills <= 0) return false;
    }
    return true;
  };

  const handleSave = () => {
    if (!existing || !canSave()) return;
    const pills = parseInt(pillsStr.replace(/[^0-9]/g, ''), 10);
    updateTreatment(existing.id, {
      name: name.trim(),
      description: description.trim() || undefined,
      totalPills: existing.type === 'MEDICATION' ? pills : undefined,
    });
    router.back();
  };

  if (!treatmentId) {
    return null;
  }

  if (!existing || !vis) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.muted}>Nie znaleziono aktywności.</Text>
        <Pressable onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.saveBtnText}>Wróć</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <MaterialIcons name="close" size={28} color={Theme.colors.textDark} />
        </Pressable>
        <Text style={styles.headerTitle}>Edytuj</Text>
        <Pressable onPress={handleSave} style={styles.saveBtn} disabled={!canSave()}>
          <Text style={[styles.saveBtnText, !canSave() && { color: Theme.colors.textLight }]}>
            Zapisz
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.typePill}>
          <View style={[styles.typeIconCircle, { backgroundColor: vis.accent + '22' }]}>
            <MaterialIcons name={vis.icon} size={22} color={vis.accent} />
          </View>
          <Text style={styles.typePillText}>{vis.groupLabel}</Text>
        </View>

        <Text style={styles.label}>Nazwa</Text>
        <TextInput
          style={styles.textInput}
          value={name}
          onChangeText={setName}
          placeholderTextColor={Theme.colors.border}
        />

        {existing.type === 'MEDICATION' && (
          <>
            <Text style={styles.label}>Ilość tabletek w paczce</Text>
            <TextInput
              style={styles.textInput}
              placeholder="np. 60"
              value={pillsStr}
              onChangeText={setPillsStr}
              keyboardType="number-pad"
              placeholderTextColor={Theme.colors.border}
            />
          </>
        )}

        <Text style={styles.label}>Opis (opcjonalny)</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          placeholder="np. wskazówki dla seniora"
          value={description}
          onChangeText={setDescription}
          placeholderTextColor={Theme.colors.border}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.colors.background,
  },
  muted: {
    color: Theme.colors.textLight,
  },
  backLink: {
    marginTop: Theme.spacing.m,
    padding: Theme.spacing.s,
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
    flex: 1,
    textAlign: 'center',
    fontSize: Theme.typography.title,
    fontWeight: '800',
    color: Theme.colors.textDark,
  },
  iconBtn: {
    padding: 8,
    width: 44,
  },
  saveBtn: {
    padding: 8,
    width: 60,
    alignItems: 'flex-end',
  },
  saveBtnText: {
    color: Theme.colors.primaryLimeDark,
    fontWeight: '800',
    fontSize: Theme.typography.body,
  },
  content: {
    paddingHorizontal: Theme.spacing.l,
    paddingBottom: Theme.spacing.xxl,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Theme.colors.surfaceGrey,
    paddingHorizontal: Theme.spacing.m,
    paddingVertical: 8,
    borderRadius: Theme.borderRadius.round,
    marginBottom: Theme.spacing.l,
  },
  typeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.s,
  },
  typePillText: {
    fontSize: Theme.typography.caption,
    fontWeight: '700',
    color: Theme.colors.textDark,
  },
  label: {
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '700',
    color: Theme.colors.textLight,
    marginTop: Theme.spacing.l,
    marginBottom: Theme.spacing.s,
  },
  textInput: {
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    paddingVertical: Theme.spacing.s,
    fontSize: Theme.typography.body,
    color: Theme.colors.textDark,
  },
  textArea: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.medium,
    padding: Theme.spacing.m,
  },
});
