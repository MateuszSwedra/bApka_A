import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../constants/theme';

export default function HybridLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const tabBarBottom =
    Platform.OS === 'android' ? Math.max(insets.bottom, 28) : Math.max(insets.bottom, 8);

  return (
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
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.today'),
          tabBarIcon: ({ color }) => <MaterialIcons name="calendar-today" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="meds"
        options={{
          title: t('tabs.meds'),
          tabBarIcon: ({ color }) => <MaterialIcons name="medication" size={24} color={color} />,
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
        name="more"
        options={{
          title: t('tabs.more'),
          tabBarIcon: ({ color }) => <MaterialIcons name="menu" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
