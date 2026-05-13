import * as Notifications from 'expo-notifications';
import { InteractionManager, Platform } from 'react-native';

/**
 * Na Androidzie kanał musi istnieć przed prośbą o uprawnienia — inaczej systemowy dialog
 * bywa niepełny lub powiadomienia nie trafiają do użytkownika.
 */
export async function prepareAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Powiadomienia',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF231F7C',
  });
}

/**
 * Wywołuj z obsługi przycisku (gest użytkownika). Pokazuje natywny dialog iOS / Android.
 */
export async function requestUserNotificationPermission(): Promise<Notifications.NotificationPermissionsStatus> {
  await prepareAndroidNotificationChannel();

  await new Promise<void>((resolve) => {
    InteractionManager.runAfterInteractions(() => resolve());
  });

  return Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });
}
