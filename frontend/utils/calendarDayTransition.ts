import { Easing } from 'react-native';
import { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';

/** Wejście w dzień — szybkie rozszerzenie do pełnego ekranu. */
export const CALENDAR_DAY_ENTER = ZoomIn.duration(260)
  .easing(Easing.out(Easing.cubic))
  .withInitialValues({ transform: [{ scale: 0.9 }], opacity: 0 });

/** Powrót do widoku miesiąca. */
export const CALENDAR_DAY_EXIT = ZoomOut.duration(200).easing(Easing.in(Easing.cubic));

/** Lekkie przyciemnienie pod spodem przy otwieraniu (warstwa pod treścią dnia). */
export const CALENDAR_DAY_BACKDROP_ENTER = FadeIn.duration(220).easing(Easing.out(Easing.quad));

export const CALENDAR_DAY_BACKDROP_EXIT = FadeOut.duration(160).easing(Easing.in(Easing.quad));
