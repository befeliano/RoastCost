import { Redirect, Stack } from 'expo-router';
import { useSession } from '@/store/session';
import { colors } from '@/theme';

export default function AdminLayout() {
  const role = useSession((s) => s.me?.user.role);
  if (role && role !== 'admin') return <Redirect href="/cost" />;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
  );
}
