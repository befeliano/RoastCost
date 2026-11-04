import { LEGAL_VERSIONS } from '@roastcost/shared';
import { buildApp, type RoastApp } from '../src/app';
import { loadConfig } from '../src/config';
import { createDb, type Db } from '../src/db';
import { hashPassword } from '../src/lib/crypto';
import { memoryMailer } from '../src/lib/mailer';
import { APP_URL } from './env';
import { ownerPool } from './db-helpers';

export const PASSWORD = 'çokgizliparola-123';

export interface TestCtx {
  app: RoastApp;
  db: Db;
  mailer: ReturnType<typeof memoryMailer>;
  clock: { now: Date; advance(ms: number): void };
}

export async function makeTestApp(opts: { rateLimit?: boolean } = {}): Promise<TestCtx> {
  const config = loadConfig({
    NODE_ENV: 'test',
    DATABASE_URL: APP_URL,
    JWT_SECRET: 'test-secret-test-secret-test-secret-123',
    PUBLIC_BASE_URL: 'https://roastcost.test',
  } as NodeJS.ProcessEnv);
  const db = createDb({ connectionString: APP_URL, max: 5 });
  const mailer = memoryMailer();
  const clock = {
    now: new Date('2026-11-04T09:00:00Z'),
    advance(ms: number) {
      this.now = new Date(this.now.getTime() + ms);
    },
  };
  const app = await buildApp({
    config,
    db,
    mailer,
    clock: () => clock.now,
    rateLimit: opts.rateLimit ?? false,
  });
  return { app, db, mailer, clock };
}

export const consents = Object.entries(LEGAL_VERSIONS).map(([docType, docVersion]) => ({
  docType,
  docVersion,
}));

export async function register(t: TestCtx, email: string, cafeName = 'Test Kafe') {
  const r = await t.app.inject({
    method: 'POST',
    url: '/v1/auth/register',
    payload: {
      email,
      password: PASSWORD,
      cafeName,
      district: 'Tepebaşı',
      phone: '0532 111 22 33',
      consents,
    },
  });
  if (r.statusCode !== 201) throw new Error(`register failed ${r.statusCode} ${r.body}`);
  return r.json() as { accessToken: string; refreshToken: string };
}

export function bearer(token: string) {
  return { authorization: `Bearer ${token}` };
}

/** Token from the last e-mail sent to `to` (verify: /v/<t>, reset: /reset/<t>). */
export function mailToken(t: TestCtx, to: string, kind: 'v' | 'reset'): string {
  const m = t.mailer.last(to);
  const match = m && new RegExp(`/${kind}/([A-Za-z0-9_-]+)`).exec(m.text);
  if (!match?.[1]) throw new Error(`no ${kind} mail for ${to}`);
  return match[1];
}

export async function makeAdminUser(t: TestCtx, email = 'admin@test.local') {
  await ownerPool.query(
    `insert into users(email, password_hash, role, email_verified_at) values ($1, $2, 'admin', now())`,
    [email, await hashPassword(PASSWORD)],
  );
  const r = await t.app.inject({
    method: 'POST',
    url: '/v1/auth/login',
    payload: { email, password: PASSWORD },
  });
  return (r.json() as { accessToken: string }).accessToken;
}

/** Registered + verified + approved cafe. */
export async function approvedCafe(
  t: TestCtx,
  adminToken: string,
  email: string,
  name = 'Onaylı Kafe',
) {
  const s = await register(t, email, name);
  await t.app.inject({ method: 'POST', url: `/v/${mailToken(t, email, 'v')}` });
  const me = (
    await t.app.inject({ method: 'GET', url: '/v1/me', headers: bearer(s.accessToken) })
  ).json();
  await t.app.inject({
    method: 'POST',
    url: `/v1/admin/cafes/${me.cafe.id}/approve`,
    headers: bearer(adminToken),
    payload: {},
  });
  return { ...s, cafeId: me.cafe.id as string };
}

/** Admin creates a roaster with one product and tiers 1 kg = 1000 TL, 5 kg = 900 TL. */
export async function catalog(
  t: TestCtx,
  adminToken: string,
  name = 'Kavurucu A',
  phone = '05330000001',
) {
  const r = await t.app.inject({
    method: 'POST',
    url: '/v1/admin/roasters',
    headers: bearer(adminToken),
    payload: { name, whatsapp: phone, commissionRateBp: 1500, adminNotes: 'gizli' },
  });
  const roasterId = r.json().id as string;
  const p = await t.app.inject({
    method: 'POST',
    url: '/v1/admin/products',
    headers: bearer(adminToken),
    payload: { roasterId, name: 'Ev Harmanı', category: 'espresso' },
  });
  const productId = p.json().id as string;
  for (const [minKg, price] of [
    [1, 100_000],
    [5, 90_000],
  ]) {
    await t.app.inject({
      method: 'POST',
      url: '/v1/admin/price-tiers',
      headers: bearer(adminToken),
      payload: { productId, minKg, pricePerKgKurus: price },
    });
  }
  return { roasterId, productId };
}
