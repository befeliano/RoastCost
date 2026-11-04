import pg from 'pg';
import { APP_URL, MIGRATOR_URL } from './env';

/** Owner connection: bypasses RLS (table owner). Only for fixtures and cleanup. */
export const ownerPool = new pg.Pool({ connectionString: MIGRATOR_URL, max: 3 });
/** Application connection: RLS enforced. */
export const appPool = new pg.Pool({ connectionString: APP_URL, max: 3 });

const TABLES = [
  'audit_logs',
  'price_tier_history',
  'order_items',
  'orders',
  'price_tiers',
  'products',
  'roaster_admin',
  'roasters',
  'recipe_ingredients',
  'recipes',
  'cafe_ingredients',
  'cafe_settings',
  'consents',
  'email_tokens',
  'refresh_tokens',
  'cafe_members',
  'cafes',
  'users',
];

export async function truncateAll(): Promise<void> {
  await ownerPool.query(`truncate ${TABLES.join(', ')} restart identity cascade`);
}

export interface Ctx {
  userId?: string;
  cafeId?: string;
  isAdmin?: boolean;
  isSystem?: boolean;
  reason?: string;
}

/** Run SQL as roastcost_app inside a transaction with RLS context; always rolls back unless commit=true. */
export async function asApp<T>(
  ctx: Ctx,
  fn: (c: pg.PoolClient) => Promise<T>,
  commit = false,
): Promise<T> {
  const c = await appPool.connect();
  try {
    await c.query('begin');
    await c.query(
      `select set_config('app.user_id', $1, true), set_config('app.cafe_id', $2, true),
              set_config('app.is_admin', $3, true), set_config('app.is_system', $4, true),
              set_config('app.change_reason', $5, true)`,
      [
        ctx.userId ?? '',
        ctx.cafeId ?? '',
        ctx.isAdmin ? 'true' : 'false',
        ctx.isSystem ? 'true' : 'false',
        ctx.reason ?? '',
      ],
    );
    const r = await fn(c);
    await c.query(commit ? 'commit' : 'rollback');
    return r;
  } catch (e) {
    await c.query('rollback').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

export async function insertOwner<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T> {
  const r = await ownerPool.query(sql, params);
  return r.rows[0] as T;
}

/** Fixture: user + cafe + membership + settings. */
export async function makeCafe(
  name: string,
  status: 'pending' | 'approved' | 'rejected' | 'suspended' = 'approved',
) {
  const user = await insertOwner<{ id: string }>(
    `insert into users(email, password_hash, email_verified_at) values ($1, 'x', now()) returning id`,
    [
      `${name.toLowerCase().replace(/\W/g, '')}-${Math.random().toString(36).slice(2, 8)}@test.local`,
    ],
  );
  const cafe = await insertOwner<{ id: string }>(
    `insert into cafes(name, district, phone_e164, status) values ($1, 'Tepebaşı', '+905320000000', $2) returning id`,
    [name, status],
  );
  await ownerPool.query(`insert into cafe_members(cafe_id, user_id) values ($1, $2)`, [
    cafe.id,
    user.id,
  ]);
  await ownerPool.query(`insert into cafe_settings(cafe_id) values ($1)`, [cafe.id]);
  return { userId: user.id, cafeId: cafe.id };
}

export async function makeAdmin() {
  return insertOwner<{ id: string }>(
    `insert into users(email, password_hash, role, email_verified_at) values ($1, 'x', 'admin', now()) returning id`,
    [`admin-${Math.random().toString(36).slice(2, 8)}@test.local`],
  );
}

export async function makeCatalog() {
  const roaster = await insertOwner<{ id: string }>(
    `insert into roasters(name, whatsapp_e164) values ('Test Kavurucu', '+905330000000') returning id`,
  );
  await ownerPool.query(
    `insert into roaster_admin(roaster_id, commission_rate_bp, admin_notes) values ($1, 1500, 'gizli not')`,
    [roaster.id],
  );
  const product = await insertOwner<{ id: string }>(
    `insert into products(roaster_id, name, category) values ($1, 'Test Blend', 'espresso') returning id`,
    [roaster.id],
  );
  const tier = await insertOwner<{ id: string }>(
    `insert into price_tiers(product_id, min_kg, price_per_kg_kurus) values ($1, 1, 100000) returning id`,
    [product.id],
  );
  return { roasterId: roaster.id, productId: product.id, tierId: tier.id };
}
