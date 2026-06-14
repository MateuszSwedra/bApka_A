/** Musi być identyczne z backend/src/notifications/firebase-sos.service.ts */
export const SOS_ALARM_CHANNEL_ID = 'sos_alarm_v1';

/** Notifee: parzysta liczba dodatnich wartości (ms). Wiodące 0 powoduje błąd createChannel. */
export const SOS_NOTIFEE_VIBRATION_PATTERN = [500, 200, 500, 200, 800, 200] as const;

export function sosNotifeeVibrationPattern(): number[] {
  return [...SOS_NOTIFEE_VIBRATION_PATTERN];
}
