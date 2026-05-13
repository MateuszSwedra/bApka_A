import React, { createContext, useState, useContext, ReactNode, useMemo, useEffect } from 'react';
import { addDays, format, getDay, isBefore, isSameDay } from 'date-fns';
import { inventoryAPI, scheduleAPI, usersAPI } from '../services/api';
import { useLocalSearchParams } from 'expo-router';
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
  treatmentId?: string;
  inventoryId?: string;
  customName?: string;
  type: MedScheduleType;
  time: string;
  daysOfWeek: number[]; // 1(Pn) - 7(Nd)
  startDate: string; // yyyy-MM-dd
  endDate?: string; // yyyy-MM-dd
}

export function getScheduleTreatmentId(s: ScheduleItem): string | undefined {
  return s.treatmentId ?? s.inventoryId;
}

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

export function MedsProvider({ children }: { children: ReactNode }) {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [targetUserId, setTargetUserId] = useState<string | null>(null);

  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);

  useEffect(() => {
    if (id) {
      setTargetUserId(id);
    } else {
      usersAPI.getMe().then(me => {
        if (me?.id) setTargetUserId(me.id);
      }).catch(e => console.error('Failed to fetch user ID', e));
    }
  }, [id]);

  useEffect(() => {
    if (!targetUserId) return;
    const fetchData = async () => {
      try {
        const fetchedInventory = await inventoryAPI.getInventory(targetUserId);
        if (fetchedInventory && fetchedInventory.length > 0) {
          const mapped: Treatment[] = fetchedInventory.map((it: any) => ({
            id: String(it.id),
            type: it.type || 'MEDICATION',
            name: it.name,
            totalPills: it.totalPills,
            description: it.description,
          }));
          setTreatments(mapped);
        }

        const fetchedSchedules = await scheduleAPI.getSchedules(targetUserId);
        if (fetchedSchedules && fetchedSchedules.length > 0) {
          const mappedSchedules: ScheduleItem[] = fetchedSchedules.map((sch: any) => ({
            id: String(sch.id),
            treatmentId: sch.inventoryId,
            customName: sch.medication,
            type: sch.type as MedScheduleType,
            time: sch.time,
            startDate: sch.startDate,
            endDate: sch.endDate,
            daysOfWeek: sch.daysOfWeek || [],
          }));
          setSchedules(mappedSchedules);
        }
      } catch (e) {
        console.error('Błąd pobierania danych z backendu:', e);
      }
    };
    fetchData();
  }, [targetUserId]);

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

  const addTreatment = async (treatment: Omit<Treatment, 'id'>) => {
    if (!targetUserId) return;
    try {
      const data = await inventoryAPI.create(targetUserId, {
        name: treatment.name,
        type: treatment.type,
        totalPills: treatment.totalPills,
        description: treatment.description
      });
      setTreatments(prev => [...prev, { ...treatment, id: String(data.id) }]);
    } catch (e) { console.error('Error adding treatment:', e); }
  };

  const removeTreatment = async (id: string) => {
    try {
      await inventoryAPI.remove(id);
      setTreatments(prev => prev.filter(t => t.id !== id));
      setSchedules(prev => prev.filter(sch => getScheduleTreatmentId(sch) !== id));
    } catch (e) { console.error('Error removing treatment:', e); }
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

  const addSchedule = async (schedule: Omit<ScheduleItem, 'id'>) => {
    if (!targetUserId) return;
    try {
      const data = await scheduleAPI.create(targetUserId, {
        inventoryId: schedule.treatmentId || schedule.inventoryId,
        medication: schedule.customName,
        time: schedule.time,
        type: schedule.type,
        startDate: schedule.startDate,
        endDate: schedule.endDate,
        daysOfWeek: schedule.daysOfWeek
      });
      setSchedules(prev => [...prev, { ...schedule, id: String(data.id) }]);
    } catch (e) { console.error('Error adding schedule:', e); }
  };

  const depletionAlerts = useMemo(() => {
    const alerts: DepletionAlert[] = [];
    const getIsoDay = (date: Date) => {
      const d = getDay(date);
      return d === 0 ? 7 : d;
    };

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
      let currentDate = new Date();
      let emergencyBreak = 0;

      while (remainingPills > 0 && emergencyBreak < 1000) {
        const currentDateStr = format(currentDate, 'yyyy-MM-dd');
        const currentIsoDay = getIsoDay(currentDate);

        let pillsTakenToday = 0;

        for (const sch of relatedSchedules) {
          if (sch.type === 'ONCE') continue; 

          const isAfterOrOnStart = !isBefore(currentDate, new Date(sch.startDate)) || isSameDay(currentDate, new Date(sch.startDate));
          
          let isBeforeOrOnEnd = true;
          if (sch.type === 'TEMPORARY' && sch.endDate) {
            isBeforeOrOnEnd = !isBefore(new Date(sch.endDate), currentDate) || isSameDay(currentDate, new Date(sch.endDate));
          }

          if (isAfterOrOnStart && isBeforeOrOnEnd) {
            if (sch.daysOfWeek.includes(currentIsoDay)) {
              pillsTakenToday += 1;
            }
          }
        }

        remainingPills -= pillsTakenToday;

        if (remainingPills <= 0 && pillsTakenToday > 0) {
          alerts.push({
            date: currentDateStr,
            inventoryItemName: med.name
          });
          break;
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
