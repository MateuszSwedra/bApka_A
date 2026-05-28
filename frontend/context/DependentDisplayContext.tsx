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
  if (highContrast) {
    return {
      ...base,
      background: '#FFFFFF',
      surfaceGrey: '#F0F0F0',
      surfaceWhite: '#FFFFFF',
      textDark: '#000000',
      textLight: '#111111',
      border: '#000000',
      primaryLime: '#E0E0E0',
      primaryLimeDark: '#003D7A',
      accentOrange: '#B35900',
      success: '#003D7A',
      schedulePendingBackground: '#FFD54F',
      schedulePendingText: '#000000',
      surfaceSoftOrange: '#FFE0B2',
      mainButtonBorderWidth: 3,
      moodBorder: '#000000',
    };
  }
  if (colorBlindFriendly) {
    return {
      ...base,
      success: '#1D4ED8',
      schedulePendingText: '#92400E',
      accentOrange: '#C2410C',
      mainButtonBorderWidth: 2,
      moodBorder: base.primaryLimeDark,
    };
  }
  return base;
}

export function DependentDisplayProvider({ children }: { children: ReactNode }) {
  const [colorBlindFriendly, setCb] = useState(false);
  const [highContrast, setHc] = useState(false);

  const reload = useCallback(async () => {
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
