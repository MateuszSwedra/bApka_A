import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { usersAPI } from '../services/api';
import { applyAppLanguage, resolveEffectiveAppLanguage } from '../services/appLanguage';

/** Stosuje język opiekuna z profilu po wejściu do panelu. */
export function CaretakerLanguageSync() {
  useFocusEffect(
    useCallback(() => {
      usersAPI
        .getMe()
        .then(me => {
          void resolveEffectiveAppLanguage(me?.appLanguage).then(lang => applyAppLanguage(lang));
        })
        .catch(() => {});
    }, []),
  );
  return null;
}
