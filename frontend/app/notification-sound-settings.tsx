import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Theme } from '../constants/theme';
import {
  NOTIFICATION_SOUND_CHOICES,
  type NotificationSoundChoiceId,
  resolveMedicationSoundAsset,
  resolveSosSoundAsset,
} from '../constants/notificationSounds';
import { useAuth } from '../context/AuthContext';
import {
  getMedicationSoundChoice,
  getSosSoundChoice,
  setMedicationSoundChoice,
  setSosSoundChoice,
} from '../services/notificationSoundPreferences';
import { previewNotificationAsset } from '../services/notificationSoundPreview';

function exitSettings(userRole: string | null) {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  if (userRole === 'CARETAKER') router.replace('/(caretaker)');
  else if (userRole === 'DEPENDENT') router.replace('/(dependent)');
  else if (userRole === 'HYBRID') router.replace('/(hybrid)');
  else router.replace('/login');
}

export default function NotificationSoundSettingsScreen() {
  const { userRole } = useAuth();
  const [med, setMed] = useState<NotificationSoundChoiceId>('default');
  const [sos, setSos] = useState<NotificationSoundChoiceId>('default');
  const [loading, setLoading] = useState(true);
  const [previewKey, setPreviewKey] = useState<string | null>(null);

  const showSos = userRole === 'CARETAKER' || userRole === 'HYBRID';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, s] = await Promise.all([getMedicationSoundChoice(), getSosSoundChoice()]);
      setMed(m);
      setSos(s);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onSelectMed = async (id: NotificationSoundChoiceId) => {
    setMed(id);
    await setMedicationSoundChoice(id);
  };

  const onSelectSos = async (id: NotificationSoundChoiceId) => {
    setSos(id);
    await setSosSoundChoice(id);
  };

  const onPreviewMed = async (id: NotificationSoundChoiceId) => {
    const key = `med-${id}`;
    setPreviewKey(key);
    try {
      await previewNotificationAsset(resolveMedicationSoundAsset(id));
    } finally {
      setPreviewKey(null);
    }
  };

  const onPreviewSos = async (id: NotificationSoundChoiceId) => {
    const key = `sos-${id}`;
    setPreviewKey(key);
    try {
      await previewNotificationAsset(resolveSosSoundAsset(id));
    } finally {
      setPreviewKey(null);
    }
  };

  const renderGroup = (
    title: string,
    subtitle: string,
    value: NotificationSoundChoiceId,
    onSelect: (id: NotificationSoundChoiceId) => void,
    onPreview: (id: NotificationSoundChoiceId) => void,
    busyKey: 'med' | 'sos',
  ) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      {NOTIFICATION_SOUND_CHOICES.map((opt) => {
        const selected = value === opt.id;
        const rowPreviewKey = `${busyKey}-${opt.id}`;
        return (
          <View key={opt.id} style={styles.row}>
            <Pressable
              onPress={() => void onSelect(opt.id)}
              style={({ pressed }) => [
                styles.choice,
                selected && styles.choiceSelected,
                pressed && { opacity: 0.9 },
              ]}
            >
              <MaterialIcons
                name={selected ? 'radio-button-checked' : 'radio-button-unchecked'}
                size={22}
                color={selected ? Theme.colors.primaryLimeDark : Theme.colors.textLight}
              />
              <View style={styles.choiceText}>
                <Text style={styles.choiceLabel}>{opt.label}</Text>
                <Text style={styles.choiceDesc}>{opt.description}</Text>
              </View>
            </Pressable>
            <Pressable
              onPress={() => void onPreview(opt.id)}
              style={({ pressed }) => [styles.previewBtn, pressed && { opacity: 0.75 }]}
              accessibilityLabel={`Odsłuchaj: ${opt.label}`}
              disabled={previewKey !== null}
            >
              {previewKey === rowPreviewKey ? (
                <ActivityIndicator size="small" color={Theme.colors.primaryLimeDark} />
              ) : (
                <MaterialIcons name="volume-up" size={22} color={Theme.colors.primaryLimeDark} />
              )}
            </Pressable>
          </View>
        );
      })}
    </View>
  );

  return (
    <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {loading ? (
            <ActivityIndicator size="large" color={Theme.colors.primaryLimeDark} style={{ marginTop: 40 }} />
          ) : (
            <>
              {renderGroup(
                'Przypomnienie o leku',
                userRole === 'DEPENDENT'
                  ? 'Wybierz dźwięk, który usłyszysz przy przypomnieniu o przyjęciu leku.'
                  : 'Dźwięk przypomnień dla podopiecznych (zapisany na tym urządzeniu).',
                med,
                onSelectMed,
                onPreviewMed,
                'med',
              )}
              {showSos &&
                renderGroup(
                  'Powiadomienie SOS',
                  'Osobny dźwięk dla alarmu SOS od podopiecznego.',
                  sos,
                  onSelectSos,
                  onPreviewSos,
                  'sos',
                )}
              {Platform.OS === 'web' && (
                <Text style={styles.webHint}>
                  W przeglądarce podgląd dźwięku może być ograniczony — pełną obsługę mają aplikacje na Androidzie i iOS.
                </Text>
              )}
            </>
          )}
        </ScrollView>
        <Pressable
          style={({ pressed }) => [styles.doneBtn, pressed && { opacity: 0.9 }]}
          onPress={() => exitSettings(userRole)}
        >
          <Text style={styles.doneBtnText}>Gotowe</Text>
        </Pressable>
      </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Theme.colors.surfaceGrey,
  },
  scroll: {
    padding: Theme.spacing.l,
    paddingBottom: Theme.spacing.xxl,
  },
  section: {
    marginBottom: Theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: Theme.typography.title,
    fontWeight: '700',
    color: Theme.colors.textDark,
    marginBottom: Theme.spacing.xs,
  },
  sectionSubtitle: {
    fontSize: Theme.typography.caption,
    color: Theme.colors.textLight,
    marginBottom: Theme.spacing.m,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.s,
  },
  choice: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Theme.colors.surfaceWhite,
    borderRadius: Theme.borderRadius.large,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.m,
    marginRight: Theme.spacing.s,
  },
  choiceSelected: {
    borderColor: Theme.colors.primaryLimeDark,
    backgroundColor: Theme.colors.primaryLime,
  },
  choiceText: {
    flex: 1,
    marginLeft: Theme.spacing.s,
  },
  choiceLabel: {
    fontSize: Theme.typography.body,
    fontWeight: '600',
    color: Theme.colors.textDark,
  },
  choiceDesc: {
    fontSize: Theme.typography.small,
    color: Theme.colors.textLight,
    marginTop: 4,
    lineHeight: 18,
  },
  previewBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Theme.colors.surfaceWhite,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webHint: {
    fontSize: Theme.typography.small,
    color: Theme.colors.textLight,
    marginTop: Theme.spacing.m,
    fontStyle: 'italic',
  },
  doneBtn: {
    margin: Theme.spacing.l,
    paddingVertical: Theme.spacing.m,
    borderRadius: Theme.borderRadius.round,
    backgroundColor: Theme.colors.primaryLimeDark,
    alignItems: 'center',
  },
  doneBtnText: {
    color: Theme.colors.surfaceWhite,
    fontSize: Theme.typography.body,
    fontWeight: '700',
  },
});
