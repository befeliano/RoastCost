import { ORDER_EXPIRE_DAYS } from '@roastcost/shared';
import cron from 'node-cron';
import type { Deps } from '../app';
import { SYSTEM, withCtx } from '../db';
import { addDays } from '../lib/time';

/** sent orders without a decision for 14 days → expired (spec §8.4). Returns affected count. */
export async function expireStaleOrders(deps: Pick<Deps, 'db' | 'clock'>): Promise<number> {
  const cutoff = addDays(deps.clock(), -ORDER_EXPIRE_DAYS);
  return withCtx(deps.db, SYSTEM, async (tx) => {
    const r = await tx
      .updateTable('orders')
      .set({ status: 'expired' })
      .where('status', '=', 'sent')
      .where('decided_at', 'is', null)
      .where('sent_at', '<', cutoff)
      .executeTakeFirst();
    return Number(r.numUpdatedRows);
  });
}

/** Remove expired/used tokens (refresh: 7 days after expiry/revocation; e-mail tokens: 7 days). */
export async function cleanupTokens(
  deps: Pick<Deps, 'db' | 'clock'>,
): Promise<{ refresh: number; email: number }> {
  const cutoff = addDays(deps.clock(), -7);
  return withCtx(deps.db, SYSTEM, async (tx) => {
    const r = await tx
      .deleteFrom('refresh_tokens')
      .where((eb) => eb.or([eb('expires_at', '<', cutoff), eb('revoked_at', '<', cutoff)]))
      .executeTakeFirst();
    const e = await tx
      .deleteFrom('email_tokens')
      .where((eb) => eb.or([eb('expires_at', '<', cutoff), eb('used_at', '<', cutoff)]))
      .executeTakeFirst();
    return { refresh: Number(r.numDeletedRows), email: Number(e.numDeletedRows) };
  });
}

export function startJobs(
  deps: Deps,
  log: { info: (o: object, m: string) => void; error: (o: object, m: string) => void },
) {
  const run = (name: string, fn: () => Promise<unknown>) => async () => {
    try {
      log.info({ job: name, result: await fn() }, 'job done');
    } catch (err) {
      log.error({ job: name, err }, 'job failed');
    }
  };
  const tasks = [
    cron.schedule(
      '17 * * * *',
      run('expire-orders', () => expireStaleOrders(deps)),
      { timezone: 'Europe/Istanbul' },
    ),
    cron.schedule(
      '43 4 * * *',
      run('cleanup-tokens', () => cleanupTokens(deps)),
      { timezone: 'Europe/Istanbul' },
    ),
  ];
  return () => tasks.forEach((t) => t.stop());
}
