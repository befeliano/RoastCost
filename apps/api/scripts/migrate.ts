import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runMigrations } from '../src/db/migrate';

try {
  process.loadEnvFile?.();
} catch {
  /* no .env */
}
const url = process.env.MIGRATOR_DATABASE_URL;
if (!url) {
  console.error('MIGRATOR_DATABASE_URL is not set');
  process.exit(1);
}
const here = path.dirname(fileURLToPath(import.meta.url));
const dir = process.env.MIGRATIONS_DIR ?? path.resolve(here, '../migrations');
const applied = await runMigrations(url, dir, (m) => console.log(m));
console.log(applied.length ? `applied ${applied.length} migration(s)` : 'database is up to date');
