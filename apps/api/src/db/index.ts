import { Kysely, PostgresDialect, sql, type Transaction } from 'kysely';
import pg from 'pg';
import type { DB } from './types';

// numeric/bigint → number (values are kuruş / small decimals, far below 2^53); date stays 'YYYY-MM-DD'.
pg.types.setTypeParser(pg.types.builtins.INT8, (v) => Number(v));
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (v) => Number(v));
pg.types.setTypeParser(pg.types.builtins.DATE, (v) => v);

export type Db = Kysely<DB>;
export type Tx = Transaction<DB>;

export function createDb(opts: {
  connectionString: string;
  max?: number;
  statementTimeoutMs?: number;
}): Db {
  const pool = new pg.Pool({
    connectionString: opts.connectionString,
    max: opts.max ?? 10,
    statement_timeout: opts.statementTimeoutMs ?? 10_000,
    idle_in_transaction_session_timeout: 30_000,
  });
  return new Kysely<DB>({ dialect: new PostgresDialect({ pool }) });
}

/** Request context written into PostgreSQL settings; RLS policies read it (migrations/0001_init.sql). */
export interface DbContext {
  userId?: string | null;
  cafeId?: string | null;
  isAdmin?: boolean;
  /** Server-internal flows only (auth, roaster token page, jobs) — never from client input. */
  isSystem?: boolean;
  changeReason?: string | null;
}

/** Run `fn` in a transaction with the RLS context set (transaction-local, so pooled connections stay clean). */
export function withCtx<T>(db: Db, ctx: DbContext, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction().execute(async (tx) => {
    await sql`select
      set_config('app.user_id', ${ctx.userId ?? ''}, true),
      set_config('app.cafe_id', ${ctx.cafeId ?? ''}, true),
      set_config('app.is_admin', ${ctx.isAdmin ? 'true' : 'false'}, true),
      set_config('app.is_system', ${ctx.isSystem ? 'true' : 'false'}, true),
      set_config('app.change_reason', ${ctx.changeReason ?? ''}, true)`.execute(tx);
    return fn(tx);
  });
}

export const SYSTEM: DbContext = { isSystem: true };
