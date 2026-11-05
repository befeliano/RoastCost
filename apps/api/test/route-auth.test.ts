import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app';
import { loadConfig } from '../src/config';
import { createDb } from '../src/db';
import { memoryMailer } from '../src/lib/mailer';
import { APP_URL } from './env';

// Endpoints that are meant to be called without a session.
const PUBLIC = new Set([
  'POST /v1/auth/register',
  'POST /v1/auth/login',
  'POST /v1/auth/refresh',
  'POST /v1/auth/logout',
  'POST /v1/auth/verify-email',
  'POST /v1/auth/forgot-password',
  'POST /v1/auth/reset-password',
  'POST /v1/auth/resend-verification',
]);

const routes: { method: string; url: string }[] = [];
let app: Awaited<ReturnType<typeof buildApp>>;
let db: ReturnType<typeof createDb>;

beforeAll(async () => {
  const config = loadConfig({
    NODE_ENV: 'test',
    DATABASE_URL: APP_URL,
    JWT_SECRET: 'test-secret-test-secret-test-secret-123',
    PUBLIC_BASE_URL: 'https://roastcost.test',
  } as NodeJS.ProcessEnv);
  db = createDb({ connectionString: APP_URL, max: 2 });
  app = await buildApp({
    config,
    db,
    mailer: memoryMailer(),
    rateLimit: false,
    onRoute: (r) => {
      for (const m of [r.method].flat())
        if (m !== 'HEAD' && m !== 'OPTIONS') routes.push({ method: m, url: r.url });
    },
  });
  await app.ready();
});
afterAll(async () => {
  await app.close();
  await db.destroy();
});

describe('authorization (every protected route)', () => {
  it('rejects anonymous calls to every /v1 route except the public auth endpoints', async () => {
    const v1 = routes.filter(
      (r) => r.url.startsWith('/v1/') && !PUBLIC.has(`${r.method} ${r.url}`),
    );
    expect(v1.length).toBeGreaterThan(20);
    const open: string[] = [];
    for (const r of v1) {
      const url = r.url.replace(/:[a-zA-Z]+/g, '00000000-0000-4000-8000-000000000000');
      const res = await app.inject({
        method: r.method as 'GET',
        url,
        payload: r.method === 'GET' ? undefined : {},
      });
      if (res.statusCode !== 401) open.push(`${r.method} ${r.url} → ${res.statusCode}`);
    }
    expect(open).toEqual([]);
  });
});
