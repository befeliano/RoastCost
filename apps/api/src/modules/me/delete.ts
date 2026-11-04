import type { Deps } from '../../app';
import { SYSTEM, withCtx } from '../../db';
import { audit } from '../../lib/audit';
import { getDummyHash, verifyPassword } from '../../lib/crypto';
import { revokeAllSessions } from '../auth/service';
import { emailSchema } from '@roastcost/shared';

/**
 * Account deletion (Apple 5.1.1 / Google Play): personal data is anonymised, tenant data removed,
 * order amounts/dates kept (without personal data) only for commission bookkeeping.
 * Runs in system context because it touches protected columns by design.
 */
export async function deleteAccount(
  deps: Deps,
  userId: string,
  cafeId: string | null,
): Promise<void> {
  const now = deps.clock();
  await withCtx(deps.db, { ...SYSTEM, userId }, async (tx) => {
    await tx
      .updateTable('users')
      .set({
        email: `deleted-${userId}@deleted.invalid`,
        password_hash: '!deleted',
        deleted_at: now,
        email_verified_at: null,
      })
      .where('id', '=', userId)
      .execute();
    if (cafeId) {
      await tx
        .updateTable('cafes')
        .set({
          name: 'Silinmiş kafe',
          district: 'Silindi',
          phone_e164: '+900000000000',
          status_note: null,
          deleted_at: now,
          status: 'suspended',
        })
        .where('id', '=', cafeId)
        .execute();
      await tx.deleteFrom('recipes').where('cafe_id', '=', cafeId).execute();
      await tx.deleteFrom('cafe_ingredients').where('cafe_id', '=', cafeId).execute();
      await tx.deleteFrom('cafe_settings').where('cafe_id', '=', cafeId).execute();
      await tx
        .updateTable('orders')
        .set({
          cafe_name_snapshot: 'Silinmiş kafe',
          cafe_phone_snapshot: '+900000000000',
          note: null,
          token_hash: null,
        })
        .where('cafe_id', '=', cafeId)
        .execute();
    }
    await tx.deleteFrom('email_tokens').where('user_id', '=', userId).execute();
    await revokeAllSessions(tx, userId, now);
    await audit(tx, {
      actorUserId: userId,
      action: 'account.delete',
      entity: 'user',
      entityId: userId,
    });
  });
}

/** Web form (/account-deletion). Admin accounts cannot be deleted this way. */
export async function deleteAccountByCredentials(
  deps: Deps,
  rawEmail: string,
  password: string,
): Promise<boolean> {
  const email = emailSchema.safeParse(rawEmail);
  if (!email.success || !password) return false;
  const u = await withCtx(deps.db, SYSTEM, async (tx) => {
    const user = await tx
      .selectFrom('users')
      .select(['id', 'password_hash', 'role'])
      .where('email', '=', email.data)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
    if (!user) return null;
    const m = await tx
      .selectFrom('cafe_members')
      .select('cafe_id')
      .where('user_id', '=', user.id)
      .executeTakeFirst();
    return { ...user, cafeId: m?.cafe_id ?? null };
  });
  if (!u) {
    await verifyPassword(await getDummyHash(), password);
    return false;
  }
  if (u.role === 'admin' || !(await verifyPassword(u.password_hash, password))) return false;
  await deleteAccount(deps, u.id, u.cafeId);
  return true;
}
