import { Tabs } from 'expo-router/js-tabs';
import { Icon, type IconName } from '@/components/Icon';
import { t } from '@/locales';
import { colors, fonts } from '@/theme';

const tab = (title: string, icon: IconName) => ({
  title,
  tabBarIcon: ({ color }: { color: unknown }) => (
    <Icon name={icon} color={typeof color === 'string' ? color : colors.textMuted} size={24} />
  ),
  tabBarAccessibilityLabel: title,
});

export default function CafeTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11 },
        tabBarStyle: { borderTopColor: colors.border, backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="cost" options={tab(t('tabs.cost'), 'cup')} />
      <Tabs.Screen name="recipes" options={tab(t('tabs.recipes'), 'book')} />
      <Tabs.Screen name="roasters" options={tab(t('tabs.roasters'), 'bean')} />
      <Tabs.Screen name="orders" options={tab(t('tabs.orders'), 'box')} />
      <Tabs.Screen name="settings" options={tab(t('tabs.settings'), 'gear')} />
    </Tabs>
  );
}
