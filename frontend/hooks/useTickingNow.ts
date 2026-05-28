import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { formatLocalYmd, msUntilNextLocalMidnight } from '../utils/localCalendarDay';

export { msUntilNextLocalMidnight } from '../utils/localCalendarDay';

type Options = {
  /** Odświeżanie zegara w tle (domyślnie co 30 s). */
  tickMs?: number;
};

/**
 * Bieżąca data/czas z automatycznym przejściem na nowy dzień po północy
 * oraz po powrocie aplikacji z tła.
 */
export function useTickingNow(options?: Options) {
  const tickMs = options?.tickMs ?? 30_000;
  const [now, setNow] = useState(() => new Date());

  const refresh = useCallback(() => setNow(new Date()), []);

  useEffect(() => {
    const id = setInterval(refresh, tickMs);
    return () => clearInterval(id);
  }, [tickMs, refresh]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  useEffect(() => {
    const id = setTimeout(refresh, msUntilNextLocalMidnight(now));
    return () => clearTimeout(id);
  }, [now, refresh]);

  const todayStr = formatLocalYmd(now);
  return { now, todayStr, refresh };
}

/** Wywołuje callback, gdy zmieni się lokalny dzień kalendarzowy (yyyy-MM-dd). */
export function useOnCalendarDayChange(todayStr: string, onDayChange: () => void) {
  const prevRef = useRef(todayStr);
  const callbackRef = useRef(onDayChange);
  callbackRef.current = onDayChange;

  useEffect(() => {
    if (prevRef.current === todayStr) return;
    prevRef.current = todayStr;
    callbackRef.current();
  }, [todayStr]);
}
