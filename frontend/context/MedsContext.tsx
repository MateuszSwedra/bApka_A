import React, { createContext, useState, useContext, ReactNode, useMemo, useEffect } from 'react';
import { addDays, format, getDay, isBefore, isSameDay } from 'date-fns';
import { inventoryAPI, scheduleAPI } from '../services/api';
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
  addTreatment: (treatment: Omit<Treatment, 'id'>) => void;
  removeTreatment: (id: string) => void;
  updateTreatment: (id: string, patch: Partial<Omit<Treatment, 'id'>>) => void;
  addInventoryItem: (name: string, totalPills: number, description?: string) => void;
  removeInventoryItem: (id: string) => void;
  addSchedule: (schedule: Omit<ScheduleItem, 'id'>) => void;
  depletionAlerts: DepletionAlert[];
}

const MedsContext = createContext<MedsContextType | undefined>(undefined);

const randomId = () => Math.random().toString(36).substring(2, 10);

export function MedsProvider({ children }: { children: ReactNode }) {
  const [treatments, setTreatments] = useState<Treatment[]>([
    {
      id: 'tr-1',
      type: 'MEDICATION',
      name: 'Acard 75mg',
      totalPills: 14,
      description: 'Przyjmować po posiłku',
    },
  ]);

  const [schedules, setSchedules] = useState<ScheduleItem[]>([
    {
      id: 'sch-1',
      treatmentId: 'tr-1',
      type: 'REGULAR',
      time: '08:00',
      daysOfWeek: [1, 2, 3, 4, 5, 6, 7], // codziennie
      startDate: format(new Date(), 'yyyy-MM-dd')
    }
  ]);

  // Symulacja pobierania danych z API backendu
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Dla demonstracji - twardo kodowany user. W produkcji brany z AuthContext.
        const userId = 'mock-id';
        const fetchedInventory = await inventoryAPI.getInventory(userId);
        if (fetchedInventory && fetchedInventory.length > 0) {
          // Mapowanie surowych danych z backendu na uniwersalny model Treatment
          const mapped: Treatment[] = fetchedInventory.map((it: any) => ({
            id: String(it.id),
            type: 'MEDICATION',
            name: it.name,
            totalPills: it.totalPills,
            description: it.description,
          }));
          setTreatments(mapped);
        }

        const fetchedSchedules = await scheduleAPI.getSchedules(userId);
        if (fetchedSchedules && fetchedSchedules.length > 0) {
          setSchedules(fetchedSchedules);
        }
      } catch (e) {
        console.error('Błąd pobierania danych z backendu:', e);
      }
    };

    fetchData();
  }, []);

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

  const addTreatment = (treatment: Omit<Treatment, 'id'>) => {
    setTreatments(prev => [...prev, { ...treatment, id: randomId() }]);
  };

  const removeTreatment = (id: string) => {
    setTreatments(prev => prev.filter(t => t.id !== id));
    setSchedules(prev => prev.filter(sch => getScheduleTreatmentId(sch) !== id));
  };

  const updateTreatment = (id: string, patch: Partial<Omit<Treatment, 'id'>>) => {
    setTreatments(prev => prev.map(t => (t.id === id ? { ...t, ...patch } : t)));
  };

  const addInventoryItem = (name: string, totalPills: number, description?: string) => {
    addTreatment({ type: 'MEDICATION', name, totalPills, description });
  };

  const removeInventoryItem = (id: string) => {
    removeTreatment(id);
  };

  const addSchedule = (schedule: Omit<ScheduleItem, 'id'>) => {
    setSchedules(prev => [...prev, { ...schedule, id: randomId() }]);
  };

  // ALGORYTM: Przewidywanie zużycia na podstawie kalendarza
  const depletionAlerts = useMemo(() => {
    const alerts: DepletionAlert[] = [];
    
    // JS date-fns getDay(): 0 to Nd, 1 to Pn. Zmieniamy na 1=Pn, 7=Nd
    const getIsoDay = (date: Date) => {
      const d = getDay(date);
      return d === 0 ? 7 : d;
    };

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
        const currentIsoDay = getIsoDay(currentDate);

        let pillsTakenToday = 0;

        for (const sch of relatedSchedules) {
          // ONCE ignorujemy w zasobach Apteczki z założenia (zrobiłeś wyjątek wpisywania nazwy ręcznie)
          if (sch.type === 'ONCE') continue; 

          // Sprawdzamy czy harmonogram obowiązuje w tym dniu (startDate)
          const isAfterOrOnStart = !isBefore(currentDate, new Date(sch.startDate)) || isSameDay(currentDate, new Date(sch.startDate));
          
          // Sprawdzamy zakończenie (dla TEMPORARY)
          let isBeforeOrOnEnd = true;
          if (sch.type === 'TEMPORARY' && sch.endDate) {
            isBeforeOrOnEnd = !isBefore(new Date(sch.endDate), currentDate) || isSameDay(currentDate, new Date(sch.endDate));
          }

          if (isAfterOrOnStart && isBeforeOrOnEnd) {
            if (sch.daysOfWeek.includes(currentIsoDay)) {
              pillsTakenToday += 1; // Jedna porcja z tego harmonogramu
            }
          }
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
        depletionAlerts,
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
