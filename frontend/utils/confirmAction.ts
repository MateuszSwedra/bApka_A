import { Alert, Platform } from 'react-native';

type ConfirmActionOptions = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Called only when the user confirms. */
  onConfirm: () => void | Promise<void>;
};

/**
 * Cross-platform confirm. RN Web's Alert.alert ignores button onPress handlers,
 * so we use window.confirm on web.
 */
export function confirmAction({
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
}: ConfirmActionOptions): void {
  if (Platform.OS === 'web') {
    const ok = typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`);
    if (ok) void Promise.resolve(onConfirm());
    return;
  }

  Alert.alert(title, message, [
    { text: cancelLabel, style: 'cancel' },
    {
      text: confirmLabel,
      style: 'destructive',
      onPress: () => {
        void Promise.resolve(onConfirm());
      },
    },
  ]);
}

export function showErrorAlert(title: string, message: string): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(`${title}: ${message}`);
    return;
  }
  Alert.alert(title, message);
}
