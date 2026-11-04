/** Test database settings. Override with env vars in CI. */
export const TEST_DB = process.env.TEST_DB_NAME ?? 'roastcost_test';
const host = process.env.TEST_PG_HOST ?? '127.0.0.1';
const port = process.env.TEST_PG_PORT ?? '5432';
export const SUPERUSER_URL =
  process.env.TEST_PG_SUPERUSER_URL ??
  `postgres://postgres:${process.env.TEST_PG_SUPERUSER_PASSWORD ?? 'postgres'}@${host}:${port}/postgres`;
export const MIGRATOR_PASSWORD = process.env.TEST_MIGRATOR_PASSWORD ?? 'migrator_dev';
export const APP_PASSWORD = process.env.TEST_APP_PASSWORD ?? 'app_dev';
export const MIGRATOR_URL = `postgres://roastcost_migrator:${MIGRATOR_PASSWORD}@${host}:${port}/${TEST_DB}`;
export const APP_URL = `postgres://roastcost_app:${APP_PASSWORD}@${host}:${port}/${TEST_DB}`;
