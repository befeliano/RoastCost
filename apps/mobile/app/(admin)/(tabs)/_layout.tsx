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

export default function AdminTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11 },
      }}
    >
      <Tabs.Screen name="panel" options={tab(t('tabs.panel'), 'chart')} />
      <Tabs.Screen name="cafes" options={tab(t('tabs.cafes'), 'store')} />
      <Tabs.Screen name="catalog" options={tab(t('tabs.catalog'), 'bean')} />
      <Tabs.Screen name="commission" options={tab(t('tabs.commission'), 'box')} />
      <Tabs.Screen name="audit" options={tab(t('tabs.audit'), 'history')} />
    </Tabs>
  );
}
