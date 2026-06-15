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
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getScreenBottomPadding } from '../../../utils/safeAreaInsets';
import { HugeButton } from '../../../components/HugeButton';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

const TYPE_I18N_KEY: Record<TreatmentType, string> = {
  MEDICATION: 'medication',
  BLOOD_SUGAR: 'bloodSugar',
  BLOOD_PRESSURE: 'bloodPressure',
  EXERCISE: 'exercise',
  CUSTOM: 'custom',
};

interface TypeOption {
  type: TreatmentType;
  label: string;
  defaultName: string;
  icon: IconName;
  accent: string;
  hint: string;
}

const TYPE_OPTION_META: Omit<TypeOption, 'label' | 'defaultName' | 'hint'>[] = [
  {
    type: 'MEDICATION',
    icon: 'medication',
    accent: Theme.colors.primaryLimeDark,
  },
  {
    type: 'BLOOD_SUGAR',
    icon: 'water-drop',
    accent: '#C0392B',
  },
  {
    type: 'BLOOD_PRESSURE',
    icon: 'monitor-heart',
    accent: '#8E44AD',
  },
  {
    type: 'EXERCISE',
    icon: 'directions-run',
    accent: '#27AE60',
  },
  {
    type: 'CUSTOM',
    icon: 'stars',
    accent: Theme.colors.accentOrange,
  },
];

export default function AddTreatmentScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const bottomPadding = getScreenBottomPadding(insets.bottom, Theme.spacing.m);
  const typeOptions: TypeOption[] = useMemo(
    () =>
      TYPE_OPTION_META.map(meta => {
        const key = TYPE_I18N_KEY[meta.type];
        return {
          ...meta,
          label: t(`treatment.type.${key}.label`),
          defaultName: t(`treatment.type.${key}.defaultName`),
          hint: t(`treatment.type.${key}.hint`),
        };
      }),
    [t],
  );
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
    () => typeOptions.find(o => o.type === selectedType) ?? null,
    [selectedType, typeOptions],
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
      Alert.alert(t('common.error'), t('errors.invalidDependentProfile'));
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
        e instanceof Error ? e.message : t('treatment.add.errorSave');
      Alert.alert(t('common.error'), msg);
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
          {currentOption ? currentOption.label : t('treatment.add.title')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: currentOption ? bottomPadding + 80 : bottomPadding },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {!currentOption ? (
          <>
            <Text style={styles.lead}>{t('treatment.add.lead')}</Text>
            {typeOptions.map(option => (
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

            <Text style={styles.label}>{t('treatment.add.name')}</Text>
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
                <Text style={styles.label}>{t('treatment.add.pillsInPack')}</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder={t('treatment.edit.placeholderPills')}
                  value={pillsStr}
                  onChangeText={setPillsStr}
                  keyboardType="number-pad"
                  placeholderTextColor={Theme.colors.border}
                />
              </>
            )}

            <Text style={styles.label}>{t('treatment.add.description')}</Text>
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
            <Text style={styles.helper}>{t('treatment.add.helper')}</Text>
          </>
        )}
      </ScrollView>

      {currentOption ? (
        <View style={[styles.footer, { paddingBottom: bottomPadding }]}>
          <HugeButton
            title={t('common.save')}
            onPress={() => void handleSave()}
            disabled={!canSave()}
            style={styles.saveBtn}
          />
        </View>
      ) : null}
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
  headerSpacer: {
    width: 44,
  },
  footer: {
    paddingHorizontal: Theme.spacing.l,
    paddingTop: Theme.spacing.m,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Theme.colors.border,
    backgroundColor: Theme.colors.background,
  },
  saveBtn: {
    width: '100%',
    minHeight: 56,
  },
  content: {
    paddingHorizontal: Theme.spacing.l,
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
