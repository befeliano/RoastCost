import type { Tx } from '../db';

export async function audit(
  tx: Tx,
  entry: {
    actorUserId: string | null;
    action: string;
    entity: string;
    entityId?: string | null;
    before?: unknown;
    after?: unknown;
  },
): Promise<void> {
  await tx
    .insertInto('audit_logs')
    .values({
      actor_user_id: entry.actorUserId,
      action: entry.action,
      entity: entry.entity,
      entity_id: entry.entityId ?? null,
      before: entry.before === undefined ? null : JSON.stringify(entry.before),
      after: entry.after === undefined ? null : JSON.stringify(entry.after),
    })
    .execute();
}
