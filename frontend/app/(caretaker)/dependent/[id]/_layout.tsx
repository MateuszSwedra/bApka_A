import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Theme } from '../../../../constants/theme';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { CaretakerTabBarTour } from '../../../../components/caretaker/CaretakerTabBarTour';
import { buildBottomTabScreenOptions } from '../../../../utils/bottomTabScreenOptions';

export default function DependentTabsLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: Theme.colors.background }}>
      <Tabs screenOptions={buildBottomTabScreenOptions(insets.bottom)}>
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
      <CaretakerTabBarTour />
    </View>
  );
}
