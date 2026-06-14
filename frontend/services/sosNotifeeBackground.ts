/**
 * Notifee wymaga rejestracji onBackgroundEvent PRZED React (index.js).
 * Obsługuje tap / FSI gdy aplikacja jest w tle lub ubita.
 */
import { Platform } from 'react-native';

if (Platform.OS === 'android') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const notifee = require('@notifee/react-native').default;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { EventType } = require('@notifee/react-native');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { bringAppToSosAlarm } = require('./bringAppToSosAlarm');

    notifee.onBackgroundEvent(
      async ({
        type,
        detail,
      }: {
        type: number;
        detail: {
          notification?: {
            title?: string;
            body?: string;
            data?: Record<string, unknown>;
          };
        };
      }) => {
        const data = detail.notification?.data;
        if (data?.type !== 'sos') return;

        if (type === EventType.PRESS || type === EventType.ACTION_PRESS) {
          await bringAppToSosAlarm({
            title: detail.notification?.title ?? 'SOS!',
            body:
              (typeof data.body === 'string' ? data.body : null) ??
              detail.notification?.body ??
              '',
            dependentId: typeof data.dependentId === 'string' ? data.dependentId : '',
            dependentName: typeof data.dependentName === 'string' ? data.dependentName : '',
          });
        }
      },
    );
  } catch (error) {
    console.warn('[SOS] Notifee background event registration failed', error);
  }
}
