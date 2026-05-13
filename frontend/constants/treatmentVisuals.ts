import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Theme } from './theme';

export type TreatmentType =
  | 'MEDICATION'
  | 'BLOOD_SUGAR'
  | 'BLOOD_PRESSURE'
  | 'EXERCISE'
  | 'CUSTOM';

export type TreatmentIconName = React.ComponentProps<typeof MaterialIcons>['name'];

/** Ikona i kolor — do kafelków / wyboru w kalendarzu */
export const TREATMENT_VISUAL: Record<
  TreatmentType,
  { icon: TreatmentIconName; accent: string; groupLabel: string }
> = {
  MEDICATION: {
    icon: 'medication',
    accent: Theme.colors.primaryLimeDark,
    groupLabel: 'Leki',
  },
  BLOOD_SUGAR: {
    icon: 'water-drop',
    accent: '#C0392B',
    groupLabel: 'Badanie cukru',
  },
  BLOOD_PRESSURE: {
    icon: 'monitor-heart',
    accent: '#8E44AD',
    groupLabel: 'Mierzenie ciśnienia',
  },
  EXERCISE: {
    icon: 'directions-run',
    accent: '#27AE60',
    groupLabel: 'Ćwiczenia',
  },
  CUSTOM: {
    icon: 'stars',
    accent: Theme.colors.accentOrange,
    groupLabel: 'Inne aktywności',
  },
};

export const TREATMENT_TYPE_ORDER: TreatmentType[] = [
  'MEDICATION',
  'BLOOD_SUGAR',
  'BLOOD_PRESSURE',
  'EXERCISE',
  'CUSTOM',
];
