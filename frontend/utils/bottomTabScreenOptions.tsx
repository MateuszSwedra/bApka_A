import React from 'react';
import { Platform } from 'react-native';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { Theme } from '../constants/theme';
import { TabBarBackground } from '../components/TabBarBackground';
import {
  getTabBarNavSpacerHeight,
  TAB_BAR_CONTENT_HEIGHT,
  TAB_BAR_TOP_PADDING,
} from './safeAreaInsets';

/** Wspólne opcje dolnej nawigacji — hybrid + opiekun. */
export function buildBottomTabScreenOptions(
  insetsBottom: number,
): BottomTabNavigationOptions {
  const navSpacer = getTabBarNavSpacerHeight(insetsBottom);
  const contentHeight = TAB_BAR_CONTENT_HEIGHT + TAB_BAR_TOP_PADDING;

  return {
    headerShown: false,
    tabBarActiveTintColor: Theme.colors.accentOrange,
    tabBarInactiveTintColor: Theme.colors.textLight,
    tabBarBackground: () => <TabBarBackground />,
    tabBarStyle: {
      borderTopWidth: 1,
      borderTopColor: Theme.colors.border,
      height: contentHeight + navSpacer,
      paddingTop: TAB_BAR_TOP_PADDING,
      paddingBottom: navSpacer,
      backgroundColor: 'transparent',
      elevation: 0,
    },
    tabBarLabelStyle: {
      fontSize: Theme.typography.small,
      fontWeight: '600',
      marginBottom: 4,
      ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
    },
    tabBarItemStyle: {
      paddingBottom: 2,
    },
  };
}
