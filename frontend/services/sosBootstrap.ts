/**
 * Rejestracja SOS musi nastąpić przy starcie modułu (przed React),
 * żeby background task działał gdy aplikacja jest ubita.
 */
import { Platform } from 'react-native';
import './fcmForegroundHandler';
import { registerSosBackgroundNotificationTask } from './sosBackgroundNotificationTask';
import { ensureSosAlarmChannel } from './sosAlarmHandlers';

if (Platform.OS === 'android') {
  void ensureSosAlarmChannel();
  void registerSosBackgroundNotificationTask();
}
