import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { cleanupTokens, expireStaleOrders } from '../src/jobs';
import {
  approvedCafe,
  bearer,
  catalog,
  makeAdminUser,
  makeTestApp,
  register,
  type TestCtx,
} from './app-helpers';
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
beforeEach(async () => {
  await truncateAll();
  t.mailer.outbox.length = 0;
  t.clock.now = new Date('2026-11-04T09:00:00Z');
});

const form = { 'content-type': 'application/x-www-form-urlencoded' };

async function setup() {
  const admin = await makeAdminUser(t);
  const cafe = await approvedCafe(t, admin, 'kafe@ornek.com', 'Köşe <Fincan> & Co');
  const cat = await catalog(t, admin);
  return { admin, cafe, ...cat };
}

async function placeOrder(
  token: string,
  roasterId: string,
  productId: string,
  quantityG = 6000,
  extra: Record<string, unknown> = {},
) {
  return t.app.inject({
    method: 'POST',
    url: '/v1/orders',
    headers: bearer(token),
    payload: {
      roasterId,
      items: [{ productId, quantityG }],
      requestedDeliveryDate: '2026-11-10',
      note: 'Sabah teslim',
      ...extra,
    },
  });
}

const tokenFrom = (waUrl: string) => {
  const text = decodeURIComponent(new URL(waUrl).searchParams.get('text') ?? '');
  return /\/r\/([A-Za-z0-9_-]+)/.exec(text)?.[1] as string;
};

describe('catalog sync', () => {
  it('returns deltas by rev, tombstones, ETag/304, and never commission data', async () => {
    const { cafe, admin, productId } = await setup();
    const full = await t.app.inject({
      method: 'GET',
      url: '/v1/catalog/sync?since_rev=0',
      headers: bearer(cafe.accessToken),
    });
    expect(full.statusCode).toBe(200);
    const body = full.json();
    expect(body.roasters).toHaveLength(1);
    expect(body.products).toHaveLength(1);
    expect(body.priceTiers).toHaveLength(2);
    expect(JSON.stringify(body)).not.toMatch(/commission|adminNotes|gizli|whatsapp/i);

    const etag = full.headers.etag as string;
    const same = await t.app.inject({
      method: 'GET',
      url: '/v1/catalog/sync?since_rev=0',
      headers: { ...bearer(cafe.accessToken), 'if-none-match': etag },
    });
    expect(same.statusCode).toBe(304);
    const upToDate = await t.app.inject({
      method: 'GET',
      url: `/v1/catalog/sync?since_rev=${body.rev}`,
      headers: bearer(cafe.accessToken),
    });
    expect(upToDate.json()).toEqual({ rev: body.rev, roasters: [], products: [], priceTiers: [] });

    // change one price → only that tier comes back (plus the roaster whose prices_updated_at moved)
    const tier = body.priceTiers.find((x: { minKg: number }) => x.minKg === 5);
    await t.app.inject({
      method: 'PATCH',
      url: `/v1/admin/price-tiers/${tier.id}`,
      headers: bearer(admin),
      payload: { pricePerKgKurus: 88_000 },
    });
    const delta = (
      await t.app.inject({
        method: 'GET',
        url: `/v1/catalog/sync?since_rev=${body.rev}`,
        headers: bearer(cafe.accessToken),
      })
    ).json();
    expect(delta.priceTiers).toHaveLength(1);
    expect(delta.priceTiers[0]).toMatchObject({ id: tier.id, pricePerKgKurus: 88_000 });
    expect(delta.products).toHaveLength(0);

    // soft delete → tombstone
    await t.app.inject({
      method: 'DELETE',
      url: `/v1/admin/products/${productId}`,
      headers: bearer(admin),
    });
    const del = (
      await t.app.inject({
        method: 'GET',
        url: `/v1/catalog/sync?since_rev=${delta.rev}`,
        headers: bearer(cafe.accessToken),
      })
    ).json();
    expect(del.products[0].deletedAt).not.toBeNull();
  });
});

describe('order flow (spec §8)', () => {
  it('creates an order with tier pricing, WhatsApp link and a one-time roaster page', async () => {
    const { cafe, roasterId, productId } = await setup();
    const r = await placeOrder(cafe.accessToken, roasterId, productId, 6000); // 6 kg → 5 kg tier (900 TL)
    expect(r.statusCode).toBe(201);
    const { order, waUrl, message } = r.json();
    expect(order).toMatchObject({ status: 'draft', subtotalKurus: 540_000, orderNo: 1001 });
    expect(order.items[0]).toMatchObject({
      quantityG: 6000,
      tierMinKg: 5,
      pricePerKgKurus: 90_000,
      lineTotalKurus: 540_000,
    });
    expect(waUrl).toMatch(/^https:\/\/wa\.me\/905330000001\?text=/);
    expect(message).toContain('Sipariş no: S-1001');
    expect(message).toContain('• Ev Harmanı — 6 kg');
    expect(message).toContain('İstenen teslim tarihi: 10.11.2026');
    const token = tokenFrom(waUrl);
    expect(message).toContain(`https://roastcost.test/r/${token}`);
    // only the hash is stored
    const stored = (await ownerPool.query(`select token_hash from orders`)).rows[0].token_hash;
    expect(stored).not.toBe(token);
    expect(stored).toHaveLength(64);

    const page = await t.app.inject({ method: 'GET', url: `/r/${token}` });
    expect(page.statusCode).toBe(200);
    expect(page.headers['x-robots-tag']).toContain('noindex');
    expect(page.headers['referrer-policy']).toBe('no-referrer');
    expect(page.body).toContain('Köşe &lt;Fincan&gt; &amp; Co'); // escaped
    expect(page.body).not.toContain('<Fincan>');
    expect(page.body).toContain('Siparişi aldım');
    expect(page.body).toContain('KVKK');

    const sent = await t.app.inject({
      method: 'POST',
      url: `/v1/orders/${order.id}/mark-sent`,
      headers: bearer(cafe.accessToken),
    });
    expect(sent.json().status).toBe('sent');
  });

  it('first confirmed order of a pair gets 15% commission; later ones do not', async () => {
    const { cafe, admin, roasterId, productId } = await setup();
    const o1 = (await placeOrder(cafe.accessToken, roasterId, productId, 2000)).json(); // 2 kg × 1000 TL
    const confirm1 = await t.app.inject({
      method: 'POST',
      url: `/r/${tokenFrom(o1.waUrl)}/decide`,
      headers: form,
      payload: 'decision=confirm&customer=new',
    });
    expect(confirm1.statusCode).toBe(200);
    expect(confirm1.body).toContain('Siparişi aldığınızı işaretlediniz');

    const a1 = (
      await t.app.inject({
        method: 'GET',
        url: `/v1/admin/orders/${o1.order.id}`,
        headers: bearer(admin),
      })
    ).json();
    expect(a1).toMatchObject({
      status: 'confirmed',
      isFirstOrder: true,
      commissionStatus: 'pending',
      commissionRateBp: 1500,
      commissionBaseKurus: 200_000,
      commissionAmountKurus: 30_000,
      commissionConflict: false,
    });

    // the decision is made once — a second POST does not change anything
    const again = await t.app.inject({
      method: 'POST',
      url: `/r/${tokenFrom(o1.waUrl)}/decide`,
      headers: form,
      payload: 'decision=decline',
    });
    expect(again.body).toContain('(daha önce)');
    expect(
      (
        await t.app.inject({
          method: 'GET',
          url: `/v1/orders/${o1.order.id}`,
          headers: bearer(cafe.accessToken),
        })
      ).json().status,
    ).toBe('confirmed');

    // second order, roaster still says "new" → no commission, conflict flag for admin
    const o2 = (await placeOrder(cafe.accessToken, roasterId, productId, 1000)).json();
    await t.app.inject({
      method: 'POST',
      url: `/r/${tokenFrom(o2.waUrl)}/decide`,
      headers: form,
      payload: 'decision=confirm&customer=new',
    });
    const a2 = (
      await t.app.inject({
        method: 'GET',
        url: `/v1/admin/orders/${o2.order.id}`,
        headers: bearer(admin),
      })
    ).json();
    expect(a2).toMatchObject({
      status: 'confirmed',
      isFirstOrder: false,
      commissionStatus: 'not_applicable',
      commissionConflict: true,
    });

    const stats = (
      await t.app.inject({ method: 'GET', url: '/v1/admin/stats', headers: bearer(admin) })
    ).json();
    expect(stats).toMatchObject({
      commissionToCollectKurus: 30_000,
      commissionConflicts: 1,
      approvedCafes: 1,
    });

    // the cafe never sees commission data
    const mine = (
      await t.app.inject({
        method: 'GET',
        url: `/v1/orders/${o1.order.id}`,
        headers: bearer(cafe.accessToken),
      })
    ).json();
    expect(JSON.stringify(mine)).not.toMatch(/commission|firstOrder|newCustomer/i);
  });

  it('"existing customer" means no commission; decline is recorded', async () => {
    const { cafe, admin, roasterId, productId } = await setup();
    const o1 = (await placeOrder(cafe.accessToken, roasterId, productId, 1000)).json();
    await t.app.inject({
      method: 'POST',
      url: `/r/${tokenFrom(o1.waUrl)}/decide`,
      headers: form,
      payload: 'decision=confirm&customer=existing',
    });
    expect(
      (
        await t.app.inject({
          method: 'GET',
          url: `/v1/admin/orders/${o1.order.id}`,
          headers: bearer(admin),
        })
      ).json().commissionStatus,
    ).toBe('not_applicable');

    const o2 = (await placeOrder(cafe.accessToken, roasterId, productId, 1000)).json();
    const dec = await t.app.inject({
      method: 'POST',
      url: `/r/${tokenFrom(o2.waUrl)}/decide`,
      headers: form,
      payload: 'decision=decline&reason=Stok+yok',
    });
    expect(dec.body).toContain('karşılayamadığınızı');
    const mine = (
      await t.app.inject({
        method: 'GET',
        url: `/v1/orders/${o2.order.id}`,
        headers: bearer(cafe.accessToken),
      })
    ).json();
    expect(mine).toMatchObject({ status: 'declined', declineReason: 'Stok yok' });
  });

  it('confirm requires the customer question; invalid/expired tokens show a generic page', async () => {
    const { cafe, roasterId, productId } = await setup();
    const o = (await placeOrder(cafe.accessToken, roasterId, productId, 1000)).json();
    const token = tokenFrom(o.waUrl);
    const missing = await t.app.inject({
      method: 'POST',
      url: `/r/${token}/decide`,
      headers: form,
      payload: 'decision=confirm',
    });
    expect(missing.statusCode).toBe(400);
    expect(missing.body).toContain('yeni müşteri olup olmadığını');

    expect(
      (await t.app.inject({ method: 'GET', url: '/r/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' }))
        .statusCode,
    ).toBe(404);
    expect((await t.app.inject({ method: 'GET', url: '/r/<script>' })).statusCode).toBe(404);
    t.clock.advance(31 * 86_400_000);
    const expired = await t.app.inject({ method: 'GET', url: `/r/${token}` });
    expect(expired.statusCode).toBe(404);
    expect(expired.body).toContain('geçersiz ya da süresi dolmuş');
  });

  it('history pagination: every order exactly once across pages, newest first', async () => {
    const { cafe, roasterId, productId } = await setup();
    const ids: string[] = [];
    for (let i = 0; i < 5; i++) {
      ids.push(
        (await placeOrder(cafe.accessToken, roasterId, productId, 1000 + i * 1000)).json().order.id,
      );
      t.clock.advance(1000);
    }
    const seen: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const page: { items: { id: string }[]; nextCursor: string | null } = (
        await t.app.inject({
          method: 'GET',
          url: `/v1/orders?limit=2${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
          headers: bearer(cafe.accessToken),
        })
      ).json();
      seen.push(...page.items.map((o: { id: string }) => o.id));
      cursor = page.nextCursor;
      pages++;
    } while (cursor && pages < 10);
    expect(pages).toBe(3); // 2 + 2 + 1, and no empty trailing page
    expect(seen).toEqual([...ids].reverse());
  });

  it('roaster minimum total kg (0003): blocks smaller orders, syncs terms to cafes, message shows total', async () => {
    const { cafe, admin, roasterId, productId } = await setup();
    const patch = await t.app.inject({
      method: 'PATCH',
      url: `/v1/admin/roasters/${roasterId}`,
      headers: bearer(admin),
      payload: { minOrderKg: 5, cardSurchargeBp: 250 },
    });
    expect(patch.statusCode).toBe(200);
    const sync = (
      await t.app.inject({
        method: 'GET',
        url: '/v1/catalog/sync',
        headers: bearer(cafe.accessToken),
      })
    ).json();
    expect(sync.roasters[0]).toMatchObject({ minOrderKg: 5, cardSurchargeBp: 250 });

    const small = await placeOrder(cafe.accessToken, roasterId, productId, 2000);
    expect(small.statusCode).toBe(400);
    expect(small.json().error).toMatchObject({
      code: 'below_order_minimum',
      details: { minOrderKg: 5, totalKg: 2 },
    });
    const ok = await placeOrder(cafe.accessToken, roasterId, productId, 5000);
    expect(ok.statusCode).toBe(201);
    expect(decodeURIComponent(ok.json().waUrl)).toContain('Toplam: 5 kg');
  });

  it('validates: below minimum tier, past date, unverified e-mail, pending cafe, foreign product', async () => {
    const { cafe, admin, roasterId, productId } = await setup();
    const small = await placeOrder(cafe.accessToken, roasterId, productId, 500);
    expect(small.statusCode).toBe(400);
    expect(small.json().error).toMatchObject({ code: 'below_minimum', details: { minKg: 1 } });
    const past = await placeOrder(cafe.accessToken, roasterId, productId, 1000, {
      requestedDeliveryDate: '2026-11-01',
    });
    expect(past.json().error.code).toBe('date_in_past');

    const other = await catalog(t, admin, 'Kavurucu B', '05330000002');
    const mixed = await placeOrder(cafe.accessToken, roasterId, other.productId, 1000);
    expect(mixed.json().error.code).toBe('product_unavailable');

    const unverified = await register(t, 'unverified@ornek.com');
    const me = (
      await t.app.inject({ method: 'GET', url: '/v1/me', headers: bearer(unverified.accessToken) })
    ).json();
    await t.app.inject({
      method: 'POST',
      url: `/v1/admin/cafes/${me.cafe.id}/approve`,
      headers: bearer(admin),
      payload: {},
    });
    const nv = await placeOrder(unverified.accessToken, roasterId, productId, 1000);
    expect(nv.statusCode).toBe(403);
    expect(nv.json().error.code).toBe('email_not_verified');

    const pend = await register(t, 'pending@ornek.com');
    expect((await placeOrder(pend.accessToken, roasterId, productId, 1000)).json().error.code).toBe(
      'cafe_not_approved',
    );
  });

  it('cafe cancels, regenerates the link (old link dies), and cannot see other cafes orders', async () => {
    const { cafe, admin, roasterId, productId } = await setup();
    const o = (await placeOrder(cafe.accessToken, roasterId, productId, 1000)).json();
    const fresh = (
      await t.app.inject({
        method: 'POST',
        url: `/v1/orders/${o.order.id}/link`,
        headers: bearer(cafe.accessToken),
      })
    ).json();
    expect(
      (await t.app.inject({ method: 'GET', url: `/r/${tokenFrom(o.waUrl)}` })).statusCode,
    ).toBe(404);
    expect(
      (await t.app.inject({ method: 'GET', url: `/r/${tokenFrom(fresh.waUrl)}` })).statusCode,
    ).toBe(200);

    const other = await approvedCafe(t, admin, 'diger@ornek.com', 'Diğer Kafe');
    expect(
      (
        await t.app.inject({
          method: 'GET',
          url: `/v1/orders/${o.order.id}`,
          headers: bearer(other.accessToken),
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (
        await t.app.inject({
          method: 'POST',
          url: `/v1/orders/${o.order.id}/cancel`,
          headers: bearer(other.accessToken),
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (
        await t.app.inject({ method: 'GET', url: '/v1/orders', headers: bearer(other.accessToken) })
      ).json().items,
    ).toHaveLength(0);

    expect(
      (
        await t.app.inject({
          method: 'POST',
          url: `/v1/orders/${o.order.id}/cancel`,
          headers: bearer(cafe.accessToken),
        })
      ).json().status,
    ).toBe('cancelled');
    const page = await t.app.inject({ method: 'GET', url: `/r/${tokenFrom(fresh.waUrl)}` });
    expect(page.body).toContain('iptal edildi');
    expect(
      (
        await t.app.inject({
          method: 'POST',
          url: `/v1/orders/${o.order.id}/mark-sent`,
          headers: bearer(cafe.accessToken),
        })
      ).statusCode,
    ).toBe(400);
  });

  it('paginates the order list with a cursor', async () => {
    const { cafe, roasterId, productId } = await setup();
    for (let i = 0; i < 5; i++) {
      await placeOrder(cafe.accessToken, roasterId, productId, 1000);
      t.clock.advance(1000);
    }
    const p1 = (
      await t.app.inject({
        method: 'GET',
        url: '/v1/orders?limit=2',
        headers: bearer(cafe.accessToken),
      })
    ).json();
    expect(p1.items).toHaveLength(2);
    const p2 = (
      await t.app.inject({
        method: 'GET',
        url: `/v1/orders?limit=2&cursor=${p1.nextCursor}`,
        headers: bearer(cafe.accessToken),
      })
    ).json();
    const p3 = (
      await t.app.inject({
        method: 'GET',
        url: `/v1/orders?limit=2&cursor=${p2.nextCursor}`,
        headers: bearer(cafe.accessToken),
      })
    ).json();
    expect(p3.items).toHaveLength(1);
    expect(p3.nextCursor).toBeNull();
    const all = [...p1.items, ...p2.items, ...p3.items].map((o: { orderNo: number }) => o.orderNo);
    expect(new Set(all).size).toBe(5);
  });
});

describe('admin commission workflow', () => {
  it('pending → requested → paid, base override recalculates, invalid moves rejected, all audited', async () => {
    const { cafe, admin, roasterId, productId } = await setup();
    const o = (await placeOrder(cafe.accessToken, roasterId, productId, 2000)).json();
    await t.app.inject({
      method: 'POST',
      url: `/r/${tokenFrom(o.waUrl)}/decide`,
      headers: form,
      payload: 'decision=confirm&customer=new',
    });
    const url = `/v1/admin/orders/${o.order.id}/commission`;
    const fix = await t.app.inject({
      method: 'PATCH',
      url,
      headers: bearer(admin),
      payload: { baseKurus: 150_000, note: '1,5 kg teslim edildi' },
    });
    expect(fix.json()).toMatchObject({
      commissionBaseKurus: 150_000,
      commissionAmountKurus: 22_500,
    });
    expect(
      (
        await t.app.inject({
          method: 'PATCH',
          url,
          headers: bearer(admin),
          payload: { status: 'requested' },
        })
      ).json().commissionStatus,
    ).toBe('requested');
    expect(
      (
        await t.app.inject({
          method: 'PATCH',
          url,
          headers: bearer(admin),
          payload: { status: 'paid' },
        })
      ).json().commissionStatus,
    ).toBe('paid');
    const bad = await t.app.inject({
      method: 'PATCH',
      url,
      headers: bearer(admin),
      payload: { status: 'waived' },
    });
    expect(bad.statusCode).toBe(400);
    const filtered = (
      await t.app.inject({
        method: 'GET',
        url: '/v1/admin/orders?commission_status=paid',
        headers: bearer(admin),
      })
    ).json();
    expect(filtered.items).toHaveLength(1);
    const logs = (
      await t.app.inject({
        method: 'GET',
        url: `/v1/admin/audit-logs?entity_id=${o.order.id}`,
        headers: bearer(admin),
      })
    ).json();
    expect(logs.items.map((l: { action: string }) => l.action)).toEqual(
      expect.arrayContaining(['order.commission', 'order.roaster_confirm']),
    );
  });

  it('admin fixes a wrong roaster decision', async () => {
    const { cafe, admin, roasterId, productId } = await setup();
    const o = (await placeOrder(cafe.accessToken, roasterId, productId, 1000)).json();
    await t.app.inject({
      method: 'POST',
      url: `/r/${tokenFrom(o.waUrl)}/decide`,
      headers: form,
      payload: 'decision=confirm&customer=existing',
    });
    const fixed = await t.app.inject({
      method: 'PATCH',
      url: `/v1/admin/orders/${o.order.id}/decision`,
      headers: bearer(admin),
      payload: {
        status: 'confirmed',
        roasterSaysNewCustomer: true,
        reason: 'Kavurucu telefonda yanlış işaretlediğini söyledi',
      },
    });
    expect(fixed.json()).toMatchObject({
      isFirstOrder: true,
      commissionStatus: 'pending',
      commissionAmountKurus: 15_000,
    });
    const declined = await t.app.inject({
      method: 'PATCH',
      url: `/v1/admin/orders/${o.order.id}/decision`,
      headers: bearer(admin),
      payload: { status: 'declined' },
    });
    expect(declined.json()).toMatchObject({
      status: 'declined',
      isFirstOrder: false,
      commissionStatus: 'not_applicable',
    });
  });
});

describe('jobs', () => {
  it('expires sent orders after 14 days and cleans old tokens', async () => {
    const { cafe, roasterId, productId } = await setup();
    const o = (await placeOrder(cafe.accessToken, roasterId, productId, 1000)).json();
    await t.app.inject({
      method: 'POST',
      url: `/v1/orders/${o.order.id}/mark-sent`,
      headers: bearer(cafe.accessToken),
    });
    const deps = { db: t.db, clock: () => t.clock.now };
    t.clock.advance(13 * 86_400_000);
    expect(await expireStaleOrders(deps)).toBe(0);
    t.clock.advance(2 * 86_400_000);
    expect(await expireStaleOrders(deps)).toBe(1);
    expect(
      (await ownerPool.query(`select status from orders where id = $1`, [o.order.id])).rows[0]
        .status,
    ).toBe('expired');
    t.clock.advance(40 * 86_400_000);
    const cleaned = await cleanupTokens(deps);
    expect(cleaned.refresh).toBeGreaterThan(0);
  });
});
