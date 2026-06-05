import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { usersAPI } from '../services/api';
import { applyAppLanguage, normalizeAppLanguage } from '../services/appLanguage';

/** Stosuje język opiekuna z profilu po wejściu do panelu. */
export function CaretakerLanguageSync() {
  useFocusEffect(
    useCallback(() => {
      usersAPI
        .getMe()
        .then(me => {
          if (me?.appLanguage) {
            void applyAppLanguage(normalizeAppLanguage(me.appLanguage));
          }
        })
        .catch(() => {});
    }, []),
  );
  return null;
}
