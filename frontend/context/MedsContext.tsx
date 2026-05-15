import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { addDays, format } from 'date-fns';
import { parseDosagePills, scheduleAppliesToDate } from '../utils/scheduleHelpers';
import { getStoredAuthToken, inventoryAPI, scheduleAPI, usersAPI } from '../services/api';
import { assertCaretakerDependent } from '../utils/assertCaretakerDependent';
import { useGlobalSearchParams, useSegments } from 'expo-router';
import { resolveMedsTargetUserId, isUserUuid } from '../utils/resolveMedsTargetUserId';
import { debugLog } from '../utils/debugLog';
import { useAuth } from './AuthContext';
import type { TreatmentType } from '../constants/treatmentVisuals';

export type { TreatmentType } from '../constants/treatmentVisuals';

export interface Treatment {
  id: string;
  type: TreatmentType;
  name: string;
  description?: string;
  totalPills?: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  totalPills: number;
  description?: string;
}

export type MedScheduleType = 'ONCE' | 'REGULAR' | 'TEMPORARY';

export interface ScheduleItem {
  id: string;
  /** Wybrana aktywność z listy Treatment (wszystkie typy) */
  treatmentId?: string;
  /** @deprecated — używaj treatmentId; zostawione dla starych wpisów */
  inventoryId?: string;
  /** @deprecated — jednorazowe wpisy bez karty aktywności */
  customName?: string;
  type: MedScheduleType;
  time: string;
  dosage?: string;
  daysOfWeek: number[]; // 1(Pn) - 7(Nd)
  startDate: string; // yyyy-MM-dd
  endDate?: string; // yyyy-MM-dd (dla TEMPORARY)
}

/** Id aktywności przypisanej do wpisu harmonogramu (nowe: treatmentId, stare: inventoryId). */
export function getScheduleTreatmentId(s: ScheduleItem): string | undefined {
  return s.treatmentId ?? s.inventoryId;
}

// Wynik obliczeń algorytmu
export interface DepletionAlert {
  date: string;
  inventoryItemName: string;
}

interface MedsContextType {
  treatments: Treatment[];
  inventory: InventoryItem[];
  schedules: ScheduleItem[];
  addTreatment: (treatment: Omit<Treatment, 'id'>, forUserId?: string) => Promise<void>;
  addSchedule: (schedule: Omit<ScheduleItem, 'id'>, forUserId?: string) => Promise<void>;
  removeTreatment: (id: string, forUserId?: string) => Promise<void>;
  updateTreatment: (id: string, patch: Partial<Omit<Treatment, 'id'>>) => Promise<void>;
  addInventoryItem: (name: string, totalPills: number, description?: string) => void;
  removeInventoryItem: (id: string) => void;
  removeSchedule: (id: string) => Promise<void>;
  updateSchedule: (id: string, patch: Partial<ScheduleItem>) => Promise<void>;
  depletionAlerts: DepletionAlert[];
  /** Aktualny userId podopiecznego (profil / add-treatment / add-med). */
  targetUserId: string | null;
  /** Reload inventory and schedules from the server (caretaker changes). */
  refetchFromServer: (userId?: string) => Promise<void>;
}

const MedsContext = createContext<MedsContextType | undefined>(undefined);

const randomId = () => Math.random().toString(36).substring(2, 10);

function isUnauthorizedError(e: unknown): boolean {
  return e instanceof Error && /unauthorized/i.test(e.message);
}

const DEPENDENT_FLOW_MARKERS = [
  'dependent',
  'add-treatment',
  'add-med',
  'edit-treatment',
] as const;

function isInDependentCaretakerFlow(segments: string[]): boolean {
  return DEPENDENT_FLOW_MARKERS.some(m => segments.includes(m));
}

export function MedsProvider({ children }: { children: ReactNode }) {
  const { userRole, isReady } = useAuth();
  const { id, dependentId } = useGlobalSearchParams<{ id?: string; dependentId?: string }>();
  const segments = useSegments();
  const segList = segments as string[];
  const [scopedDependentUserId, setScopedDependentUserId] = useState<string | null>(null);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);

  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const treatmentsRef = useRef(treatments);
  const schedulesRef = useRef(schedules);

  useEffect(() => {
    treatmentsRef.current = treatments;
  }, [treatments]);

  useEffect(() => {
    schedulesRef.current = schedules;
  }, [schedules]);

  useEffect(() => {
    const fromRoute = resolveMedsTargetUserId({ id, dependentId }, segList);
    const inDependentFlow = isInDependentCaretakerFlow(segList);

    if (fromRoute) {
      debugLog(
        'MedsContext:resolveUser',
        'fromRoute',
        { fromRoute, segList },
        'H-E',
      );
      setScopedDependentUserId(fromRoute);
      setTargetUserId(fromRoute);
      return;
    }

    if (scopedDependentUserId && inDependentFlow) {
      setTargetUserId(scopedDependentUserId);
      return;
    }

    if (!inDependentFlow) {
      setScopedDependentUserId(null);
    }

    if (!isReady) return;
    if (!userRole) {
      setTargetUserId(null);
      return;
    }

    let cancelled = false;
    (async () => {
      const token = await getStoredAuthToken();
      if (!token || cancelled) return;
      try {
        const me = await usersAPI.getMe();
        if (!cancelled && me?.id) setTargetUserId(me.id);
      } catch (e: unknown) {
        if (!cancelled && !isUnauthorizedError(e)) {
          console.warn('Failed to fetch user ID', e);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, dependentId, segList, isReady, userRole, scopedDependentUserId]);

  const refetchFromServer = useCallback(async (userId?: string) => {
    const uid = userId ?? targetUserId;
    if (!uid) return;
    const token = await getStoredAuthToken();
    if (!token) return;
    try {
      const fetchedInventory = await inventoryAPI.getInventory(uid);
      const mappedTreatments: Treatment[] =
        fetchedInventory && fetchedInventory.length > 0
          ? fetchedInventory.map((it: any) => ({
              id: String(it.id),
              type: (it.type as TreatmentType) || 'MEDICATION',
              name: it.name,
              totalPills: it.totalPills,
              description: it.description,
            }))
          : [];
      setTreatments(mappedTreatments);

      const treatmentIds = new Set(mappedTreatments.map(t => t.id));
      const treatmentNames = new Set(mappedTreatments.map(t => t.name));

      const fetchedSchedules = await scheduleAPI.getSchedules(uid);
      if (fetchedSchedules && fetchedSchedules.length > 0) {
        const mappedSchedules: ScheduleItem[] = fetchedSchedules
          .map((sch: any) => ({
            id: String(sch.id),
            treatmentId: sch.inventoryId ? String(sch.inventoryId) : undefined,
            customName: sch.medication,
            type: sch.type as MedScheduleType,
            time: sch.time,
            dosage: sch.dosage || '1',
            startDate: sch.startDate,
            endDate: sch.endDate,
            daysOfWeek: sch.daysOfWeek || [1, 2, 3, 4, 5, 6, 7],
          }))
          .filter(sch => {
            const tid = getScheduleTreatmentId(sch);
            if (tid) return treatmentIds.has(tid);
            if (sch.customName) return treatmentNames.has(sch.customName);
            return false;
          });
        setSchedules(mappedSchedules);
      } else {
        setSchedules([]);
      }
    } catch (e) {
      console.error('Błąd pobierania danych z backendu:', e);
    }
  }, [targetUserId]);

  useEffect(() => {
    void refetchFromServer();
  }, [refetchFromServer]);

  // Widok zgodny ze starym API – tylko leki, używany przez kalendarz i ekran add-med.
  const inventory: InventoryItem[] = useMemo(
    () =>
      treatments
        .filter(t => t.type === 'MEDICATION')
        .map(t => ({
          id: t.id,
          name: t.name,
          totalPills: t.totalPills ?? 0,
          description: t.description,
        })),
    [treatments]
  );

  const addTreatment = async (
    treatment: Omit<Treatment, 'id'>,
    forUserId?: string,
  ) => {
    const uid = forUserId ?? targetUserId;
    debugLog(
      'MedsContext:addTreatment',
      'create inventory',
      {
        uid,
        forUserId: forUserId ?? null,
        targetUserId,
        scopedDependentUserId,
        uidIsUuid: uid ? isUserUuid(uid) : false,
      },
      'H-C',
    );
    if (!uid) return;
    if (!isUserUuid(uid)) {
      throw new Error('Nieprawidłowy identyfikator podopiecznego.');
    }
    try {
      await assertCaretakerDependent(uid);
      await inventoryAPI.create(uid, {
        name: treatment.name,
        type: treatment.type,
        description: treatment.description,
        totalPills: treatment.totalPills,
        currentPills: treatment.totalPills,
        pillsPerDose: 1,
      });
      if (forUserId) {
        setScopedDependentUserId(forUserId);
        setTargetUserId(forUserId);
      }
      await refetchFromServer(uid);
    } catch (e) {
      console.error('Error adding treatment:', e);
      throw e;
    }
  };

  const removeTreatment = async (id: string, forUserId?: string) => {
    const uid = forUserId ?? targetUserId ?? scopedDependentUserId;
    const treatment = treatmentsRef.current.find(t => t.id === id);
    const relatedSchedules = schedulesRef.current.filter(sch => {
      const tid = getScheduleTreatmentId(sch);
      if (tid === id) return true;
      if (!tid && treatment?.name && sch.customName === treatment.name) return true;
      return false;
    });

    try {
      await Promise.all(
        relatedSchedules.map(sch =>
          scheduleAPI.remove(sch.id).catch(err => {
            console.warn('Nie udało się usunąć harmonogramu', sch.id, err);
          }),
        ),
      );
      await inventoryAPI.remove(id);
      setTreatments(prev => prev.filter(t => t.id !== id));
      setSchedules(prev =>
        prev.filter(sch => {
          const tid = getScheduleTreatmentId(sch);
          if (tid === id) return false;
          if (!tid && treatment?.name && sch.customName === treatment.name) return false;
          return true;
        }),
      );
      if (uid) await refetchFromServer(uid);
    } catch (e) {
      console.error('Error removing treatment:', e);
      throw e;
    }
  };

  const updateTreatment = async (id: string, patch: Partial<Omit<Treatment, 'id'>>) => {
    try {
      await inventoryAPI.update(id, patch);
      setTreatments(prev => prev.map(t => (t.id === id ? { ...t, ...patch } : t)));
    } catch (e) {
      console.error('Error updating treatment:', e);
      throw e;
    }
  };

  const addInventoryItem = (name: string, totalPills: number, description?: string) => {
    addTreatment({ type: 'MEDICATION', name, totalPills, description });
  };

  const removeInventoryItem = (id: string) => {
    removeTreatment(id);
  };

  const addSchedule = async (
    schedule: Omit<ScheduleItem, 'id'>,
    forUserId?: string,
  ) => {
    const uid = forUserId ?? targetUserId;
    if (!uid) return;
    if (!isUserUuid(uid)) {
      throw new Error('Nieprawidłowy identyfikator podopiecznego.');
    }
    try {
      await assertCaretakerDependent(uid);
      const data = await scheduleAPI.create(uid, {
        inventoryId: schedule.treatmentId || schedule.inventoryId,
        medication: schedule.customName,
        time: schedule.time,
        type: schedule.type,
        dosage: schedule.dosage || '1',
        startDate: schedule.startDate,
        endDate: schedule.endDate,
        daysOfWeek: schedule.daysOfWeek ?? [],
      });
      const created: ScheduleItem = {
        ...schedule,
        id: String(data.id),
        dosage: schedule.dosage || '1',
        daysOfWeek: schedule.daysOfWeek ?? [],
      };
      setSchedules(prev => [...prev, created]);
      if (forUserId) {
        setScopedDependentUserId(forUserId);
        setTargetUserId(forUserId);
      }
      await refetchFromServer(uid);
    } catch (e) {
      console.error('Error adding schedule:', e);
      throw e;
    }
  };

  const removeSchedule = async (id: string) => {
    try {
      await scheduleAPI.remove(id);
      setSchedules(prev => prev.filter(s => s.id !== id));
    } catch (e) {
      console.error('Error removing schedule:', e);
      throw e;
    }
  };

  const updateSchedule = async (id: string, patch: Partial<ScheduleItem>) => {
    try {
      await scheduleAPI.update(id, patch);
      setSchedules(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)));
    } catch (e) {
      console.error('Error updating schedule:', e);
      throw e;
    }
  };

  // ALGORYTM: Przewidywanie zużycia na podstawie kalendarza
  const depletionAlerts = useMemo(() => {
    const alerts: DepletionAlert[] = [];
    
    // Tylko leki (MEDICATION) — zużycie tabletek i alerty końca zapasu
    treatments
      .filter(t => t.type === 'MEDICATION')
      .forEach(med => {
      const relatedSchedules = schedules.filter(s => {
        const tid = getScheduleTreatmentId(s);
        if (tid !== med.id) return false;
        return true;
      });
      if (relatedSchedules.length === 0) return;

      let remainingPills = med.totalPills ?? 0;
      let currentDate = new Date(); // Zaczynamy symulację od dzisiaj
      let emergencyBreak = 0; // Zabezpieczenie przed nieskończoną pętlą (np. leki na 10 lat)

      while (remainingPills > 0 && emergencyBreak < 1000) {
        const currentDateStr = format(currentDate, 'yyyy-MM-dd');

        let pillsTakenToday = 0;

        for (const sch of relatedSchedules) {
          if (sch.type === 'ONCE') continue;
          if (!scheduleAppliesToDate(sch, currentDateStr)) continue;
          pillsTakenToday += parseDosagePills(sch.dosage);
        }

        remainingPills -= pillsTakenToday;

        if (remainingPills <= 0 && pillsTakenToday > 0) {
          alerts.push({
            date: currentDateStr,
            inventoryItemName: med.name
          });
          break; // Koniec zapasu dla tego leku
        }

        currentDate = addDays(currentDate, 1);
        emergencyBreak++;
      }
    });

    return alerts;
  }, [treatments, schedules]);

  return (
    <MedsContext.Provider
      value={{
        treatments,
        inventory,
        schedules,
        addTreatment,
        removeTreatment,
        updateTreatment,
        addInventoryItem,
        removeInventoryItem,
        addSchedule,
        removeSchedule,
        updateSchedule,
        depletionAlerts,
        targetUserId,
        refetchFromServer,
      }}
    >
      {children}
    </MedsContext.Provider>
  );
}

export function useMeds() {
  const context = useContext(MedsContext);
  if (context === undefined) {
    throw new Error('useMeds musi być używany wewnątrz MedsProvider');
  }
  return context;
}
