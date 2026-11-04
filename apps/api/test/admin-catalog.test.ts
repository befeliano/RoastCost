import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { parsePriceImport } from '../src/modules/admin/import-parser';
import { bearer, catalog, makeAdminUser, makeTestApp, type TestCtx } from './app-helpers';
import { appPool, ownerPool, truncateAll } from './db-helpers';

let t: TestCtx;
beforeAll(async () => {
  t = await makeTestApp();
});
afterAll(async () => {
  await t.app.close();
  await t.db.destroy();
  await appPool.end();
  await ownerPool.end();
});
beforeEach(truncateAll);

describe('price import parser', () => {
  it('parses tab/semicolon rows with Turkish prices and reports errors per line', () => {
    const { rows, errors } = parsePriceImport(
      [
        'Ürün;Kategori;Min kg;Fiyat',
        'Ev Harmanı;espresso;1;1.250,00',
        'Ev Harmanı\tespresso\t5\t1.150',
        'Kenya AA;Filtre;1;1600',
        'Bozuk satır;espresso;1',
        'X;latte;1;100',
        'Y;espresso;0;100',
        'Z;espresso;1;-5',
        'Ev Harmanı;espresso;1;999',
      ].join('\n'),
    );
    expect(rows).toEqual([
      {
        line: 2,
        productName: 'Ev Harmanı',
        category: 'espresso',
        minKg: 1,
        pricePerKgKurus: 125_000,
      },
      {
        line: 3,
        productName: 'Ev Harmanı',
        category: 'espresso',
        minKg: 5,
        pricePerKgKurus: 115_000,
      },
      { line: 4, productName: 'Kenya AA', category: 'filter', minKg: 1, pricePerKgKurus: 160_000 },
    ]);
    expect(errors.map((e) => e.line)).toEqual([5, 6, 7, 8, 9]);
  });
});

describe('admin catalog management', () => {
  it('3 roasters and 12 products can be entered, edited and rolled back (Faz 3 acceptance)', async () => {
    const admin = await makeAdminUser(t);
    const roasters: string[] = [];
    for (let r = 0; r < 3; r++) {
      const res = await t.app.inject({
        method: 'POST',
        url: '/v1/admin/roasters',
        headers: bearer(admin),
        payload: {
          name: `Kavurucu ${r + 1}`,
          whatsapp: `0533000000${r}`,
          pricesIncludeVat: r === 1,
        },
      });
      expect(res.statusCode).toBe(201);
      roasters.push(res.json().id);
    }
    for (let i = 0; i < 12; i++) {
      const p = await t.app.inject({
        method: 'POST',
        url: '/v1/admin/products',
        headers: bearer(admin),
        payload: {
          roasterId: roasters[i % 3],
          name: `Ürün ${i + 1}`,
          category: i % 2 ? 'filter' : 'espresso',
          process: 'washed',
        },
      });
      expect(p.statusCode).toBe(201);
      await t.app.inject({
        method: 'POST',
        url: '/v1/admin/price-tiers',
        headers: bearer(admin),
        payload: { productId: p.json().id, minKg: 1, pricePerKgKurus: 100_000 + i },
      });
    }
    const list = (
      await t.app.inject({ method: 'GET', url: '/v1/admin/roasters', headers: bearer(admin) })
    ).json();
    expect(list.map((r: { productCount: number }) => r.productCount)).toEqual([4, 4, 4]);
    expect(list[0]).toMatchObject({ commissionRateBp: 1500 });

    const products = (
      await t.app.inject({
        method: 'GET',
        url: `/v1/admin/products?roaster_id=${roasters[0]}`,
        headers: bearer(admin),
      })
    ).json();
    const tierId = products[0].tiers[0].id;

    // edit → history → rollback
    await t.app.inject({
      method: 'PATCH',
      url: `/v1/admin/price-tiers/${tierId}`,
      headers: bearer(admin),
      payload: { pricePerKgKurus: 1_000_000, reason: 'yanlışlıkla sıfır fazla' },
    });
    let hist = (
      await t.app.inject({
        method: 'GET',
        url: `/v1/admin/price-tiers/${tierId}/history`,
        headers: bearer(admin),
      })
    ).json();
    expect(hist[0]).toMatchObject({
      action: 'update',
      newPriceKurus: 1_000_000,
      reason: 'yanlışlıkla sıfır fazla',
      changedBy: 'admin@test.local',
    });
    const rb = await t.app.inject({
      method: 'POST',
      url: `/v1/admin/price-history/${hist[0].id}/rollback`,
      headers: bearer(admin),
    });
    expect(rb.json().pricePerKgKurus).toBe(products[0].tiers[0].pricePerKgKurus);
    hist = (
      await t.app.inject({
        method: 'GET',
        url: `/v1/admin/price-tiers/${tierId}/history`,
        headers: bearer(admin),
      })
    ).json();
    expect(hist.map((h: { action: string }) => h.action)).toEqual(['rollback', 'update', 'insert']);

    // delete → rollback restores
    await t.app.inject({
      method: 'DELETE',
      url: `/v1/admin/price-tiers/${tierId}`,
      headers: bearer(admin),
    });
    hist = (
      await t.app.inject({
        method: 'GET',
        url: `/v1/admin/price-tiers/${tierId}/history`,
        headers: bearer(admin),
      })
    ).json();
    expect(hist[0].action).toBe('delete');
    const restored = await t.app.inject({
      method: 'POST',
      url: `/v1/admin/price-history/${hist[0].id}/rollback`,
      headers: bearer(admin),
    });
    expect(restored.json().deletedAt).toBeNull();

    // duplicate tier → 409
    const dup = await t.app.inject({
      method: 'POST',
      url: '/v1/admin/price-tiers',
      headers: bearer(admin),
      payload: { productId: products[0].id, minKg: 1, pricePerKgKurus: 5 },
    });
    expect(dup.statusCode).toBe(409);
  });

  it('bulk import: dry-run shows the plan without writing, apply writes and logs history', async () => {
    const admin = await makeAdminUser(t);
    const { roasterId } = await catalog(t, admin); // "Ev Harmanı" 1 kg 1000 TL, 5 kg 900 TL
    const text = [
      'Ev Harmanı;espresso;1;1.100',
      'Ev Harmanı;espresso;5;900',
      'Ev Harmanı;espresso;10;850',
      'Yeni Ürün;filtre;1;1500',
    ].join('\n');
    const dry = (
      await t.app.inject({
        method: 'POST',
        url: `/v1/admin/roasters/${roasterId}/prices/import`,
        headers: bearer(admin),
        payload: { text, dryRun: true },
      })
    ).json();
    expect(dry).toMatchObject({
      applied: false,
      summary: { createProduct: 1, createTier: 1, updatePrice: 1, unchanged: 1, errors: 0 },
    });
    expect(dry.plan[0]).toMatchObject({
      action: 'update_price',
      oldPriceKurus: 100_000,
      pricePerKgKurus: 110_000,
    });
    expect((await ownerPool.query(`select count(*)::int as n from products`)).rows[0].n).toBe(1);

    const withErr = (
      await t.app.inject({
        method: 'POST',
        url: `/v1/admin/roasters/${roasterId}/prices/import`,
        headers: bearer(admin),
        payload: { text: text + '\nkötü', dryRun: false },
      })
    ).json();
    expect(withErr.applied).toBe(false); // errors block applying

    const applied = (
      await t.app.inject({
        method: 'POST',
        url: `/v1/admin/roasters/${roasterId}/prices/import`,
        headers: bearer(admin),
        payload: { text, dryRun: false },
      })
    ).json();
    expect(applied.applied).toBe(true);
    const products = (
      await t.app.inject({
        method: 'GET',
        url: `/v1/admin/products?roaster_id=${roasterId}`,
        headers: bearer(admin),
      })
    ).json();
    const ev = products.find((p: { name: string }) => p.name === 'Ev Harmanı');
    expect(
      ev.tiers.map((x: { minKg: number; pricePerKgKurus: number }) => [x.minKg, x.pricePerKgKurus]),
    ).toEqual([
      [1, 110_000],
      [5, 90_000],
      [10, 85_000],
    ]);
    expect(products.find((p: { name: string }) => p.name === 'Yeni Ürün').category).toBe('filter');
    const reasons = (
      await ownerPool.query(
        `select distinct reason from price_tier_history where reason is not null`,
      )
    ).rows.map((r) => r.reason);
    expect(reasons).toContain('import');
  });

  it('admin-only: cafes cannot call catalog admin endpoints', async () => {
    const admin = await makeAdminUser(t);
    const { roasterId } = await catalog(t, admin);
    const r = await t.app.inject({ method: 'POST', url: '/v1/auth/register', payload: {} });
    expect(r.statusCode).toBe(400);
    for (const [method, url] of [
      ['GET', `/v1/admin/products?roaster_id=${roasterId}`],
      ['POST', '/v1/admin/roasters'],
      ['DELETE', `/v1/admin/roasters/${roasterId}`],
    ] as const) {
      expect((await t.app.inject({ method, url })).statusCode, url).toBe(401);
    }
  });
});

describe('roaster profile (0002)', () => {
  it('admin sets district, map position, logo and brand colour; approved cafes receive them via sync', async () => {
    const admin = await makeAdminUser(t);
    const res = await t.app.inject({
      method: 'POST',
      url: '/v1/admin/roasters',
      headers: bearer(admin),
      payload: {
        name: 'Harita Kavurucu',
        whatsapp: '05330000009',
        district: 'Tepebaşı',
        address: 'Örnek Cad. No:1',
        latitude: 39.7911,
        longitude: 30.5034,
        brandColor: '#1B7F4B',
        logoUrl: 'https://ornek.com/logo.png',
        description: 'Küçük partiler',
        isFeatured: true,
      },
    });
    expect(res.statusCode).toBe(201);
    const bad = await t.app.inject({
      method: 'PATCH',
      url: `/v1/admin/roasters/${res.json().id}`,
      headers: bearer(admin),
      payload: { logoUrl: 'http://x', brandColor: 'red' },
    });
    expect(bad.statusCode).toBe(400);
    await t.app.inject({
      method: 'PATCH',
      url: `/v1/admin/roasters/${res.json().id}`,
      headers: bearer(admin),
      payload: { district: 'Odunpazarı' },
    });
    const sync = (
      await t.app.inject({ method: 'GET', url: '/v1/catalog/sync', headers: bearer(admin) })
    ).json();
    expect(sync.roasters[0]).toMatchObject({
      district: 'Odunpazarı',
      latitude: 39.7911,
      longitude: 30.5034,
      brandColor: '#1B7F4B',
      logoUrl: 'https://ornek.com/logo.png',
      isFeatured: true,
    });
    expect(JSON.stringify(sync)).not.toMatch(/commission/i);
  });
});
