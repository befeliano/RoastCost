import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { runMigrations } from '../src/db/migrate';
import { APP_PASSWORD, MIGRATOR_PASSWORD, MIGRATOR_URL, SUPERUSER_URL, TEST_DB } from './env';

const here = path.dirname(fileURLToPath(import.meta.url));

/** Fresh database for every test run: roles → empty DB → all migrations (proves migrations run on a clean DB). */
export default async function setup(): Promise<void> {
  const su = new pg.Client({ connectionString: SUPERUSER_URL });
  await su.connect();
  try {
    const q = (s: string) => su.query(s);
    const lit = (s: string) => `'${s.replace(/'/g, "''")}'`;
    const roles = (
      await su.query<{ rolname: string }>(
        `select rolname from pg_roles where rolname in ('roastcost_migrator','roastcost_app')`,
      )
    ).rows.map((r) => r.rolname);
    if (!roles.includes('roastcost_migrator'))
      await q(`create role roastcost_migrator login password ${lit(MIGRATOR_PASSWORD)}`);
    if (!roles.includes('roastcost_app'))
      await q(
        `create role roastcost_app login password ${lit(APP_PASSWORD)} nosuperuser nobypassrls`,
      );
    await q(
      `select pg_terminate_backend(pid) from pg_stat_activity where datname = ${lit(TEST_DB)} and pid <> pg_backend_pid()`,
    );
    await q(`drop database if exists ${TEST_DB}`);
    await q(`create database ${TEST_DB} owner roastcost_migrator`);
  } finally {
    await su.end();
  }
  const db = new pg.Client({ connectionString: SUPERUSER_URL.replace(/\/[^/]*$/, `/${TEST_DB}`) });
  await db.connect();
  try {
    await db.query(`alter schema public owner to roastcost_migrator;
      revoke create on schema public from public;
      grant usage on schema public to roastcost_app;`);
    // extensions are created by the migration itself (proves 0001 is self-contained)
  } finally {
    await db.end();
  }
  await runMigrations(MIGRATOR_URL, path.resolve(here, '../migrations'));
}
