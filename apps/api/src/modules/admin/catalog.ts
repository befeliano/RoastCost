import {
  priceImportSchema,
  priceTierCreateSchema,
  priceTierPatchSchema,
  productCreateSchema,
  productPatchSchema,
  roasterCreateSchema,
  roasterPatchSchema,
  statusNoteSchema,
  uuidSchema,
} from '@roastcost/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { Selectable } from 'kysely';
import { z } from 'zod';
import { withCtx, type Tx } from '../../db';
import type { PriceTiersTable, ProductsTable } from '../../db/types';
import { audit } from '../../lib/audit';
import { badRequest, conflict, notFound } from '../../lib/errors';
import { auth, ctxOf } from '../../plugins/auth';
import { parsePriceImport } from './import-parser';

const idParams = z.object({ id: uuidSchema });

const tierDto = (t: Selectable<PriceTiersTable>) => ({
  id: t.id,
  productId: t.product_id,
  minKg: t.min_kg,
  pricePerKgKurus: t.price_per_kg_kurus,
  validUntil: t.valid_until,
  deletedAt: t.deleted_at,
  updatedAt: t.updated_at,
});
const productDto = (p: Selectable<ProductsTable>, tiers: Selectable<PriceTiersTable>[] = []) => ({
  id: p.id,
  roasterId: p.roaster_id,
  name: p.name,
  category: p.category,
  process: p.process,
  origin: p.origin,
  tastingNotes: p.tasting_notes,
  roastLevel: p.roast_level,
  isActive: p.is_active,
  deletedAt: p.deleted_at,
  updatedAt: p.updated_at,
  tiers: tiers
    .filter((t) => t.product_id === p.id && !t.deleted_at)
    .sort((a, b) => a.min_kg - b.min_kg)
    .map(tierDto),
});

async function touchRoasterPrices(tx: Tx, roasterId: string, now: Date) {
  await tx
    .updateTable('roasters')
    .set({ prices_updated_at: now })
    .where('id', '=', roasterId)
    .execute();
}

async function roasterOfProduct(tx: Tx, productId: string): Promise<string> {
  const p = await tx
    .selectFrom('products')
    .select('roaster_id')
    .where('id', '=', productId)
    .executeTakeFirst();
  if (!p) throw notFound('product_not_found', 'Ürün bulunamadı.');
  return p.roaster_id;
}

function uniqueViolation(e: unknown): never {
  const err = e as { code?: string };
  if (err.code === '23505')
    throw conflict('duplicate_tier', 'Bu ürün için aynı kg kademesi zaten var.');
  throw e;
}

export const adminCatalogRoutes: FastifyPluginAsyncZod = async (app) => {
  const deps = app.deps;
  const admin = (req: Parameters<typeof auth>[0]) => auth(req).userId;

  // ---------------- roasters ----------------
  app.get('/roasters', async (req) =>
    withCtx(deps.db, ctxOf(req), async (tx) => {
      const rows = await tx
        .selectFrom('roasters as r')
        .leftJoin('roaster_admin as a', 'a.roaster_id', 'r.id')
        .selectAll('r')
        .select(['a.commission_rate_bp', 'a.admin_notes'])
        .where('r.deleted_at', 'is', null)
        .orderBy('r.name')
        .execute();
      const counts = await tx
        .selectFrom('products')
        .select(['roaster_id', (eb) => eb.fn.countAll<number>().as('n')])
        .where('deleted_at', 'is', null)
        .groupBy('roaster_id')
        .execute();
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        city: r.city,
        whatsapp: r.whatsapp_e164,
        pricesIncludeVat: r.prices_include_vat,
        vatRatePct: r.vat_rate_pct,
        pricesUpdatedAt: r.prices_updated_at,
        isActive: r.is_active,
        district: r.district,
        address: r.address,
        latitude: r.latitude,
        longitude: r.longitude,
        logoUrl: r.logo_url,
        brandColor: r.brand_color,
        description: r.description,
        isFeatured: r.is_featured,
        minOrderKg: r.min_order_kg,
        cardSurchargeBp: r.card_surcharge_bp,
        commissionRateBp: r.commission_rate_bp ?? 1500,
        adminNotes: r.admin_notes,
        productCount: Number(counts.find((c) => c.roaster_id === r.id)?.n ?? 0),
      }));
    }),
  );

  app.post('/roasters', { schema: { body: roasterCreateSchema } }, async (req, reply) => {
    const b = req.body;
    const r = await withCtx(deps.db, ctxOf(req), async (tx) => {
      const row = await tx
        .insertInto('roasters')
        .values({
          name: b.name,
          city: b.city,
          whatsapp_e164: b.whatsapp,
          prices_include_vat: b.pricesIncludeVat,
          vat_rate_pct: b.vatRatePct,
          is_active: b.isActive,
          prices_updated_at: deps.clock(),
          district: b.district,
          address: b.address,
          latitude: b.latitude ?? null,
          longitude: b.longitude ?? null,
          logo_url: b.logoUrl,
          brand_color: b.brandColor,
          description: b.description,
          is_featured: b.isFeatured,
          min_order_kg: b.minOrderKg ?? null,
          card_surcharge_bp: b.cardSurchargeBp ?? null,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
      await tx
        .insertInto('roaster_admin')
        .values({
          roaster_id: row.id,
          commission_rate_bp: b.commissionRateBp,
          admin_notes: b.adminNotes,
        })
        .execute();
      await audit(tx, {
        actorUserId: admin(req),
        action: 'roaster.create',
        entity: 'roaster',
        entityId: row.id,
        after: b,
      });
      return row;
    });
    return reply.status(201).send({ id: r.id });
  });

  app.patch(
    '/roasters/:id',
    { schema: { params: idParams, body: roasterPatchSchema } },
    async (req) =>
      withCtx(deps.db, ctxOf(req), async (tx) => {
        const b = req.body;
        const before = await tx
          .selectFrom('roasters')
          .selectAll()
          .where('id', '=', req.params.id)
          .where('deleted_at', 'is', null)
          .executeTakeFirst();
        if (!before) throw notFound();
        const set = {
          ...(b.name !== undefined && { name: b.name }),
          ...(b.city !== undefined && { city: b.city }),
          ...(b.whatsapp !== undefined && { whatsapp_e164: b.whatsapp }),
          ...(b.pricesIncludeVat !== undefined && { prices_include_vat: b.pricesIncludeVat }),
          ...(b.vatRatePct !== undefined && { vat_rate_pct: b.vatRatePct }),
          ...(b.isActive !== undefined && { is_active: b.isActive }),
          ...(b.pricesUpdatedAt !== undefined && { prices_updated_at: b.pricesUpdatedAt }),
          ...(b.district !== undefined && { district: b.district }),
          ...(b.address !== undefined && { address: b.address }),
          ...(b.latitude !== undefined && { latitude: b.latitude }),
          ...(b.longitude !== undefined && { longitude: b.longitude }),
          ...(b.logoUrl !== undefined && { logo_url: b.logoUrl }),
          ...(b.brandColor !== undefined && { brand_color: b.brandColor }),
          ...(b.description !== undefined && { description: b.description }),
          ...(b.isFeatured !== undefined && { is_featured: b.isFeatured }),
          ...(b.minOrderKg !== undefined && { min_order_kg: b.minOrderKg }),
          ...(b.cardSurchargeBp !== undefined && { card_surcharge_bp: b.cardSurchargeBp }),
        };
        if (Object.keys(set).length)
          await tx.updateTable('roasters').set(set).where('id', '=', req.params.id).execute();
        if (b.commissionRateBp !== undefined || b.adminNotes !== undefined) {
          await tx
            .insertInto('roaster_admin')
            .values({
              roaster_id: req.params.id,
              commission_rate_bp: b.commissionRateBp ?? 1500,
              admin_notes: b.adminNotes ?? null,
            })
            .onConflict((oc) =>
              oc.column('roaster_id').doUpdateSet({
                ...(b.commissionRateBp !== undefined && { commission_rate_bp: b.commissionRateBp }),
                ...(b.adminNotes !== undefined && { admin_notes: b.adminNotes }),
              }),
            )
            .execute();
        }
        await audit(tx, {
          actorUserId: admin(req),
          action: 'roaster.update',
          entity: 'roaster',
          entityId: req.params.id,
          before,
          after: b,
        });
        return { ok: true };
      }),
  );

  app.delete('/roasters/:id', { schema: { params: idParams } }, async (req, reply) => {
    await withCtx(deps.db, ctxOf(req), async (tx) => {
      const r = await tx
        .updateTable('roasters')
        .set({ deleted_at: deps.clock(), is_active: false })
        .where('id', '=', req.params.id)
        .where('deleted_at', 'is', null)
        .executeTakeFirst();
      if (!r.numUpdatedRows) throw notFound();
      await audit(tx, {
        actorUserId: admin(req),
        action: 'roaster.delete',
        entity: 'roaster',
        entityId: req.params.id,
      });
    });
    return reply.status(204).send();
  });

  // ---------------- products ----------------
  app.get(
    '/products',
    { schema: { querystring: z.object({ roaster_id: uuidSchema }) } },
    async (req) =>
      withCtx(deps.db, ctxOf(req), async (tx) => {
        const products = await tx
          .selectFrom('products')
          .selectAll()
          .where('roaster_id', '=', req.query.roaster_id)
          .where('deleted_at', 'is', null)
          .orderBy('name')
          .execute();
        const tiers = products.length
          ? await tx
              .selectFrom('price_tiers')
              .selectAll()
              .where(
                'product_id',
                'in',
                products.map((p) => p.id),
              )
              .where('deleted_at', 'is', null)
              .execute()
          : [];
        return products.map((p) => productDto(p, tiers));
      }),
  );

  app.post('/products', { schema: { body: productCreateSchema } }, async (req, reply) => {
    const b = req.body;
    const p = await withCtx(deps.db, ctxOf(req), async (tx) => {
      const row = await tx
        .insertInto('products')
        .values({
          roaster_id: b.roasterId,
          name: b.name,
          category: b.category,
          process: b.process ?? null,
          origin: b.origin,
          tasting_notes: b.tastingNotes,
          roast_level: b.roastLevel ?? null,
          is_active: b.isActive,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
      await audit(tx, {
        actorUserId: admin(req),
        action: 'product.create',
        entity: 'product',
        entityId: row.id,
        after: b,
      });
      return row;
    });
    return reply.status(201).send(productDto(p));
  });

  app.patch(
    '/products/:id',
    { schema: { params: idParams, body: productPatchSchema } },
    async (req) =>
      withCtx(deps.db, ctxOf(req), async (tx) => {
        const b = req.body;
        const set = {
          ...(b.name !== undefined && { name: b.name }),
          ...(b.category !== undefined && { category: b.category }),
          ...(b.process !== undefined && { process: b.process ?? null }),
          ...(b.origin !== undefined && { origin: b.origin }),
          ...(b.tastingNotes !== undefined && { tasting_notes: b.tastingNotes }),
          ...(b.roastLevel !== undefined && { roast_level: b.roastLevel ?? null }),
          ...(b.isActive !== undefined && { is_active: b.isActive }),
        };
        if (!Object.keys(set).length) throw badRequest('empty_patch', 'Değiştirilecek alan yok.');
        const row = await tx
          .updateTable('products')
          .set(set)
          .where('id', '=', req.params.id)
          .where('deleted_at', 'is', null)
          .returningAll()
          .executeTakeFirst();
        if (!row) throw notFound();
        await audit(tx, {
          actorUserId: admin(req),
          action: 'product.update',
          entity: 'product',
          entityId: row.id,
          after: b,
        });
        return productDto(row);
      }),
  );

  app.delete('/products/:id', { schema: { params: idParams } }, async (req, reply) => {
    await withCtx(deps.db, ctxOf(req), async (tx) => {
      const r = await tx
        .updateTable('products')
        .set({ deleted_at: deps.clock() })
        .where('id', '=', req.params.id)
        .where('deleted_at', 'is', null)
        .executeTakeFirst();
      if (!r.numUpdatedRows) throw notFound();
      await audit(tx, {
        actorUserId: admin(req),
        action: 'product.delete',
        entity: 'product',
        entityId: req.params.id,
      });
    });
    return reply.status(204).send();
  });

  // ---------------- price tiers (+history, rollback) ----------------
  app.post('/price-tiers', { schema: { body: priceTierCreateSchema } }, async (req, reply) => {
    const b = req.body;
    const t = await withCtx(deps.db, ctxOf(req, { changeReason: b.reason }), async (tx) => {
      const roasterId = await roasterOfProduct(tx, b.productId);
      const row = await tx
        .insertInto('price_tiers')
        .values({
          product_id: b.productId,
          min_kg: b.minKg,
          price_per_kg_kurus: b.pricePerKgKurus,
          valid_until: b.validUntil ?? null,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
      await touchRoasterPrices(tx, roasterId, deps.clock());
      await audit(tx, {
        actorUserId: admin(req),
        action: 'price.create',
        entity: 'price_tier',
        entityId: row.id,
        after: b,
      });
      return row;
    }).catch(uniqueViolation);
    return reply.status(201).send(tierDto(t));
  });

  app.patch(
    '/price-tiers/:id',
    { schema: { params: idParams, body: priceTierPatchSchema } },
    async (req) =>
      withCtx(deps.db, ctxOf(req, { changeReason: req.body.reason }), async (tx) => {
        const b = req.body;
        const before = await tx
          .selectFrom('price_tiers')
          .selectAll()
          .where('id', '=', req.params.id)
          .where('deleted_at', 'is', null)
          .executeTakeFirst();
        if (!before) throw notFound();
        const set = {
          ...(b.minKg !== undefined && { min_kg: b.minKg }),
          ...(b.pricePerKgKurus !== undefined && { price_per_kg_kurus: b.pricePerKgKurus }),
          ...(b.validUntil !== undefined && { valid_until: b.validUntil ?? null }),
        };
        if (!Object.keys(set).length) throw badRequest('empty_patch', 'Değiştirilecek alan yok.');
        const row = await tx
          .updateTable('price_tiers')
          .set(set)
          .where('id', '=', req.params.id)
          .returningAll()
          .executeTakeFirstOrThrow();
        await touchRoasterPrices(tx, await roasterOfProduct(tx, row.product_id), deps.clock());
        await audit(tx, {
          actorUserId: admin(req),
          action: 'price.update',
          entity: 'price_tier',
          entityId: row.id,
          before: { minKg: before.min_kg, pricePerKgKurus: before.price_per_kg_kurus },
          after: b,
        });
        return tierDto(row);
      }).catch(uniqueViolation),
  );

  app.delete(
    '/price-tiers/:id',
    { schema: { params: idParams, querystring: statusNoteSchema.partial() } },
    async (req, reply) => {
      await withCtx(deps.db, ctxOf(req, { changeReason: req.query.note ?? null }), async (tx) => {
        const row = await tx
          .updateTable('price_tiers')
          .set({ deleted_at: deps.clock() })
          .where('id', '=', req.params.id)
          .where('deleted_at', 'is', null)
          .returning('product_id')
          .executeTakeFirst();
        if (!row) throw notFound();
        await touchRoasterPrices(tx, await roasterOfProduct(tx, row.product_id), deps.clock());
        await audit(tx, {
          actorUserId: admin(req),
          action: 'price.delete',
          entity: 'price_tier',
          entityId: req.params.id,
        });
      });
      return reply.status(204).send();
    },
  );

  app.get('/price-tiers/:id/history', { schema: { params: idParams } }, async (req) =>
    withCtx(deps.db, ctxOf(req), async (tx) => {
      const rows = await tx
        .selectFrom('price_tier_history as h')
        .leftJoin('users as u', 'u.id', 'h.changed_by')
        .select([
          'h.id',
          'h.action',
          'h.min_kg',
          'h.old_price_kurus',
          'h.new_price_kurus',
          'h.reason',
          'h.changed_at',
          'u.email as changed_by_email',
        ])
        .where('h.price_tier_id', '=', req.params.id)
        .orderBy('h.id', 'desc')
        .limit(200)
        .execute();
      return rows.map((h) => ({
        id: h.id,
        action: h.action,
        minKg: h.min_kg,
        oldPriceKurus: h.old_price_kurus,
        newPriceKurus: h.new_price_kurus,
        reason: h.reason,
        changedAt: h.changed_at,
        changedBy: h.changed_by_email,
      }));
    }),
  );

  /** Undo one history entry (spec K8): update → old price back, delete → restore, insert → remove. */
  app.post(
    '/price-history/:id/rollback',
    { schema: { params: z.object({ id: z.coerce.number().int().positive() }) } },
    async (req) =>
      withCtx(deps.db, ctxOf(req, { changeReason: `rollback:${req.params.id}` }), async (tx) => {
        const h = await tx
          .selectFrom('price_tier_history')
          .selectAll()
          .where('id', '=', req.params.id)
          .executeTakeFirst();
        if (!h) throw notFound();
        const tier = await tx
          .selectFrom('price_tiers')
          .selectAll()
          .where('id', '=', h.price_tier_id)
          .forUpdate()
          .executeTakeFirst();
        if (!tier) throw notFound('tier_gone', 'Kademe artık yok.');
        if (h.action === 'insert') {
          await tx
            .updateTable('price_tiers')
            .set({ deleted_at: deps.clock() })
            .where('id', '=', tier.id)
            .execute();
        } else if (h.action === 'delete') {
          await tx
            .updateTable('price_tiers')
            .set({ deleted_at: null })
            .where('id', '=', tier.id)
            .execute()
            .catch(uniqueViolation);
        } else {
          if (h.old_price_kurus === null)
            throw badRequest('nothing_to_rollback', 'Bu kaydın geri alınacak eski fiyatı yok.');
          await tx
            .updateTable('price_tiers')
            .set({ price_per_kg_kurus: h.old_price_kurus, deleted_at: null })
            .where('id', '=', tier.id)
            .execute();
        }
        await touchRoasterPrices(tx, await roasterOfProduct(tx, tier.product_id), deps.clock());
        await audit(tx, {
          actorUserId: admin(req),
          action: 'price.rollback',
          entity: 'price_tier',
          entityId: tier.id,
          after: { historyId: h.id },
        });
        const now = await tx
          .selectFrom('price_tiers')
          .selectAll()
          .where('id', '=', tier.id)
          .executeTakeFirstOrThrow();
        return tierDto(now);
      }),
  );

  // ---------------- bulk import (dry-run first) ----------------
  app.post(
    '/roasters/:id/prices/import',
    { schema: { params: idParams, body: priceImportSchema } },
    async (req) => {
      const { rows, errors } = parsePriceImport(req.body.text);
      return withCtx(deps.db, ctxOf(req, { changeReason: 'import' }), async (tx) => {
        const roaster = await tx
          .selectFrom('roasters')
          .select('id')
          .where('id', '=', req.params.id)
          .where('deleted_at', 'is', null)
          .executeTakeFirst();
        if (!roaster) throw notFound();
        const products = await tx
          .selectFrom('products')
          .selectAll()
          .where('roaster_id', '=', roaster.id)
          .where('deleted_at', 'is', null)
          .execute();
        const tiers = products.length
          ? await tx
              .selectFrom('price_tiers')
              .selectAll()
              .where(
                'product_id',
                'in',
                products.map((p) => p.id),
              )
              .where('deleted_at', 'is', null)
              .execute()
          : [];
        const key = (s: string) => s.toLocaleLowerCase('tr').trim();
        const plan = rows.map((r) => {
          const p = products.find((x) => key(x.name) === key(r.productName));
          const t = p && tiers.find((x) => x.product_id === p.id && x.min_kg === r.minKg);
          const action = !p
            ? 'create_product'
            : !t
              ? 'create_tier'
              : t.price_per_kg_kurus === r.pricePerKgKurus
                ? 'unchanged'
                : 'update_price';
          return { ...r, action, oldPriceKurus: t?.price_per_kg_kurus ?? null };
        });
        const summary = {
          createProduct: plan.filter((p) => p.action === 'create_product').length,
          createTier: plan.filter((p) => p.action === 'create_tier').length,
          updatePrice: plan.filter((p) => p.action === 'update_price').length,
          unchanged: plan.filter((p) => p.action === 'unchanged').length,
          errors: errors.length,
        };
        if (req.body.dryRun || errors.length)
          return { dryRun: true, applied: false, plan, errors, summary };

        const createdProducts = new Map<string, string>();
        for (const r of plan) {
          if (r.action === 'unchanged') continue;
          let productId =
            products.find((x) => key(x.name) === key(r.productName))?.id ??
            createdProducts.get(key(r.productName));
          if (!productId) {
            const p = await tx
              .insertInto('products')
              .values({ roaster_id: roaster.id, name: r.productName, category: r.category })
              .returning('id')
              .executeTakeFirstOrThrow();
            productId = p.id;
            createdProducts.set(key(r.productName), p.id);
          }
          const existing = tiers.find((x) => x.product_id === productId && x.min_kg === r.minKg);
          if (existing) {
            await tx
              .updateTable('price_tiers')
              .set({ price_per_kg_kurus: r.pricePerKgKurus })
              .where('id', '=', existing.id)
              .execute();
          } else {
            await tx
              .insertInto('price_tiers')
              .values({
                product_id: productId,
                min_kg: r.minKg,
                price_per_kg_kurus: r.pricePerKgKurus,
              })
              .execute();
          }
        }
        await touchRoasterPrices(tx, roaster.id, deps.clock());
        await audit(tx, {
          actorUserId: admin(req),
          action: 'price.import',
          entity: 'roaster',
          entityId: roaster.id,
          after: summary,
        });
        return { dryRun: false, applied: true, plan, errors, summary };
      });
    },
  );
};
