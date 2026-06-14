/**
 * FCM w tle — deep link do /sos-alarm + Notifee FSI gdy ekran wygaszony.
 * Musi być importowany z index.js PRZED expo-router/entry.
 */
import { Platform } from 'react-native';

if (Platform.OS === 'android') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const messaging = require('@react-native-firebase/messaging').default;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { sosParamsFromFcmNotifeeJson, presentSosInBackground } = require('./sosNotifeeDisplay');

    messaging().setBackgroundMessageHandler(
      async (remoteMessage: { data?: Record<string, string> }) => {
        const raw = remoteMessage?.data?.notifee;
        if (raw) {
          const params = sosParamsFromFcmNotifeeJson(raw);
          if (params) await presentSosInBackground(params);
          return;
        }

        const data = remoteMessage?.data;
        if (data?.type === 'sos') {
          await presentSosInBackground({
            title: typeof data.title === 'string' ? data.title : 'SOS!',
            body:
              typeof data.body === 'string' && data.body.trim()
                ? data.body
                : typeof data.dependentName === 'string' && data.dependentName.trim()
                  ? `${data.dependentName} nacisnął(a) przycisk SOS!`
                  : 'Podopieczny nacisnął przycisk SOS!',
            dependentId: typeof data.dependentId === 'string' ? data.dependentId : '',
            dependentName: typeof data.dependentName === 'string' ? data.dependentName : '',
          });
        }
      },
    );
  } catch (error) {
    console.warn('[SOS] FCM background handler registration failed', error);
  }
}
