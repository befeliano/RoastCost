import {
  cafePatchSchema,
  cafeSettingsPatchSchema,
  ingredientCreateSchema,
  ingredientPatchSchema,
  recipePatchSchema,
  recipeUpsertSchema,
  uuidSchema,
} from '@roastcost/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { withCtx, type Tx } from '../../db';
import { badRequest, conflict, notFound } from '../../lib/errors';
import { auth, ctxOf, requireCafe } from '../../plugins/auth';
import { cafeDto, ingredientDto, settingsDto } from '../dto';

const idParams = z.object({ id: uuidSchema });

async function recipesWithIngredients(tx: Tx, cafeId: string, onlyId?: string) {
  let q = tx.selectFrom('recipes').selectAll().where('cafe_id', '=', cafeId);
  if (onlyId) q = q.where('id', '=', onlyId);
  const recipes = await q.orderBy('sort_order').orderBy('created_at').execute();
  const ri = recipes.length
    ? await tx
        .selectFrom('recipe_ingredients')
        .selectAll()
        .where(
          'recipe_id',
          'in',
          recipes.map((r) => r.id),
        )
        .execute()
    : [];
  return recipes.map((r) => ({
    id: r.id,
    name: r.name,
    templateKey: r.template_key,
    coffeeGrams: r.coffee_grams,
    usesCup: r.uses_cup,
    sellPriceKurus: r.sell_price_kurus,
    sortOrder: r.sort_order,
    isActive: r.is_active,
    updatedAt: r.updated_at,
    ingredients: ri
      .filter((x) => x.recipe_id === r.id)
      .map((x) => ({ ingredientId: x.ingredient_id, quantityMl: x.quantity_ml })),
  }));
}

async function replaceRecipeIngredients(
  tx: Tx,
  recipeId: string,
  items: { ingredientId: string; quantityMl: number }[],
) {
  await tx.deleteFrom('recipe_ingredients').where('recipe_id', '=', recipeId).execute();
  if (items.length) {
    await tx
      .insertInto('recipe_ingredients')
      .values(
        items.map((i) => ({
          recipe_id: recipeId,
          ingredient_id: i.ingredientId,
          quantity_ml: i.quantityMl,
        })),
      )
      .execute();
  }
}

function mapDbError(e: unknown): never {
  const err = e as { code?: string; message?: string };
  if (err.code === '23514' && err.message?.includes('does not belong'))
    throw badRequest('foreign_ingredient', 'Malzeme bu kafeye ait değil.');
  if (err.code === '23503')
    throw conflict('in_use', 'Bu malzeme bir reçetede kullanılıyor; önce reçeteden çıkarın.');
  throw e;
}

export const cafeRoutes: FastifyPluginAsyncZod = async (app) => {
  const deps = app.deps;
  app.addHook('onRequest', requireCafe);
  const cafeId = (req: Parameters<typeof auth>[0]) => auth(req).cafeId as string;

  app.get('/', async (req) =>
    withCtx(deps.db, ctxOf(req), async (tx) => {
      const c = await tx
        .selectFrom('cafes')
        .selectAll()
        .where('id', '=', cafeId(req))
        .executeTakeFirst();
      if (!c) throw notFound();
      return cafeDto(c);
    }),
  );

  app.patch('/', { schema: { body: cafePatchSchema } }, async (req) =>
    withCtx(deps.db, ctxOf(req), async (tx) => {
      const b = req.body;
      const c = await tx
        .updateTable('cafes')
        .set({
          ...(b.name && { name: b.name }),
          ...(b.district && { district: b.district }),
          ...(b.phone && { phone_e164: b.phone }),
        })
        .where('id', '=', cafeId(req))
        .returningAll()
        .executeTakeFirst();
      if (!c) throw notFound();
      return cafeDto(c);
    }),
  );

  app.get('/settings', async (req) =>
    withCtx(deps.db, ctxOf(req), async (tx) => {
      const s = await tx
        .selectFrom('cafe_settings')
        .selectAll()
        .where('cafe_id', '=', cafeId(req))
        .executeTakeFirst();
      if (!s) throw notFound();
      return settingsDto(s);
    }),
  );

  app.patch('/settings', { schema: { body: cafeSettingsPatchSchema } }, async (req) =>
    withCtx(deps.db, ctxOf(req), async (tx) => {
      const b = req.body;
      const set = {
        ...(b.espressoDoseG !== undefined && { espresso_dose_g: b.espressoDoseG }),
        ...(b.coffeeWastePct !== undefined && { coffee_waste_pct: b.coffeeWastePct }),
        ...(b.ingredientWastePct !== undefined && { ingredient_waste_pct: b.ingredientWastePct }),
        ...(b.cupCostKurus !== undefined && { cup_cost_kurus: b.cupCostKurus }),
        ...(b.fixedOverheadPerCupKurus !== undefined && {
          fixed_overhead_per_cup_kurus: b.fixedOverheadPerCupKurus,
        }),
        ...(b.targetMarginPct !== undefined && { target_margin_pct: b.targetMarginPct }),
        ...(b.saleVatRatePct !== undefined && { sale_vat_rate_pct: b.saleVatRatePct }),
        ...(b.costExcludesVat !== undefined && { cost_excludes_vat: b.costExcludesVat }),
        ...(b.priceRoundingStepKurus !== undefined && {
          price_rounding_step_kurus: b.priceRoundingStepKurus,
        }),
      };
      if (!Object.keys(set).length) throw badRequest('empty_patch', 'Değiştirilecek alan yok.');
      const s = await tx
        .updateTable('cafe_settings')
        .set(set)
        .where('cafe_id', '=', cafeId(req))
        .returningAll()
        .executeTakeFirst();
      if (!s) throw notFound();
      return settingsDto(s);
    }),
  );

  // ---- ingredients ----
  app.get('/ingredients', async (req) =>
    withCtx(deps.db, ctxOf(req), async (tx) =>
      (
        await tx
          .selectFrom('cafe_ingredients')
          .selectAll()
          .where('cafe_id', '=', cafeId(req))
          .orderBy('created_at')
          .execute()
      ).map(ingredientDto),
    ),
  );

  app.post('/ingredients', { schema: { body: ingredientCreateSchema } }, async (req, reply) => {
    const row = await withCtx(deps.db, ctxOf(req), (tx) =>
      tx
        .insertInto('cafe_ingredients')
        .values({
          cafe_id: cafeId(req),
          name: req.body.name,
          kind: req.body.kind,
          price_per_liter_kurus: req.body.pricePerLiterKurus,
          is_active: req.body.isActive ?? true,
        })
        .returningAll()
        .executeTakeFirstOrThrow(),
    );
    return reply.status(201).send(ingredientDto(row));
  });

  app.patch(
    '/ingredients/:id',
    { schema: { params: idParams, body: ingredientPatchSchema } },
    async (req) =>
      withCtx(deps.db, ctxOf(req), async (tx) => {
        const b = req.body;
        const row = await tx
          .updateTable('cafe_ingredients')
          .set({
            ...(b.name !== undefined && { name: b.name }),
            ...(b.kind !== undefined && { kind: b.kind }),
            ...(b.pricePerLiterKurus !== undefined && {
              price_per_liter_kurus: b.pricePerLiterKurus,
            }),
            ...(b.isActive !== undefined && { is_active: b.isActive }),
          })
          .where('id', '=', req.params.id)
          .where('cafe_id', '=', cafeId(req))
          .returningAll()
          .executeTakeFirst();
        if (!row) throw notFound();
        return ingredientDto(row);
      }),
  );

  app.delete('/ingredients/:id', { schema: { params: idParams } }, async (req, reply) => {
    await withCtx(deps.db, ctxOf(req), async (tx) => {
      const r = await tx
        .deleteFrom('cafe_ingredients')
        .where('id', '=', req.params.id)
        .where('cafe_id', '=', cafeId(req))
        .executeTakeFirst();
      if (!r.numDeletedRows) throw notFound();
    }).catch(mapDbError);
    return reply.status(204).send();
  });

  // ---- recipes ----
  app.get('/recipes', async (req) =>
    withCtx(deps.db, ctxOf(req), (tx) => recipesWithIngredients(tx, cafeId(req))),
  );

  app.post('/recipes', { schema: { body: recipeUpsertSchema } }, async (req, reply) => {
    const b = req.body;
    const recipe = await withCtx(deps.db, ctxOf(req), async (tx) => {
      const r = await tx
        .insertInto('recipes')
        .values({
          cafe_id: cafeId(req),
          name: b.name,
          template_key: b.templateKey ?? null,
          coffee_grams: b.coffeeGrams ?? null,
          uses_cup: b.usesCup,
          sell_price_kurus: b.sellPriceKurus ?? null,
          sort_order: b.sortOrder ?? 100,
          is_active: b.isActive ?? true,
        })
        .returning('id')
        .executeTakeFirstOrThrow();
      await replaceRecipeIngredients(tx, r.id, b.ingredients);
      return (await recipesWithIngredients(tx, cafeId(req), r.id))[0];
    }).catch(mapDbError);
    return reply.status(201).send(recipe);
  });

  app.patch(
    '/recipes/:id',
    { schema: { params: idParams, body: recipePatchSchema } },
    async (req) =>
      withCtx(deps.db, ctxOf(req), async (tx) => {
        const b = req.body;
        const set = {
          ...(b.name !== undefined && { name: b.name }),
          ...(b.templateKey !== undefined && { template_key: b.templateKey ?? null }),
          ...(b.coffeeGrams !== undefined && { coffee_grams: b.coffeeGrams ?? null }),
          ...(b.usesCup !== undefined && { uses_cup: b.usesCup }),
          ...(b.sellPriceKurus !== undefined && { sell_price_kurus: b.sellPriceKurus ?? null }),
          ...(b.sortOrder !== undefined && { sort_order: b.sortOrder }),
          ...(b.isActive !== undefined && { is_active: b.isActive }),
        };
        const exists = await tx
          .updateTable('recipes')
          .set(Object.keys(set).length ? set : { updated_at: deps.clock() })
          .where('id', '=', req.params.id)
          .where('cafe_id', '=', cafeId(req))
          .returning('id')
          .executeTakeFirst();
        if (!exists) throw notFound();
        if (b.ingredients) await replaceRecipeIngredients(tx, req.params.id, b.ingredients);
        return (await recipesWithIngredients(tx, cafeId(req), req.params.id))[0];
      }).catch(mapDbError),
  );

  app.delete('/recipes/:id', { schema: { params: idParams } }, async (req, reply) => {
    await withCtx(deps.db, ctxOf(req), async (tx) => {
      const r = await tx
        .deleteFrom('recipes')
        .where('id', '=', req.params.id)
        .where('cafe_id', '=', cafeId(req))
        .executeTakeFirst();
      if (!r.numDeletedRows) throw notFound();
    });
    return reply.status(204).send();
  });
};
