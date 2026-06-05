import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../../constants/theme';

export default function HybridTabsLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const tabBarBottom =
    Platform.OS === 'android' ? Math.max(insets.bottom, 28) : Math.max(insets.bottom, 8);

  return (
    <View style={{ flex: 1, backgroundColor: Theme.colors.background }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Theme.colors.accentOrange,
          tabBarInactiveTintColor: Theme.colors.textLight,
          tabBarStyle: {
            borderTopWidth: 1,
            borderTopColor: Theme.colors.border,
            height: 56 + tabBarBottom,
            paddingBottom: tabBarBottom,
            paddingTop: 8,
            backgroundColor: Theme.colors.background,
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
            title: t('tabs.settings'),
            tabBarIcon: ({ color }) => <MaterialIcons name="settings" size={24} color={color} />,
          }}
        />
      </Tabs>
    </View>
  );
}
