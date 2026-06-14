import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../constants/theme';
import { FriendlyTimePicker } from './FriendlyTimePicker';
import { formatTimeParts, parseTimeParts } from '../TimeScrollPicker';

type Props = {
  savedTime: string;
  busy?: boolean;
  onSave: (time: string) => void;
};

export function MoodCheckTimesEditor({ savedTime, busy, onSave }: Props) {
  const { t } = useTranslation();
  const initial = parseTimeParts(savedTime);
  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);
  const [justSaved, setJustSaved] = useState(false);
  const prevSavedRef = useRef(savedTime);

  useEffect(() => {
    const parts = parseTimeParts(savedTime);
    setHour(parts.hour);
    setMinute(parts.minute);
  }, [savedTime]);

  useEffect(() => {
    if (prevSavedRef.current !== savedTime) {
      prevSavedRef.current = savedTime;
      setJustSaved(true);
    }
  }, [savedTime]);

  const draftTime = formatTimeParts(hour, minute);
  const isDirty = draftTime !== savedTime;

  const handleSave = () => {
    if (!isDirty || busy) return;
    onSave(draftTime);
  };

  const saveBtnStyle = isDirty
    ? styles.saveBtnDirty
    : justSaved
      ? styles.saveBtnSaved
      : styles.saveBtnIdle;

  const saveTextStyle = isDirty
    ? styles.saveBtnTextDirty
    : justSaved
      ? styles.saveBtnTextSaved
      : styles.saveBtnTextIdle;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t('caretaker.settings.moodTimesTitle')}</Text>
      <Text style={styles.hint}>{t('caretaker.settings.moodTimesHint')}</Text>

      <FriendlyTimePicker
        hour={hour}
        minute={minute}
        onHourChange={h => {
          setHour(h);
          setJustSaved(false);
        }}
        onMinuteChange={m => {
          setMinute(m);
          setJustSaved(false);
        }}
      />

      <Pressable
        disabled={!isDirty || busy}
        onPress={handleSave}
        style={({ pressed }) => [
          styles.saveBtn,
          saveBtnStyle,
          pressed && isDirty && styles.saveBtnPressed,
          (!isDirty || busy) && styles.saveBtnDisabled,
        ]}
        accessibilityLabel={t('caretaker.settings.moodTimesSave')}
      >
        {busy ? (
          <ActivityIndicator color={Theme.colors.surfaceWhite} />
        ) : (
          <>
            {justSaved && !isDirty ? (
              <MaterialIcons name="check" size={22} color={Theme.colors.primaryLimeDark} />
            ) : null}
            <Text style={saveTextStyle}>
              {justSaved && !isDirty
                ? t('caretaker.settings.moodTimesSaved')
                : t('caretaker.settings.moodTimesSave')}
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: Theme.colors.surfaceWhite,
    borderRadius: Theme.borderRadius.large,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.m,
    paddingBottom: Theme.spacing.s,
    marginBottom: Theme.spacing.m,
    marginTop: -Theme.spacing.xs,
  },
  title: {
    fontSize: Theme.typography.body,
    fontWeight: '700',
    color: Theme.colors.textDark,
  },
  hint: {
    marginTop: 4,
    marginBottom: Theme.spacing.xs,
    fontSize: Theme.typography.caption,
    color: Theme.colors.textLight,
    lineHeight: 20,
  },
  saveBtn: {
    marginTop: Theme.spacing.s,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.xs,
    paddingVertical: 14,
    borderRadius: Theme.borderRadius.medium,
    borderWidth: 2,
    minHeight: 48,
  },
  saveBtnIdle: {
    backgroundColor: Theme.colors.surfaceGrey,
    borderColor: Theme.colors.border,
  },
  saveBtnDirty: {
    backgroundColor: Theme.colors.primaryLimeDark,
    borderColor: Theme.colors.primaryLimeDark,
  },
  saveBtnSaved: {
    backgroundColor: Theme.colors.primaryLime + '55',
    borderColor: Theme.colors.primaryLimeDark,
  },
  saveBtnPressed: {
    opacity: 0.9,
  },
  saveBtnDisabled: {
    opacity: 0.85,
  },
  saveBtnTextIdle: {
    fontSize: Theme.typography.body,
    fontWeight: '700',
    color: Theme.colors.textLight,
  },
  saveBtnTextDirty: {
    fontSize: Theme.typography.body,
    fontWeight: '800',
    color: Theme.colors.surfaceWhite,
  },
  saveBtnTextSaved: {
    fontSize: Theme.typography.body,
    fontWeight: '700',
    color: Theme.colors.primaryLimeDark,
  },
});
