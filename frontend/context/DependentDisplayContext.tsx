import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Theme } from '../constants/theme';
import {
  getDaltonistFriendly,
  getHighContrast,
  setDaltonistFriendly,
  setHighContrast,
} from '../services/seniorDisplayPreferences';
import { usersAPI } from '../services/api';
import { applySeniorProfileSettings } from '../services/seniorProfileSync';

export type SeniorSurfaceColors = typeof Theme.colors & {
  moodBorder?: string;
  mainButtonBorderWidth?: number;
  calendarCell?: string;
  surfaceWarmHighlight?: string;
};

interface DependentDisplayContextValue {
  colorBlindFriendly: boolean;
  highContrast: boolean;
  colors: SeniorSurfaceColors;
  setColorBlindFriendly: (v: boolean) => Promise<void>;
  setHighContrastMode: (v: boolean) => Promise<void>;
  reload: () => Promise<void>;
}

const DependentDisplayContext = createContext<DependentDisplayContextValue | undefined>(undefined);

function buildColors(colorBlindFriendly: boolean, highContrast: boolean): SeniorSurfaceColors {
  const base = { ...Theme.colors };

  if (highContrast && colorBlindFriendly) {
    return {
      ...base,
      background: '#FFFFFF',
      surfaceGrey: '#E8E8E8',
      surfaceWhite: '#FFFFFF',
      textDark: '#000000',
      textLight: '#1A1A1A',
      border: '#000000',
      primaryLime: '#D6E4FF',
      primaryLimeDark: '#003D99',
      accentOrange: '#CC5500',
      success: '#003D99',
      schedulePendingBackground: '#FFE082',
      schedulePendingText: '#000000',
      surfaceSoftOrange: '#FFD9B3',
      calendarCell: '#F5F5F5',
      mainButtonBorderWidth: 4,
      moodBorder: '#000000',
    };
  }

  if (highContrast) {
    return {
      ...base,
      background: '#FFFFFF',
      surfaceGrey: '#ECECEC',
      surfaceWhite: '#FFFFFF',
      textDark: '#000000',
      textLight: '#1A1A1A',
      border: '#000000',
      primaryLime: '#D0D0D0',
      primaryLimeDark: '#003366',
      accentOrange: '#994400',
      success: '#003366',
      schedulePendingBackground: '#FFEB3B',
      schedulePendingText: '#000000',
      surfaceSoftOrange: '#FFCC80',
      calendarCell: '#F0F0F0',
      mainButtonBorderWidth: 3,
      moodBorder: '#000000',
    };
  }

  if (colorBlindFriendly) {
    return {
      ...base,
      background: '#FFFFFF',
      surfaceGrey: '#F3F6FA',
      textDark: '#0F172A',
      textLight: '#334155',
      border: '#1E3A5F',
      primaryLime: '#BFDBFE',
      primaryLimeDark: '#1D4ED8',
      accentOrange: '#C2410C',
      success: '#1D4ED8',
      schedulePendingBackground: '#FEF3C7',
      schedulePendingText: '#78350F',
      surfaceSoftOrange: '#FFEDD5',
      calendarCell: '#EFF6FF',
      mainButtonBorderWidth: 3,
      moodBorder: '#1D4ED8',
    };
  }

  return base;
}

export function DependentDisplayProvider({ children }: { children: ReactNode }) {
  const [colorBlindFriendly, setCb] = useState(false);
  const [highContrast, setHc] = useState(false);

  const reload = useCallback(async () => {
    try {
      const me = await usersAPI.getMe();
      if (me) {
        await applySeniorProfileSettings(me);
      }
    } catch {
      /* offline lub brak sesji */
    }
    const [cb, hc] = await Promise.all([getDaltonistFriendly(), getHighContrast()]);
    setCb(cb);
    setHc(hc);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const colors = useMemo(
    () => buildColors(colorBlindFriendly, highContrast),
    [colorBlindFriendly, highContrast],
  );

  const setColorBlindFriendly = useCallback(async (v: boolean) => {
    await setDaltonistFriendly(v);
    setCb(v);
  }, []);

  const setHighContrastMode = useCallback(async (v: boolean) => {
    await setHighContrast(v);
    setHc(v);
  }, []);

  const value = useMemo(
    () => ({
      colorBlindFriendly,
      highContrast,
      colors,
      setColorBlindFriendly,
      setHighContrastMode,
      reload,
    }),
    [colorBlindFriendly, highContrast, colors, setColorBlindFriendly, setHighContrastMode, reload],
  );

  return (
    <DependentDisplayContext.Provider value={value}>{children}</DependentDisplayContext.Provider>
  );
}

export function useDependentDisplay() {
  const ctx = useContext(DependentDisplayContext);
  if (!ctx) {
    throw new Error('useDependentDisplay must be used within DependentDisplayProvider');
  }
  return ctx;
}
