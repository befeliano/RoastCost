import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

/**
 * Minimal forward-only migrator: applies numbered *.sql files in order, each in its own transaction,
 * and records them in schema_migrations. Must run as the schema owner (roastcost_migrator).
 */
export async function runMigrations(
  connectionString: string,
  dir: string,
  log: (m: string) => void = () => {},
): Promise<string[]> {
  const client = new pg.Client({ connectionString });
  await client.connect();
  const applied: string[] = [];
  try {
    await client.query('select pg_advisory_lock(727274)');
    await client.query(`create table if not exists schema_migrations (
      name text primary key, applied_at timestamptz not null default now())`);
    const done = new Set(
      (await client.query<{ name: string }>('select name from schema_migrations')).rows.map(
        (r) => r.name,
      ),
    );
    const files = (await readdir(dir)).filter((f) => /^\d{4}_.+\.sql$/.test(f)).sort();
    for (const f of files) {
      if (done.has(f)) continue;
      const body = await readFile(path.join(dir, f), 'utf8');
      log(`applying ${f}`);
      await client.query('begin');
      try {
        await client.query(body);
        await client.query('insert into schema_migrations(name) values ($1)', [f]);
        await client.query('commit');
        applied.push(f);
      } catch (e) {
        await client.query('rollback');
        throw new Error(`migration ${f} failed: ${(e as Error).message}`);
      }
    }
  } finally {
    await client.query('select pg_advisory_unlock(727274)').catch(() => {});
    await client.end();
  }
  return applied;
}
