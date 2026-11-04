import { useCatalog } from '@/features/catalog/store';
import { queryClient } from '@/lib/query';
import { useCart } from '@/store/cart';
import { useSession } from '@/store/session';

/** Sign out and wipe every device cache of this account. */
export async function signOutEverywhere() {
  await useSession.getState().signOut();
  queryClient.clear();
  useCart.getState().clearAll();
  await useCatalog.getState().reset();
}
