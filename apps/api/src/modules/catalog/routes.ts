import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { sql } from 'kysely';
import { z } from 'zod';
import { withCtx, type Tx } from '../../db';
import { forbidden } from '../../lib/errors';
import { auth, ctxOf, requireAuth } from '../../plugins/auth';

export async function assertApprovedCafe(tx: Tx, cafeId: string | null): Promise<void> {
  if (!cafeId) throw forbidden('no_cafe', 'Bu hesaba bağlı bir kafe yok.');
  const c = await tx
    .selectFrom('cafes')
    .select('status')
    .where('id', '=', cafeId)
    .where('deleted_at', 'is', null)
    .executeTakeFirst();
  if (c?.status !== 'approved') throw forbidden('cafe_not_approved', 'Kafeniz henüz onaylanmadı.');
}

async function currentRev(tx: Tx): Promise<number> {
  const r = await sql<{ rev: number | null }>`select greatest(
      (select max(rev) from roasters), (select max(rev) from products), (select max(rev) from price_tiers)) as rev`.execute(
    tx,
  );
  return Number(r.rows[0]?.rev ?? 0);
}

type SyncPayload = Awaited<ReturnType<typeof loadDelta>>;

async function loadDelta(tx: Tx, since: number) {
  const roasters = await tx
    .selectFrom('roasters')
    .select([
      'id',
      'name',
      'city',
      'prices_include_vat',
      'vat_rate_pct',
      'prices_updated_at',
      'is_active',
      'rev',
      'deleted_at',
    ])
    .where('rev', '>', since)
    .execute();
  const products = await tx
    .selectFrom('products')
    .select([
      'id',
      'roaster_id',
      'name',
      'category',
      'process',
      'origin',
      'tasting_notes',
      'is_active',
      'rev',
      'deleted_at',
    ])
    .where('rev', '>', since)
    .execute();
  const tiers = await tx
    .selectFrom('price_tiers')
    .select([
      'id',
      'product_id',
      'min_kg',
      'price_per_kg_kurus',
      'valid_until',
      'rev',
      'deleted_at',
    ])
    .where('rev', '>', since)
    .execute();
  return {
    roasters: roasters.map((r) => ({
      id: r.id,
      name: r.name,
      city: r.city,
      pricesIncludeVat: r.prices_include_vat,
      vatRatePct: r.vat_rate_pct,
      pricesUpdatedAt: r.prices_updated_at,
      isActive: r.is_active,
      rev: r.rev,
      deletedAt: r.deleted_at,
    })),
    products: products.map((p) => ({
      id: p.id,
      roasterId: p.roaster_id,
      name: p.name,
      category: p.category,
      process: p.process,
      origin: p.origin,
      tastingNotes: p.tasting_notes,
      isActive: p.is_active,
      rev: p.rev,
      deletedAt: p.deleted_at,
    })),
    priceTiers: tiers.map((t) => ({
      id: t.id,
      productId: t.product_id,
      minKg: t.min_kg,
      pricePerKgKurus: t.price_per_kg_kurus,
      validUntil: t.valid_until,
      rev: t.rev,
      deletedAt: t.deleted_at,
    })),
  };
}

/** Short-lived in-memory cache keyed by since_rev; invalidated automatically when the max rev moves. */
const cache = new Map<number, { rev: number; payload: SyncPayload }>();

export const catalogRoutes: FastifyPluginAsyncZod = async (app) => {
  const deps = app.deps;
  app.addHook('onRequest', requireAuth);

  app.get(
    '/sync',
    { schema: { querystring: z.object({ since_rev: z.coerce.number().int().min(0).default(0) }) } },
    async (req, reply) => {
      const a = auth(req);
      const since = req.query.since_rev;
      const result = await withCtx(deps.db, ctxOf(req), async (tx) => {
        if (a.role !== 'admin') await assertApprovedCafe(tx, a.cafeId);
        const rev = await currentRev(tx);
        const etag = `W/"cat-${since}-${rev}"`;
        if (req.headers['if-none-match'] === etag || since >= rev)
          return { rev, etag, payload: null };
        const hit = cache.get(since);
        if (hit && hit.rev === rev) return { rev, etag, payload: hit.payload };
        const payload = await loadDelta(tx, since);
        if (cache.size > 50) cache.clear();
        cache.set(since, { rev, payload });
        return { rev, etag, payload };
      });
      reply.header('ETag', result.etag).header('Cache-Control', 'private, no-cache');
      if (!result.payload) {
        if (req.headers['if-none-match'] === result.etag) return reply.status(304).send();
        return { rev: result.rev, roasters: [], products: [], priceTiers: [] };
      }
      return { rev: result.rev, ...result.payload };
    },
  );
};
