import React, { useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useAuth } from '@/context/AuthContext';
import { NotificationConsentModal } from '@/components/NotificationConsentModal';
import {
  NOTIFICATION_PROMPT_DONE_KEY,
  syncPushTokenToBackend,
  requestOsNotificationPermission,
} from '@/services/pushNotifications';

type Props = {
  children: React.ReactNode;
};

export function NotificationConsentCoordinator({ children }: Props) {
  const { isReady, userRole } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);

  const markPromptDone = useCallback(async () => {
    if (Platform.OS === 'web') return;
    await SecureStore.setItemAsync(NOTIFICATION_PROMPT_DONE_KEY, '1');
  }, []);

  useEffect(() => {
    if (!isReady || !userRole || Platform.OS === 'web') return;

    let cancelled = false;

    const run = async () => {
      if (!Device.isDevice) return;

      const sessionToken = await SecureStore.getItemAsync('userToken');
      if (!sessionToken) return;

      const { status } = await Notifications.getPermissionsAsync();
      if (cancelled) return;

      if (status === 'granted') {
        await syncPushTokenToBackend();
        await markPromptDone();
        return;
      }

      const done = await SecureStore.getItemAsync(NOTIFICATION_PROMPT_DONE_KEY);
      if (cancelled) return;
      if (done === '1') return;

      setModalVisible(true);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [isReady, userRole, markPromptDone]);

  const handleAccept = useCallback(async () => {
    await requestOsNotificationPermission();
    await markPromptDone();
    setModalVisible(false);
    await syncPushTokenToBackend();
  }, [markPromptDone]);

  const handleDecline = useCallback(async () => {
    await markPromptDone();
    setModalVisible(false);
  }, [markPromptDone]);

  return (
    <>
      {children}
      <NotificationConsentModal
        visible={modalVisible}
        onAccept={handleAccept}
        onDecline={handleDecline}
      />
    </>
  );
}
