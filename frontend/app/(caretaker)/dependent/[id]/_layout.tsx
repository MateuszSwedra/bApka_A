import { Tabs, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Theme } from '../../../../constants/theme';
import { View, Pressable, Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DependentTabsLayout() {
  const insets = useSafeAreaInsets();
  const tabBarBottom =
    Platform.OS === 'android' ? Math.max(insets.bottom, 28) : Math.max(insets.bottom, 8);

  return (
    <View style={{ flex: 1, backgroundColor: Theme.colors.background }}>
      {/* Header wspólny dla wszystkich zakładek */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: Theme.spacing.l,
        paddingTop: Theme.spacing.xxl,
        backgroundColor: Theme.colors.surfaceWhite,
        borderBottomWidth: 1,
        borderBottomColor: Theme.colors.border,
      }}>
        <Pressable onPress={() => router.push('/(caretaker)')} style={{ padding: 4 }}>
          <MaterialIcons name="arrow-back" size={28} color={Theme.colors.textDark} />
        </Pressable>
        <Text style={{
          fontSize: Theme.typography.title,
          fontWeight: '800',
          color: Theme.colors.textDark,
          marginLeft: Theme.spacing.m,
        }}>Profil Podopiecznego</Text>
      </View>

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
            title: 'Today',
            tabBarIcon: ({ color }) => <MaterialIcons name="home" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            title: 'Calendar',
            tabBarIcon: ({ color }) => <MaterialIcons name="calendar-today" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="treatments"
          options={{
            title: 'Treatment',
            tabBarIcon: ({ color }) => <MaterialIcons name="healing" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="insights"
          options={{
            title: 'Insights',
            tabBarIcon: ({ color }) => <MaterialIcons name="show-chart" size={24} color={color} />,
          }}
        />
      </Tabs>
    </View>
  );
}
