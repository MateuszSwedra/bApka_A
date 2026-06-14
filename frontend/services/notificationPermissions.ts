import * as Notifications from 'expo-notifications';

import { InteractionManager, Platform } from 'react-native';

import { NOTIFICATION_CHANNELS } from '../constants/notificationChannels';

import { SOS_ALARM_CHANNEL_ID } from '../constants/sosAlarm';



/**

 * Na Androidzie kanały muszą istnieć przed prośbą o uprawnienia - inaczej systemowy dialog

 * bywa niepełny lub powiadomienia nie trafiają do użytkownika.

 */

export async function prepareAndroidNotificationChannel(): Promise<void> {

  if (Platform.OS !== 'android') return;



  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.DEFAULT, {

    name: 'Powiadomienia',

    importance: Notifications.AndroidImportance.MAX,

    vibrationPattern: [0, 250, 250, 250],

    lightColor: '#FF231F7C',

  });



  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.MEDICATION, {

    name: 'Leki',

    description: 'Przypomnienia o lekach i pominięte dawki',

    importance: Notifications.AndroidImportance.MAX,

    vibrationPattern: [0, 400, 200, 400],

    lightColor: '#2563EB',

    enableVibrate: true,

    bypassDnd: false,

    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,

  });



  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.MOOD, {

    name: 'Samopoczucie',

    description: 'Przypomnienia o zaznaczeniu nastroju',

    importance: Notifications.AndroidImportance.HIGH,

    vibrationPattern: [0, 250, 250, 250],

    lightColor: '#F9A825',

    enableVibrate: true,

    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,

  });



  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.INVENTORY, {

    name: 'Zapas leków',

    description: 'Alerty o kończącym się lub wyczerpanym zapasie',

    importance: Notifications.AndroidImportance.HIGH,

    vibrationPattern: [0, 400, 200, 400],

    lightColor: '#EA580C',

    enableVibrate: true,

    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,

  });



  await Notifications.setNotificationChannelAsync(SOS_ALARM_CHANNEL_ID, {

    name: 'Alarm SOS',

    description: 'Alarm gdy podopieczny naciska SOS',

    importance: Notifications.AndroidImportance.MAX,

    vibrationPattern: [0, 500, 200, 500, 200, 800],

    lightColor: '#B91C1C',

    sound: 'sos_alert',

    enableVibrate: true,

    bypassDnd: true,

    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,

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


