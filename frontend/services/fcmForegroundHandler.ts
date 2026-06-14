/**
 * FCM w foreground — zawsze pełnoekranowy ekran /sos-alarm (bez banera Notifee).
 */
import { Platform } from 'react-native';
import { presentSosAlarm } from './presentSosAlarm';
import { sosParamsFromFcmNotifeeJson } from './sosNotifeeDisplay';

function presentFromNotifeeJson(raw: string): void {
  const params = sosParamsFromFcmNotifeeJson(raw);
  if (!params) return;
  presentSosAlarm(params);
}

if (Platform.OS === 'android') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const messaging = require('@react-native-firebase/messaging').default;

    messaging().onMessage(async (remoteMessage: { data?: Record<string, string> }) => {
      const data = remoteMessage?.data;
      if (!data) return;

      if (data.notifee) {
        presentFromNotifeeJson(data.notifee);
        return;
      }

      if (data.type === 'sos') {
        presentSosAlarm({
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
    });
  } catch {
    /* brak natywnego Firebase w starym APK */
  }
}
