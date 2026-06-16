import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { readFileSync } from 'fs';

import { isAbsolute, join } from 'path';

// Używamy require, żeby uniknąć problemów rozwiązywania subpath exports
// między wersjami TypeScript/Node w środowisku dockerowym.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { cert, getApps, initializeApp } = require('firebase-admin/app') as {
  cert: (serviceAccount: Record<string, unknown>) => unknown;
  getApps: () => unknown[];
  initializeApp: (options: { credential: unknown }) => unknown;
};

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getMessaging } = require('firebase-admin/messaging') as {
  getMessaging: () => {
    send: (message: Record<string, unknown>) => Promise<unknown>;
  };
};



export const SOS_ANDROID_CHANNEL_ID = 'sos_alarm_v1';



type SosFcmParams = {

  token: string;

  title: string;

  body: string;

  dependentId: string;

  dependentName: string;

};



export type SosFcmSendResult = {

  sent: boolean;

  invalidToken?: boolean;

};



type FirebaseServiceAccount = Record<string, unknown>;

function loadServiceAccount(): FirebaseServiceAccount | null {

  const pathRaw = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();

  if (pathRaw) {

    const resolved = isAbsolute(pathRaw) ? pathRaw : join(process.cwd(), pathRaw);

    try {

      return JSON.parse(readFileSync(resolved, 'utf8')) as FirebaseServiceAccount;

    } catch (error) {

      throw new Error(`Nie można wczytać Firebase z pliku ${resolved}: ${error}`);

    }

  }



  const jsonRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();

  if (jsonRaw) {

    return JSON.parse(jsonRaw) as FirebaseServiceAccount;

  }



  return null;

}



function isUnregisteredFcmToken(error: unknown): boolean {

  const code = (error as { code?: string })?.code;

  return code === 'messaging/registration-token-not-registered';

}



@Injectable()

export class FirebaseSosService implements OnModuleInit {

  private readonly logger = new Logger(FirebaseSosService.name);

  private enabled = false;



  onModuleInit() {

    if (getApps().length > 0) {

      this.enabled = true;

      return;

    }



    try {

      const serviceAccount = loadServiceAccount();

      if (!serviceAccount) {

        this.logger.warn(

          'Brak FIREBASE_SERVICE_ACCOUNT_PATH / FIREBASE_SERVICE_ACCOUNT_JSON — SOS tylko przez Expo push.',

        );

        return;

      }



      initializeApp({

        credential: cert(serviceAccount),

      });

      this.enabled = true;

      this.logger.log('Firebase Admin zainicjalizowany (alarm SOS FCM).');

    } catch (error) {

      this.logger.error('Nie udało się zainicjalizować Firebase Admin', error);

    }

  }



  isEnabled(): boolean {

    return this.enabled;

  }



  /** Wysyła data message z payloadem Notifee — działa gdy aplikacja jest zamknięta. */

  async sendSosAlarm(params: SosFcmParams): Promise<SosFcmSendResult> {

    if (!this.enabled) return { sent: false };



    const notifeePayload = {

      title: params.title,

      body: params.body,

      data: {

        type: 'sos',

        dependentId: params.dependentId,

        dependentName: params.dependentName,

        body: params.body,

        screen: 'sos-alarm',

      },

      android: {

        channelId: SOS_ANDROID_CHANNEL_ID,

        category: 'alarm',

        importance: 4,

        visibility: 1,

        lightUpScreen: true,

        loopSound: true,

        autoCancel: false,

        ongoing: true,

        sound: 'sos_alert',

        vibrationPattern: [500, 200, 500, 200, 800, 200],

        pressAction: { id: 'default', launchActivity: 'default' },

        fullScreenAction: { id: 'default' },

        actions: [

          {

            title: 'Otwórz',

            pressAction: { id: 'open', launchActivity: 'default' },

          },

        ],

      },

    };



    try {

      await getMessaging().send({

        token: params.token,

        data: {

          notifee: JSON.stringify(notifeePayload),

          type: 'sos',

          title: params.title,

          body: params.body,

          dependentId: params.dependentId,

          dependentName: params.dependentName,

        },

        android: {

          priority: 'high',

        },

      });

      this.logger.log(`SOS FCM (Notifee) wysłany do ${params.token.slice(0, 12)}…`);

      return { sent: true };

    } catch (error) {

      if (isUnregisteredFcmToken(error)) {

        this.logger.warn(

          `SOS FCM: wygasły token natywny (${params.token.slice(0, 12)}…) — wymaga odświeżenia w aplikacji opiekuna`,

        );

        return { sent: false, invalidToken: true };

      }

      this.logger.error('Błąd wysyłki SOS FCM', error);

      return { sent: false };

    }

  }

}


