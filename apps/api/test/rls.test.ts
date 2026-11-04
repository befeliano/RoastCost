import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  appPool,
  asApp,
  insertOwner,
  makeAdmin,
  makeCafe,
  makeCatalog,
  ownerPool,
  truncateAll,
} from './db-helpers';

/**
 * Spec §6 / §13 / §16: Row Level Security must hold even when the API layer is bypassed,
 * i.e. when SQL runs directly as roastcost_app.
 */
afterAll(async () => {
  await appPool.end();
  await ownerPool.end();
});

describe('database roles', () => {
  it('roastcost_app is not superuser and cannot bypass RLS', async () => {
    const r = await appPool.query(
      `select rolsuper, rolbypassrls from pg_roles where rolname = current_user`,
    );
    expect(r.rows[0]).toEqual({ rolsuper: false, rolbypassrls: false });
  });
});

describe('tenant isolation (RLS)', () => {
  beforeEach(truncateAll);

  it('a cafe sees only its own cafe, settings, recipes and orders', async () => {
    const a = await makeCafe('Kafe A');
    const b = await makeCafe('Kafe B');
    const { roasterId } = await makeCatalog();
    await ownerPool.query(
      `insert into recipes(cafe_id, name) values ($1, 'A latte'), ($2, 'B latte')`,
      [a.cafeId, b.cafeId],
    );
    await ownerPool.query(
      `insert into orders(cafe_id, roaster_id, cafe_name_snapshot, cafe_phone_snapshot, roaster_name_snapshot)
       values ($1, $3, 'A', '+905320000000', 'R'), ($2, $3, 'B', '+905320000000', 'R')`,
      [a.cafeId, b.cafeId, roasterId],
    );

    await asApp({ userId: a.userId, cafeId: a.cafeId }, async (c) => {
      expect((await c.query('select id from cafes')).rows.map((r) => r.id)).toEqual([a.cafeId]);
      expect(
        (await c.query('select cafe_id from cafe_settings')).rows.map((r) => r.cafe_id),
      ).toEqual([a.cafeId]);
      expect((await c.query('select name from recipes')).rows.map((r) => r.name)).toEqual([
        'A latte',
      ]);
      expect((await c.query('select cafe_id from orders')).rows.map((r) => r.cafe_id)).toEqual([
        a.cafeId,
      ]);
      // explicit filter on the other tenant returns nothing
      expect((await c.query('select * from recipes where cafe_id = $1', [b.cafeId])).rowCount).toBe(
        0,
      );
      // update/delete on the other tenant affects 0 rows
      expect(
        (
          await c.query(`update cafe_settings set cup_cost_kurus = 1 where cafe_id = $1`, [
            b.cafeId,
          ])
        ).rowCount,
      ).toBe(0);
      expect((await c.query(`delete from recipes where cafe_id = $1`, [b.cafeId])).rowCount).toBe(
        0,
      );
    });
    const stillThere = await ownerPool.query(`select 1 from recipes where cafe_id = $1`, [
      b.cafeId,
    ]);
    expect(stillThere.rowCount).toBe(1);
  });

  it('a cafe cannot insert data into another tenant', async () => {
    const a = await makeCafe('Kafe A');
    const b = await makeCafe('Kafe B');
    await expect(
      asApp({ userId: a.userId, cafeId: a.cafeId }, (c) =>
        c.query(`insert into recipes(cafe_id, name) values ($1, 'hack')`, [b.cafeId]),
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(
      asApp({ userId: a.userId, cafeId: a.cafeId }, (c) =>
        c.query(
          `insert into cafe_ingredients(cafe_id, name, kind, price_per_liter_kurus) values ($1, 'Süt', 'milk', 1)`,
          [b.cafeId],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it('a recipe cannot use an ingredient of another cafe', async () => {
    const a = await makeCafe('Kafe A');
    const b = await makeCafe('Kafe B');
    const recipe = await insertOwner<{ id: string }>(
      `insert into recipes(cafe_id, name) values ($1, 'Latte') returning id`,
      [a.cafeId],
    );
    const foreign = await insertOwner<{ id: string }>(
      `insert into cafe_ingredients(cafe_id, name, kind, price_per_liter_kurus) values ($1, 'Süt', 'milk', 4000) returning id`,
      [b.cafeId],
    );
    await expect(
      asApp({ userId: a.userId, cafeId: a.cafeId }, (c) =>
        c.query(
          `insert into recipe_ingredients(recipe_id, ingredient_id, quantity_ml) values ($1, $2, 200)`,
          [recipe.id, foreign.id],
        ),
      ),
    ).rejects.toThrow(/does not belong|violates/);
  });

  it('without context nothing is visible', async () => {
    await makeCafe('Kafe A');
    await makeCatalog();
    await asApp({}, async (c) => {
      for (const t of [
        'users',
        'cafes',
        'cafe_settings',
        'recipes',
        'orders',
        'roasters',
        'products',
        'price_tiers',
        'roaster_admin',
        'email_tokens',
      ]) {
        expect((await c.query(`select * from ${t}`)).rowCount, t).toBe(0);
      }
    });
  });

  it('pending cafe cannot read the catalog; approved cafe can', async () => {
    const pending = await makeCafe('Bekleyen', 'pending');
    const approved = await makeCafe('Onaylı', 'approved');
    const suspended = await makeCafe('Askıda', 'suspended');
    await makeCatalog();
    for (const k of [pending, suspended]) {
      await asApp(k, async (c) => {
        expect((await c.query('select * from roasters')).rowCount).toBe(0);
        expect((await c.query('select * from products')).rowCount).toBe(0);
        expect((await c.query('select * from price_tiers')).rowCount).toBe(0);
      });
    }
    await asApp(approved, async (c) => {
      expect((await c.query('select * from roasters')).rowCount).toBe(1);
      expect((await c.query('select * from products')).rowCount).toBe(1);
      expect((await c.query('select * from price_tiers')).rowCount).toBe(1);
    });
  });

  it('cafes never see roaster_admin (commission rate, notes)', async () => {
    const a = await makeCafe('Kafe A');
    await makeCatalog();
    await asApp(a, async (c) => {
      expect((await c.query('select * from roaster_admin')).rowCount).toBe(0);
    });
  });

  it('cafes cannot write the catalog', async () => {
    const a = await makeCafe('Kafe A');
    const { productId, roasterId } = await makeCatalog();
    await asApp(a, async (c) => {
      expect(
        (
          await c.query(`update price_tiers set price_per_kg_kurus = 1 where product_id = $1`, [
            productId,
          ])
        ).rowCount,
      ).toBe(0);
      expect((await c.query(`delete from roasters where id = $1`, [roasterId])).rowCount).toBe(0);
    });
    await expect(
      asApp(a, (c) =>
        c.query(`insert into roasters(name, whatsapp_e164) values ('X', '+905330000001')`),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it('a cafe cannot approve itself', async () => {
    const p = await makeCafe('Bekleyen', 'pending');
    await expect(
      asApp(p, (c) => c.query(`update cafes set status = 'approved' where id = $1`, [p.cafeId])),
    ).rejects.toThrow(/only be changed by an admin/);
    // ordinary fields are fine
    await asApp(p, async (c) => {
      expect(
        (await c.query(`update cafes set name = 'Yeni Ad' where id = $1`, [p.cafeId])).rowCount,
      ).toBe(1);
    });
  });

  it('a user cannot promote themselves to admin', async () => {
    const a = await makeCafe('Kafe A');
    await expect(
      asApp(a, (c) => c.query(`update users set role = 'admin' where id = $1`, [a.userId])),
    ).rejects.toThrow(/role can only/);
  });

  it('a cafe cannot touch commission/decision fields of its order', async () => {
    const a = await makeCafe('Kafe A');
    const { roasterId } = await makeCatalog();
    const o = await insertOwner<{ id: string }>(
      `insert into orders(cafe_id, roaster_id, cafe_name_snapshot, cafe_phone_snapshot, roaster_name_snapshot)
       values ($1, $2, 'A', '+905320000000', 'R') returning id`,
      [a.cafeId, roasterId],
    );
    await expect(
      asApp(a, (c) =>
        c.query(`update orders set commission_status = 'waived' where id = $1`, [o.id]),
      ),
    ).rejects.toThrow(/not writable by cafes/);
    await expect(
      asApp(a, (c) => c.query(`update orders set subtotal_kurus = 1 where id = $1`, [o.id])),
    ).rejects.toThrow(/not writable by cafes/);
    await asApp(a, async (c) => {
      expect(
        (await c.query(`update orders set status = 'cancelled' where id = $1`, [o.id])).rowCount,
      ).toBe(1);
    });
  });

  it('only one first order per cafe↔roaster pair', async () => {
    const a = await makeCafe('Kafe A');
    const { roasterId } = await makeCatalog();
    const ins = `insert into orders(cafe_id, roaster_id, cafe_name_snapshot, cafe_phone_snapshot, roaster_name_snapshot, is_first_order)
                 values ($1, $2, 'A', '+905320000000', 'R', true)`;
    await ownerPool.query(ins, [a.cafeId, roasterId]);
    await expect(ownerPool.query(ins, [a.cafeId, roasterId])).rejects.toThrow(
      /uq_first_order_pair/,
    );
    await expect(
      ownerPool.query(
        `insert into orders(cafe_id, roaster_id, cafe_name_snapshot, cafe_phone_snapshot, roaster_name_snapshot, is_first_order)
         values ($1, $2, 'A', '+905320000000', 'R', false)`,
        [a.cafeId, roasterId],
      ),
    ).rejects.toThrow(/check/);
  });

  it('admin sees all tenants', async () => {
    await makeCafe('Kafe A');
    await makeCafe('Kafe B');
    const admin = await makeAdmin();
    await asApp({ userId: admin.id, isAdmin: true }, async (c) => {
      expect((await c.query('select * from cafes')).rowCount).toBe(2);
    });
  });

  it('identity tables: users see only themselves; email tokens are system-only', async () => {
    const a = await makeCafe('Kafe A');
    const b = await makeCafe('Kafe B');
    await ownerPool.query(
      `insert into email_tokens(user_id, purpose, token_hash, expires_at) values ($1, 'verify_email', 'h', now() + interval '1 day')`,
      [a.userId],
    );
    await asApp(a, async (c) => {
      expect((await c.query('select id from users')).rows.map((r) => r.id)).toEqual([a.userId]);
      expect((await c.query('select * from users where id = $1', [b.userId])).rowCount).toBe(0);
      expect((await c.query('select * from email_tokens')).rowCount).toBe(0);
    });
    await asApp({ isSystem: true }, async (c) => {
      expect((await c.query('select * from email_tokens')).rowCount).toBe(1);
    });
  });
});

describe('price history trigger', () => {
  beforeEach(truncateAll);

  it('logs insert, update, delete and rollback with the acting admin', async () => {
    const admin = await makeAdmin();
    const { productId } = await makeCatalog();
    const ctx = { userId: admin.id, isAdmin: true };
    const tier = await asApp(
      ctx,
      async (c) =>
        (
          await c.query(
            `insert into price_tiers(product_id, min_kg, price_per_kg_kurus) values ($1, 5, 90000) returning id`,
            [productId],
          )
        ).rows[0] as { id: string },
      true,
    );
    await asApp(
      ctx,
      (c) => c.query(`update price_tiers set price_per_kg_kurus = 95000 where id = $1`, [tier.id]),
      true,
    );
    await asApp(
      { ...ctx, reason: 'rollback:1' },
      (c) => c.query(`update price_tiers set price_per_kg_kurus = 90000 where id = $1`, [tier.id]),
      true,
    );
    await asApp(
      ctx,
      (c) => c.query(`update price_tiers set deleted_at = now() where id = $1`, [tier.id]),
      true,
    );

    const hist = await asApp(ctx, (c) =>
      c.query(
        `select action, old_price_kurus, new_price_kurus, changed_by from price_tier_history where price_tier_id = $1 order by id`,
        [tier.id],
      ),
    );
    const n = (v: unknown) => (v === null ? null : Number(v));
    expect(
      hist.rows.map((r) => ({
        ...r,
        old_price_kurus: n(r.old_price_kurus),
        new_price_kurus: n(r.new_price_kurus),
      })),
    ).toEqual([
      { action: 'insert', old_price_kurus: null, new_price_kurus: 90000, changed_by: admin.id },
      { action: 'update', old_price_kurus: 90000, new_price_kurus: 95000, changed_by: admin.id },
      { action: 'rollback', old_price_kurus: 95000, new_price_kurus: 90000, changed_by: admin.id },
      { action: 'delete', old_price_kurus: 90000, new_price_kurus: null, changed_by: admin.id },
    ]);
  });

  it('roastcost_app cannot write history directly, and cafes cannot read it', async () => {
    const a = await makeCafe('Kafe A');
    const admin = await makeAdmin();
    const { tierId, productId } = await makeCatalog();
    await expect(
      asApp({ userId: admin.id, isAdmin: true }, (c) =>
        c.query(
          `insert into price_tier_history(price_tier_id, product_id, min_kg, action) values ($1, $2, 1, 'update')`,
          [tierId, productId],
        ),
      ),
    ).rejects.toThrow(/permission denied/);
    await asApp(a, async (c) => {
      expect((await c.query('select * from price_tier_history')).rowCount).toBe(0);
    });
  });

  it('catalog rev increases on every change (delta sync key)', async () => {
    const admin = await makeAdmin();
    const { productId } = await makeCatalog();
    const before = (await ownerPool.query(`select rev from products where id = $1`, [productId]))
      .rows[0].rev;
    await asApp(
      { userId: admin.id, isAdmin: true },
      (c) => c.query(`update products set name = 'Yeni' where id = $1`, [productId]),
      true,
    );
    const after = (await ownerPool.query(`select rev from products where id = $1`, [productId]))
      .rows[0].rev;
    expect(Number(after)).toBeGreaterThan(Number(before));
  });
});
