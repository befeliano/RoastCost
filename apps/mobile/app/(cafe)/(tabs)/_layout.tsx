import { Tabs } from 'expo-router/js-tabs';
import { useTabOptions } from '@/components/TabBar';
import { t } from '@/locales';

export default function CafeTabs() {
  const { screenOptions, tab } = useTabOptions();
  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen name="explore" options={tab(t('tabs.explore'), 'store')} />
      <Tabs.Screen name="cost" options={tab(t('tabs.cost'), 'cup')} />
      <Tabs.Screen name="recipes" options={tab(t('tabs.recipes'), 'book')} />
      <Tabs.Screen name="orders" options={tab(t('tabs.orders'), 'box')} />
      <Tabs.Screen name="settings" options={tab(t('tabs.settings'), 'gear')} />
    </Tabs>
  );
}
