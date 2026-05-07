import React, { createContext, useState, useContext, ReactNode, useMemo, useEffect } from 'react';
import { addDays, format, getDay, isBefore, isSameDay } from 'date-fns';
import { inventoryAPI, scheduleAPI } from '../services/api';

export interface InventoryItem {
  id: string;
  name: string;
  totalPills: number;
}

export type MedScheduleType = 'ONCE' | 'REGULAR' | 'TEMPORARY';

export interface ScheduleItem {
  id: string;
  inventoryId?: string; // Powiązanie z fizycznym lekiem z apteczki (null dla ONCE wpisanego ręcznie)
  customName?: string; // Nazwa dla ONCE
  type: MedScheduleType;
  time: string;
  daysOfWeek: number[]; // 1(Pn) - 7(Nd)
  startDate: string; // yyyy-MM-dd
  endDate?: string; // yyyy-MM-dd (dla TEMPORARY)
}

// Wynik obliczeń algorytmu
export interface DepletionAlert {
  date: string;
  inventoryItemName: string;
}

interface MedsContextType {
  inventory: InventoryItem[];
  schedules: ScheduleItem[];
  addInventoryItem: (name: string, totalPills: number) => void;
  removeInventoryItem: (id: string) => void;
  addSchedule: (schedule: Omit<ScheduleItem, 'id'>) => void;
  depletionAlerts: DepletionAlert[];
}

const MedsContext = createContext<MedsContextType | undefined>(undefined);

export function MedsProvider({ children }: { children: ReactNode }) {
  const [inventory, setInventory] = useState<InventoryItem[]>([
    { id: 'inv-1', name: 'Acard 75mg', totalPills: 14 }
  ]);

  const [schedules, setSchedules] = useState<ScheduleItem[]>([
    {
      id: 'sch-1',
      inventoryId: 'inv-1',
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
          // Dostosuj format danych backendu do interfejsu (w produkcji trzeba maperów)
          setInventory(fetchedInventory);
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

  const addInventoryItem = (name: string, totalPills: number) => {
    setInventory(prev => [...prev, { id: Math.random().toString(36).substring(7), name, totalPills }]);
  };

  const removeInventoryItem = (id: string) => {
    setInventory(prev => prev.filter(item => item.id !== id));
    setSchedules(prev => prev.filter(sch => sch.inventoryId !== id)); // Usunięcie sierot
  };

  const addSchedule = (schedule: Omit<ScheduleItem, 'id'>) => {
    setSchedules(prev => [...prev, { ...schedule, id: Math.random().toString(36).substring(7) }]);
  };

  // ALGORYTM: Przewidywanie zużycia na podstawie kalendarza
  const depletionAlerts = useMemo(() => {
    const alerts: DepletionAlert[] = [];
    
    // JS date-fns getDay(): 0 to Nd, 1 to Pn. Zmieniamy na 1=Pn, 7=Nd
    const getIsoDay = (date: Date) => {
      const d = getDay(date);
      return d === 0 ? 7 : d;
    };

    inventory.forEach(invItem => {
      const relatedSchedules = schedules.filter(s => s.inventoryId === invItem.id);
      if (relatedSchedules.length === 0) return; // Lek w apteczce, ale nie przypisany do harmonogramu

      let remainingPills = invItem.totalPills;
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
            inventoryItemName: invItem.name
          });
          break; // Koniec zapasu dla tego leku
        }

        currentDate = addDays(currentDate, 1);
        emergencyBreak++;
      }
    });

    return alerts;
  }, [inventory, schedules]);

  return (
    <MedsContext.Provider value={{ inventory, schedules, addInventoryItem, removeInventoryItem, addSchedule, depletionAlerts }}>
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
