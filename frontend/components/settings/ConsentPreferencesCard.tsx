import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../constants/theme';

type Colors = {
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  trackOn: string;
  trackOff: string;
};

type Props = {
  analytics: boolean;
  tailoredContent: boolean;
  busy?: boolean;
  onChangeAnalytics: (value: boolean) => void;
  onChangeTailored: (value: boolean) => void;
  colors?: Partial<Colors>;
};

const DEFAULT_COLORS: Colors = {
  surface: Theme.colors.surfaceWhite,
  border: Theme.colors.border,
  text: Theme.colors.textDark,
  textMuted: Theme.colors.textLight,
  trackOn: Theme.colors.primaryLimeDark,
  trackOff: Theme.colors.border,
};

export function ConsentPreferencesCard({
  analytics,
  tailoredContent,
  busy = false,
  onChangeAnalytics,
  onChangeTailored,
  colors: colorsProp,
}: Props) {
  const { t } = useTranslation();
  const colors = { ...DEFAULT_COLORS, ...colorsProp };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.hint, { color: colors.textMuted }]}>
        {t('settings.consents.hint')}
      </Text>

      <View style={styles.row}>
        <View style={styles.labels}>
          <Text style={[styles.label, { color: colors.text }]}>
            {t('consents.granular.analytics')}
          </Text>
          <Text style={[styles.sub, { color: colors.textMuted }]}>
            {t('settings.consents.analyticsSub')}
          </Text>
        </View>
        <Switch
          value={analytics}
          disabled={busy}
          onValueChange={onChangeAnalytics}
          trackColor={{ true: colors.trackOn, false: colors.trackOff }}
        />
      </View>

      <View style={[styles.row, styles.rowLast]}>
        <View style={styles.labels}>
          <Text style={[styles.label, { color: colors.text }]}>
            {t('consents.granular.tailored')}
          </Text>
          <Text style={[styles.sub, { color: colors.textMuted }]}>
            {t('settings.consents.tailoredSub')}
          </Text>
        </View>
        <Switch
          value={tailoredContent}
          disabled={busy}
          onValueChange={onChangeTailored}
          trackColor={{ true: colors.trackOn, false: colors.trackOff }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Theme.borderRadius.large,
    borderWidth: 1,
    padding: Theme.spacing.m,
    marginBottom: Theme.spacing.m,
  },
  hint: {
    fontSize: Theme.typography.caption,
    lineHeight: 18,
    marginBottom: Theme.spacing.m,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.m,
    marginBottom: Theme.spacing.m,
  },
  rowLast: {
    marginBottom: 0,
  },
  labels: {
    flex: 1,
  },
  label: {
    fontSize: Theme.typography.body,
    fontWeight: '700',
  },
  sub: {
    marginTop: 4,
    fontSize: Theme.typography.caption,
    lineHeight: 18,
  },
});
