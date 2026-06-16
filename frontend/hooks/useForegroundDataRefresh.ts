import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useFocusEffect } from 'expo-router';

type Options = {
  onRefresh: () => void | Promise<void>;
  intervalMs?: number;
  enabled?: boolean;
};

/** Odświeżanie na focus ekranu, co N sekund i po powrocie aplikacji na pierwszy plan. */
export function useForegroundDataRefresh({
  onRefresh,
  intervalMs = 15_000,
  enabled = true,
}: Options) {
  const refreshRef = useRef(onRefresh);
  refreshRef.current = onRefresh;

  const runRefresh = useCallback(() => {
    if (!enabled) return;
    void refreshRef.current();
  }, [enabled]);

  useFocusEffect(
    useCallback(() => {
      runRefresh();
      const pollId = setInterval(runRefresh, intervalMs);
      return () => clearInterval(pollId);
    }, [runRefresh, intervalMs]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') runRefresh();
    });
    return () => sub.remove();
  }, [runRefresh]);
}
