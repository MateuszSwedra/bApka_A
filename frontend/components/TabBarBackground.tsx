import React from 'react';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '../constants/theme';
import {
  ANDROID_NAV_BAR_COLOR,
  getTabBarNavSpacerHeight,
} from '../utils/safeAreaInsets';

/** Tło tab bara: kolor aplikacji + czarny pas w strefie przycisków systemowych. */
export function TabBarBackground() {
  const insets = useSafeAreaInsets();
  const navSpacer = getTabBarNavSpacerHeight(insets.bottom);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: Theme.colors.background }} />
      {Platform.OS === 'android' && navSpacer > 0 ? (
        <View style={{ height: navSpacer, backgroundColor: ANDROID_NAV_BAR_COLOR }} />
      ) : null}
    </View>
  );
}
