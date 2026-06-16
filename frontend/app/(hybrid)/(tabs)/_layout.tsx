import { Tabs, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Platform, View } from 'react-native';
import { useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../../constants/theme';
import { useSeniorGuidedTourOptional } from '../../../context/SeniorGuidedTourContext';
import { useDependentDisplay } from '../../../context/DependentDisplayContext';

export default function HybridTabsLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors } = useDependentDisplay();
  const guidedTour = useSeniorGuidedTourOptional();
  const tabBarBottom =
    Platform.OS === 'android' ? Math.max(insets.bottom, 28) : Math.max(insets.bottom, 8);

  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => {
        guidedTour?.tryStartTour();
      }, Platform.OS === 'web' ? 500 : 700);
      return () => clearTimeout(timer);
    }, [guidedTour]),
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.accentOrange,
          tabBarInactiveTintColor: colors.textLight,
          tabBarStyle: {
            borderTopWidth: 1,
            borderTopColor: colors.border,
            height: 56 + tabBarBottom,
            paddingBottom: tabBarBottom,
            paddingTop: 8,
            backgroundColor: colors.background,
            elevation: 0,
          },
          tabBarLabelStyle: {
            fontSize: Theme.typography.small,
            fontWeight: '600',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t('tabs.today'),
            tabBarIcon: ({ color }) => <MaterialIcons name="home" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            title: t('tabs.calendar'),
            tabBarIcon: ({ color }) => <MaterialIcons name="calendar-today" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="treatments"
          options={{
            title: t('tabs.treatment'),
            tabBarIcon: ({ color }) => <MaterialIcons name="healing" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="insights"
          options={{
            title: t('tabs.insights'),
            tabBarIcon: ({ color }) => <MaterialIcons name="show-chart" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            href: null,
            title: t('tabs.settings'),
          }}
        />
      </Tabs>
    </View>
  );
}
