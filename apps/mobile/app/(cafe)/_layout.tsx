import { Redirect, Stack } from 'expo-router';
import { useSession } from '@/store/session';
import { colors } from '@/theme';

export default function CafeLayout() {
  const role = useSession((s) => s.me?.user.role);
  if (role === 'admin') return <Redirect href="/panel" />;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
  );
}
