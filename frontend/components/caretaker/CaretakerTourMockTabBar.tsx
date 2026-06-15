import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../constants/theme';
import { CaretakerTourTarget } from './CaretakerTourTarget';
import { useCaretakerGuidedTourOptional } from '../../context/CaretakerGuidedTourContext';

const TAB_BAR_CONTENT_HEIGHT = 56;

const TABS = [
  { name: 'home' as const, labelKey: 'tabs.today' },
  { name: 'calendar-today' as const, labelKey: 'tabs.calendar' },
  { name: 'healing' as const, labelKey: 'tabs.treatment' },
  { name: 'show-chart' as const, labelKey: 'tabs.insights' },
];

/** Podgląd paska zakładek na dashboardzie podczas fazy pre. */
export function CaretakerTourMockTabBar() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const guidedTour = useCaretakerGuidedTourOptional();

  const showMock =
    guidedTour?.active &&
    guidedTour.phase === 'pre' &&
    guidedTour.currentStepUsesMockTabs;

  if (!showMock) {
    return null;
  }

  const tabBarBottom =
    Platform.OS === 'android' ? Math.max(insets.bottom, 28) : Math.max(insets.bottom, 8);

  return (
    <View
      pointerEvents="none"
      style={[styles.shell, { paddingBottom: tabBarBottom, height: TAB_BAR_CONTENT_HEIGHT + tabBarBottom }]}
    >
      <CaretakerTourTarget stepId="dependent-tabs" wrapStyle={styles.tabBar}>
        <View style={styles.tabRow}>
          {TABS.map((tab) => (
            <View key={tab.labelKey} style={styles.tabItem}>
              <View style={styles.tabInner}>
                <MaterialIcons name={tab.name} size={24} color={Theme.colors.textLight} />
                <Text style={styles.tabLabel}>{t(tab.labelKey)}</Text>
              </View>
            </View>
          ))}
        </View>
      </CaretakerTourTarget>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
    backgroundColor: Theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    paddingTop: 8,
  },
  tabBar: {
    flex: 1,
    width: '100%',
  },
  tabRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  tabItem: {
    flex: 1,
  },
  tabInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabLabel: {
    fontSize: Theme.typography.small,
    fontWeight: '600',
    color: Theme.colors.textLight,
  },
});
