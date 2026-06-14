import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

type CaretakerTourLockContextValue = {
  locked: boolean;
  acquireScrollLock: () => void;
  releaseScrollLock: () => void;
};

const CaretakerTourLockContext = createContext<CaretakerTourLockContextValue | null>(
  null,
);

export function CaretakerTourLockProvider({ children }: { children: React.ReactNode }) {
  const lockCountRef = useRef(0);
  const [locked, setLocked] = useState(false);

  const acquireScrollLock = useCallback(() => {
    lockCountRef.current += 1;
    setLocked(true);
  }, []);

  const releaseScrollLock = useCallback(() => {
    lockCountRef.current = Math.max(0, lockCountRef.current - 1);
    setLocked(lockCountRef.current > 0);
  }, []);

  const value = useMemo(
    () => ({ locked, acquireScrollLock, releaseScrollLock }),
    [locked, acquireScrollLock, releaseScrollLock],
  );

  return (
    <CaretakerTourLockContext.Provider value={value}>
      {children}
    </CaretakerTourLockContext.Provider>
  );
}

export function useCaretakerTourLock(): CaretakerTourLockContextValue | null {
  return useContext(CaretakerTourLockContext);
}

/** Blokuje przewijanie list podczas aktywnej podpowiedzi tour. */
export function useCaretakerTourScrollLock(visible: boolean): void {
  const tourLock = useCaretakerTourLock();

  React.useEffect(() => {
    if (!visible || !tourLock) return;
    tourLock.acquireScrollLock();
    return () => tourLock.releaseScrollLock();
  }, [visible, tourLock]);
}
