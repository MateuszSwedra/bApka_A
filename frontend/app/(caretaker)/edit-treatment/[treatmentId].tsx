import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Theme } from '../../../constants/theme';
import { TREATMENT_VISUAL } from '../../../constants/treatmentVisuals';
import { useMeds, Treatment } from '../../../context/MedsContext';
import { inventoryAPI } from '../../../services/api';
import type { TreatmentType } from '../../../constants/treatmentVisuals';
import { useTranslation } from 'react-i18next';
import { useScreenBottomPadding } from '../../../utils/safeAreaInsets';
import { getTreatmentGroupLabel } from '../../../i18n/treatmentLabels';
import { HugeButton } from '../../../components/HugeButton';

export default function EditTreatmentScreen() {
  const { t } = useTranslation();
  const bottomPadding = useScreenBottomPadding(Theme.spacing.l);
  const params = useLocalSearchParams<{ treatmentId: string }>();
  const treatmentId = Array.isArray(params.treatmentId) ? params.treatmentId[0] : params.treatmentId;

  const { treatments, updateTreatment, refetchFromServer } = useMeds();
  const [loaded, setLoaded] = useState<Treatment | null>(null);
  const [loading, setLoading] = useState(true);

  const existing = useMemo(
    () => treatments.find(t => t.id === treatmentId) ?? loaded,
    [treatments, treatmentId, loaded],
  );

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pillsStr, setPillsStr] = useState('');

  useFocusEffect(
    useCallback(() => {
      void refetchFromServer();
    }, [refetchFromServer]),
  );

  useEffect(() => {
    if (!treatmentId) {
      setLoading(false);
      return;
    }
    const fromList = treatments.find(t => t.id === treatmentId);
    if (fromList) {
      setLoaded(fromList);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const item = await inventoryAPI.getById(treatmentId);
        if (cancelled || !item) return;
        setLoaded({
          id: String(item.id),
          type: (item.type as TreatmentType) || 'MEDICATION',
          name: item.name,
          totalPills: item.totalPills,
          description: item.description,
        });
      } catch {
        if (!cancelled) setLoaded(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [treatmentId, treatments]);

  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setDescription(existing.description ?? '');
    setPillsStr(
      existing.type === 'MEDICATION' && typeof existing.totalPills === 'number'
        ? String(existing.totalPills)
        : '',
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

  const handleSave = async () => {
    if (!existing || !canSave()) return;
    const pills = parseInt(pillsStr.replace(/[^0-9]/g, ''), 10);
    try {
      await updateTreatment(existing.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        totalPills: existing.type === 'MEDICATION' ? pills : undefined,
      });
      router.back();
    } catch {
      Alert.alert(t('common.error'), t('treatment.edit.errorSave'));
    }
  };

  if (!treatmentId) {
    return null;
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Theme.colors.primaryLimeDark} />
      </View>
    );
  }

  if (!existing || !vis) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.muted}>{t('treatment.edit.notFound')}</Text>
        <Pressable onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.saveBtnText}>{t('common.back')}</Text>
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
        <Text style={styles.headerTitle}>{t('treatment.edit.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.typePill}>
          <View style={[styles.typeIconCircle, { backgroundColor: vis.accent + '22' }]}>
            <MaterialIcons name={vis.icon} size={22} color={vis.accent} />
          </View>
          <Text style={styles.typePillText}>{getTreatmentGroupLabel(existing.type)}</Text>
        </View>

        <Text style={styles.label}>{t('treatment.add.name')}</Text>
        <TextInput
          style={styles.textInput}
          value={name}
          onChangeText={setName}
          placeholderTextColor={Theme.colors.border}
        />

        {existing.type === 'MEDICATION' && (
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
          placeholder={t('treatment.edit.placeholderHints')}
          value={description}
          onChangeText={setDescription}
          placeholderTextColor={Theme.colors.border}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: bottomPadding }]}>
        <HugeButton
          title={t('common.save')}
          onPress={() => void handleSave()}
          disabled={!canSave()}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.l,
  },
  muted: {
    fontSize: Theme.typography.body,
    color: Theme.colors.textLight,
    marginBottom: Theme.spacing.m,
  },
  backLink: {
    padding: Theme.spacing.m,
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
  scroll: {
    flex: 1,
  },
  saveBtnText: {
    color: Theme.colors.primaryLimeDark,
    fontWeight: '800',
    fontSize: Theme.typography.body,
  },
  content: {
    paddingHorizontal: Theme.spacing.l,
    paddingBottom: Theme.spacing.l,
  },
  footer: {
    paddingHorizontal: Theme.spacing.l,
    paddingTop: Theme.spacing.s,
    backgroundColor: Theme.colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Theme.colors.border,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Theme.colors.surfaceGrey,
    paddingHorizontal: Theme.spacing.s,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.round,
    marginBottom: Theme.spacing.m,
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
});
