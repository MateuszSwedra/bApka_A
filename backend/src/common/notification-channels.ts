/** Id kanałów Android — muszą być zgodne z frontend/constants/notificationChannels.ts */
export const EXPO_ANDROID_CHANNELS = {
  DEFAULT: 'default',
  SOS: 'sos_alarm_v1',
  MEDICATION: 'medication_reminders_v1',
  MOOD: 'mood_reminders_v1',
  INVENTORY: 'inventory_alerts_v1',
} as const;
