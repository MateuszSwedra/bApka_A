import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { router, useGlobalSearchParams, useLocalSearchParams, useSegments } from 'expo-router';
import { pickDependentUserId } from '../../../utils/resolveMedsTargetUserId';
import { debugLog } from '../../../utils/debugLog';
import { MaterialIcons } from '@expo/vector-icons';
import { Theme } from '../../../constants/theme';
import { useMeds } from '../../../context/MedsContext';
import { TreatmentType } from '../../../constants/treatmentVisuals';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

interface TypeOption {
  type: TreatmentType;
  label: string;
  defaultName: string;
  icon: IconName;
  accent: string;
  hint: string;
}

const TYPE_OPTIONS: TypeOption[] = [
  {
    type: 'MEDICATION',
    label: 'Leki',
    defaultName: '',
    icon: 'medication',
    accent: Theme.colors.primaryLimeDark,
    hint: 'np. „Przyjmować po posiłku, popić wodą"',
  },
  {
    type: 'BLOOD_SUGAR',
    label: 'Badanie cukru',
    defaultName: 'Pomiar poziomu cukru',
    icon: 'water-drop',
    accent: '#C0392B',
    hint: 'np. „Na czczo, palec serdeczny"',
  },
  {
    type: 'BLOOD_PRESSURE',
    label: 'Mierzenie ciśnienia',
    defaultName: 'Pomiar ciśnienia krwi',
    icon: 'monitor-heart',
    accent: '#8E44AD',
    hint: 'np. „Po 5 min odpoczynku, w pozycji siedzącej"',
  },
  {
    type: 'EXERCISE',
    label: 'Ćwiczenia',
    defaultName: 'Ćwiczenia',
    icon: 'directions-run',
    accent: '#27AE60',
    hint: 'np. „15 min spaceru wokół bloku"',
  },
  {
    type: 'CUSTOM',
    label: 'Własna aktywność',
    defaultName: '',
    icon: 'stars',
    accent: Theme.colors.accentOrange,
    hint: 'Wpisz dowolną aktywność i opis',
  },
];

export default function AddTreatmentScreen() {
  const localParams = useLocalSearchParams<{
    dependentId?: string;
    id?: string;
  }>();
  const globalParams = useGlobalSearchParams<{
    dependentId?: string;
    id?: string;
  }>();
  const segments = useSegments();
  const { addTreatment, targetUserId } = useMeds();

  const dependentUserId = useMemo(
    () =>
      pickDependentUserId({
        localDependentId: localParams.dependentId,
        localId: localParams.id,
        globalDependentId: globalParams.dependentId,
        globalId: globalParams.id,
        segments: segments as string[],
        contextUserId: targetUserId,
      }),
    [
      localParams.dependentId,
      localParams.id,
      globalParams.dependentId,
      globalParams.id,
      segments,
      targetUserId,
    ],
  );
  const [selectedType, setSelectedType] = useState<TreatmentType | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pillsStr, setPillsStr] = useState('');

  const currentOption = useMemo(
    () => TYPE_OPTIONS.find(o => o.type === selectedType) ?? null,
    [selectedType]
  );

  const handleSelectType = (option: TypeOption) => {
    setSelectedType(option.type);
    setName(option.defaultName);
    setDescription('');
    setPillsStr('');
  };

  const handleBackToTypes = () => {
    setSelectedType(null);
    setName('');
    setDescription('');
    setPillsStr('');
  };

  const canSave = () => {
    if (!currentOption) return false;
    if (!name.trim()) return false;
    if (currentOption.type === 'MEDICATION') {
      const pills = parseInt(pillsStr.replace(/[^0-9]/g, ''));
      if (!pills || pills <= 0) return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!currentOption || !canSave() || !dependentUserId) return;
    debugLog(
      'add-treatment:handleSave',
      'before addTreatment',
      {
        dependentUserId,
        localDependentId: localParams.dependentId,
        globalDependentId: globalParams.dependentId,
        targetUserId,
        segments: segments as string[],
      },
      'H-A',
    );
    if (!dependentUserId) {
      Alert.alert(
        'Błąd',
        'Nie udało się ustalić profilu podopiecznego. Wróć do listy podopiecznych i otwórz profil ponownie.',
      );
      return;
    }
    const pills = parseInt(pillsStr.replace(/[^0-9]/g, ''));
    try {
      await addTreatment(
        {
          type: currentOption.type,
          name: name.trim(),
          description: description.trim() || undefined,
          totalPills: currentOption.type === 'MEDICATION' ? pills : undefined,
        },
        dependentUserId,
      );
      router.back();
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : 'Nie udało się dodać aktywności. Sprawdź połączenie z serwerem.';
      Alert.alert('Błąd', msg);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Pressable
          onPress={() => (currentOption ? handleBackToTypes() : router.back())}
          style={styles.iconBtn}
        >
          <MaterialIcons
            name={currentOption ? 'arrow-back' : 'close'}
            size={28}
            color={Theme.colors.textDark}
          />
        </Pressable>
        <Text style={styles.headerTitle}>
          {currentOption ? currentOption.label : 'Nowa aktywność'}
        </Text>
        {currentOption ? (
          <Pressable onPress={handleSave} style={styles.saveBtn} disabled={!canSave()}>
            <Text
              style={[styles.saveBtnText, !canSave() && { color: Theme.colors.textLight }]}
            >
              Zapisz
            </Text>
          </Pressable>
        ) : (
          <View style={styles.saveBtn} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {!currentOption ? (
          <>
            <Text style={styles.lead}>
              Wybierz rodzaj aktywności, którą chcesz dodać podopiecznemu.
            </Text>
            {TYPE_OPTIONS.map(option => (
              <Pressable
                key={option.type}
                onPress={() => handleSelectType(option)}
                style={({ pressed }) => [
                  styles.typeCard,
                  pressed && styles.typeCardPressed,
                ]}
              >
                <View
                  style={[styles.typeIconCircle, { backgroundColor: option.accent + '22' }]}
                >
                  <MaterialIcons name={option.icon} size={26} color={option.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.typeLabel}>{option.label}</Text>
                  <Text style={styles.typeHint}>{option.hint}</Text>
                </View>
                <MaterialIcons
                  name="chevron-right"
                  size={24}
                  color={Theme.colors.textLight}
                />
              </Pressable>
            ))}
          </>
        ) : (
          <>
            <View style={styles.selectedTypePill}>
              <View
                style={[
                  styles.typeIconCircle,
                  { backgroundColor: currentOption.accent + '22', marginRight: Theme.spacing.s },
                ]}
              >
                <MaterialIcons
                  name={currentOption.icon}
                  size={22}
                  color={currentOption.accent}
                />
              </View>
              <Text style={styles.selectedTypeText}>{currentOption.label}</Text>
            </View>

            <Text style={styles.label}>Nazwa</Text>
            <TextInput
              style={styles.textInput}
              placeholder={
                currentOption.type === 'CUSTOM'
                  ? 'np. Rehabilitacja kolana'
                  : currentOption.type === 'MEDICATION'
                  ? 'np. Acard 75mg'
                  : 'np. Pomiar poranny'
              }
              value={name}
              onChangeText={setName}
              placeholderTextColor={Theme.colors.border}
            />

            {currentOption.type === 'MEDICATION' && (
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
              placeholder={currentOption.hint}
              value={description}
              onChangeText={setDescription}
              placeholderTextColor={Theme.colors.border}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Text style={styles.helper}>
              Opisz szczegóły aktywności, by senior wiedział jak ją wykonać
              (np. przy lekach kiedy i jak je przyjmować).
            </Text>
          </>
        )}
      </ScrollView>
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
  lead: {
    fontSize: Theme.typography.body,
    color: Theme.colors.textLight,
    marginBottom: Theme.spacing.l,
    lineHeight: 22,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceWhite,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.large,
    padding: Theme.spacing.m,
    marginBottom: Theme.spacing.s,
  },
  typeCardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  typeIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.m,
  },
  typeLabel: {
    fontSize: Theme.typography.body,
    fontWeight: '700',
    color: Theme.colors.textDark,
  },
  typeHint: {
    marginTop: 2,
    fontSize: Theme.typography.caption,
    color: Theme.colors.textLight,
  },
  selectedTypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Theme.colors.surfaceGrey,
    paddingHorizontal: Theme.spacing.s,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.round,
    marginBottom: Theme.spacing.m,
  },
  selectedTypeText: {
    fontSize: Theme.typography.caption,
    color: Theme.colors.textDark,
    fontWeight: '700',
    paddingRight: Theme.spacing.s,
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
  helper: {
    marginTop: Theme.spacing.s,
    fontSize: Theme.typography.caption,
    color: Theme.colors.textLight,
    lineHeight: 18,
  },
});
