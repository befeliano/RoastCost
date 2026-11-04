import { Tabs } from 'expo-router/js-tabs';
import { useTabOptions } from '@/components/TabBar';
import { t } from '@/locales';

export default function AdminTabs() {
  const { screenOptions, tab } = useTabOptions();
  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen name="panel" options={tab(t('tabs.panel'), 'chart')} />
      <Tabs.Screen name="cafes" options={tab(t('tabs.cafes'), 'store')} />
      <Tabs.Screen name="catalog" options={tab(t('tabs.catalog'), 'bean')} />
      <Tabs.Screen name="commission" options={tab(t('tabs.commission'), 'box')} />
      <Tabs.Screen name="audit" options={tab(t('tabs.audit'), 'history')} />
    </Tabs>
  );
}
