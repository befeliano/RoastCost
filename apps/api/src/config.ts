import { z } from 'zod';

const bool = z.enum(['true', 'false', '1', '0']).transform((v) => v === 'true' || v === '1');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  /** API connection — roastcost_app role (NO BYPASSRLS). */
  DATABASE_URL: z.string().min(1),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  DB_STATEMENT_TIMEOUT_MS: z.coerce.number().int().min(100).default(10_000),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  /** Public origin, e.g. https://api.ornek.com.tr — used in roaster links and e-mails. */
  PUBLIC_BASE_URL: z.url(),
  /** smtp(s)://user:pass@host:port — when empty, e-mails are logged (dev/test only). */
  SMTP_URL: z.string().optional(),
  MAIL_FROM: z.string().default('RoastCost <no-reply@example.com>'),
  TRUST_PROXY: bool.default(false),
  /** Contact shown in legal pages. */
  CONTACT_EMAIL: z.string().default('destek@example.com'),
  /** Data controller shown in legal pages. */
  DATA_CONTROLLER: z.string().default('[Veri sorumlusu adı / unvanı]'),
  RUN_JOBS: bool.default(true),
});

export type Config = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${msg}`);
  }
  if (parsed.data.NODE_ENV === 'production' && !parsed.data.SMTP_URL) {
    throw new Error('SMTP_URL is required in production');
  }
  return parsed.data;
}
