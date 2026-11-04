import { Redirect } from 'expo-router';
import { useSession } from '@/store/session';

/** Entry: route by session and role. */
export default function Index() {
  const { status, me } = useSession();
  if (status !== 'signedIn') return <Redirect href="/welcome" />;
  if (me && me.missingConsents.length > 0) return <Redirect href="/consents" />;
  if (me?.user.role === 'admin') return <Redirect href="/panel" />;
  return <Redirect href="/cost" />;
}
