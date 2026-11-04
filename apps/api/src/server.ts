import { buildApp } from './app';
import { loadConfig } from './config';
import { createDb } from './db';
import { startJobs } from './jobs';
import { memoryMailer, smtpMailer } from './lib/mailer';

try {
  process.loadEnvFile?.();
} catch {
  /* no .env file — rely on the environment */
}

const config = loadConfig();
const db = createDb({
  connectionString: config.DATABASE_URL,
  max: config.DB_POOL_MAX,
  statementTimeoutMs: config.DB_STATEMENT_TIMEOUT_MS,
});
const mailer = config.SMTP_URL
  ? smtpMailer(config.SMTP_URL, config.MAIL_FROM)
  : memoryMailer((m) => console.log(m));
const app = await buildApp({ config, db, mailer });
const stopJobs = config.RUN_JOBS ? startJobs(app.deps, app.log) : () => {};

const shutdown = async (signal: string) => {
  app.log.info({ signal }, 'shutting down');
  stopJobs();
  await app.close();
  await db.destroy();
  process.exit(0);
};
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

await app.listen({ host: config.HOST, port: config.PORT });
