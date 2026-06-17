type DataSyncListener = () => void;

const listeners = new Set<DataSyncListener>();

/**
 * Magistrala „samo się melduje": backend wysyła push (np. type: 'data_changed',
 * 'dose_taken', 'med_reminder'), a ekrany subskrybują ten sygnał, by odświeżyć
 * dane zamiast odpytywać serwer co 15 s.
 */
export function emitDataSync(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      /* pojedynczy subskrybent nie może zablokować pozostałych */
    }
  });
}

export function subscribeDataSync(listener: DataSyncListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
