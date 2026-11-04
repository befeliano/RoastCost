import {
  LEGAL_VERSIONS,
  acceptConsentsSchema,
  changePasswordSchema,
  deleteAccountSchema,
} from '@roastcost/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { withCtx } from '../../db';
import { hashPassword, verifyPassword } from '../../lib/crypto';
import { badRequest, notFound, unauthorized } from '../../lib/errors';
import { auth, ctxOf, requireAuth } from '../../plugins/auth';
import { revokeAllSessions } from '../auth/service';
import { deleteAccount } from './delete';
import { cafeDto, ingredientDto, settingsDto } from '../dto';

export const meRoutes: FastifyPluginAsyncZod = async (app) => {
  const deps = app.deps;
  app.addHook('onRequest', requireAuth);

  app.get('/', async (req) => {
    const a = auth(req);
    return withCtx(deps.db, ctxOf(req), async (tx) => {
      const user = await tx
        .selectFrom('users')
        .select(['id', 'email', 'role', 'email_verified_at', 'created_at'])
        .where('id', '=', a.userId)
        .where('deleted_at', 'is', null)
        .executeTakeFirst();
      if (!user) throw unauthorized();
      const cafe = a.cafeId
        ? await tx.selectFrom('cafes').selectAll().where('id', '=', a.cafeId).executeTakeFirst()
        : undefined;
      const consents = await tx
        .selectFrom('consents')
        .select(['doc_type', 'doc_version'])
        .where('user_id', '=', a.userId)
        .execute();
      const missingConsents = (
        Object.keys(LEGAL_VERSIONS) as (keyof typeof LEGAL_VERSIONS)[]
      ).filter(
        (d) => !consents.some((c) => c.doc_type === d && c.doc_version === LEGAL_VERSIONS[d]),
      );
      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          emailVerified: !!user.email_verified_at,
          createdAt: user.created_at,
        },
        cafe: cafe ? cafeDto(cafe) : null,
        missingConsents,
        legalVersions: LEGAL_VERSIONS,
      };
    });
  });

  app.post('/consents', { schema: { body: acceptConsentsSchema } }, async (req) => {
    const a = auth(req);
    for (const c of req.body.consents) {
      if (LEGAL_VERSIONS[c.docType] !== c.docVersion)
        throw badRequest('stale_version', 'Metnin güncel sürümünü kabul edin.');
    }
    await withCtx(deps.db, ctxOf(req), (tx) =>
      tx
        .insertInto('consents')
        .values(
          req.body.consents.map((c) => ({
            user_id: a.userId,
            doc_type: c.docType,
            doc_version: c.docVersion,
          })),
        )
        .execute(),
    );
    return { ok: true };
  });

  app.post(
    '/change-password',
    {
      config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
      schema: { body: changePasswordSchema },
    },
    async (req) => {
      const a = auth(req);
      const current = await withCtx(deps.db, ctxOf(req), (tx) =>
        tx
          .selectFrom('users')
          .select('password_hash')
          .where('id', '=', a.userId)
          .executeTakeFirst(),
      );
      if (!current || !(await verifyPassword(current.password_hash, req.body.currentPassword))) {
        throw badRequest('wrong_password', 'Mevcut parola hatalı.');
      }
      const hash = await hashPassword(req.body.newPassword);
      await withCtx(deps.db, ctxOf(req), async (tx) => {
        await tx
          .updateTable('users')
          .set({ password_hash: hash })
          .where('id', '=', a.userId)
          .execute();
        await revokeAllSessions(tx, a.userId, deps.clock()); // every device must log in again
      });
      return { ok: true };
    },
  );

  /** KVKK access right: everything we hold about this user/cafe as JSON. */
  app.get(
    '/export',
    { config: { rateLimit: { max: 5, timeWindow: '1 hour' } } },
    async (req, reply) => {
      const a = auth(req);
      const data = await withCtx(deps.db, ctxOf(req), async (tx) => {
        const user = await tx
          .selectFrom('users')
          .select(['id', 'email', 'role', 'email_verified_at', 'created_at', 'updated_at'])
          .where('id', '=', a.userId)
          .executeTakeFirstOrThrow();
        const consents = await tx
          .selectFrom('consents')
          .select(['doc_type', 'doc_version', 'accepted_at'])
          .where('user_id', '=', a.userId)
          .execute();
        if (!a.cafeId) return { user, consents };
        const cafe = await tx
          .selectFrom('cafes')
          .selectAll()
          .where('id', '=', a.cafeId)
          .executeTakeFirst();
        const settings = await tx
          .selectFrom('cafe_settings')
          .selectAll()
          .where('cafe_id', '=', a.cafeId)
          .executeTakeFirst();
        const ingredients = await tx
          .selectFrom('cafe_ingredients')
          .selectAll()
          .where('cafe_id', '=', a.cafeId)
          .execute();
        const recipes = await tx
          .selectFrom('recipes')
          .selectAll()
          .where('cafe_id', '=', a.cafeId)
          .execute();
        const recipeIngredients = recipes.length
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
        const orders = await tx
          .selectFrom('orders')
          .select([
            'id',
            'order_no',
            'roaster_name_snapshot',
            'status',
            'requested_delivery_date',
            'note',
            'subtotal_kurus',
            'sent_at',
            'decided_at',
            'decline_reason',
            'created_at',
          ])
          .where('cafe_id', '=', a.cafeId)
          .execute();
        const items = orders.length
          ? await tx
              .selectFrom('order_items')
              .select([
                'order_id',
                'product_name_snapshot',
                'quantity_g',
                'price_per_kg_kurus_snapshot',
                'line_total_kurus',
              ])
              .where(
                'order_id',
                'in',
                orders.map((o) => o.id),
              )
              .execute()
          : [];
        return {
          user,
          consents,
          cafe: cafe ? cafeDto(cafe) : null,
          settings: settings ? settingsDto(settings) : null,
          ingredients: ingredients.map(ingredientDto),
          recipes: recipes.map((r) => ({
            ...r,
            ingredients: recipeIngredients.filter((x) => x.recipe_id === r.id),
          })),
          orders: orders.map((o) => ({ ...o, items: items.filter((i) => i.order_id === o.id) })),
        };
      });
      reply.header('Content-Disposition', 'attachment; filename="roastcost-verilerim.json"');
      return { exportedAt: deps.clock().toISOString(), ...data };
    },
  );

  /** Account deletion — see ./delete.ts */
  app.delete(
    '/',
    {
      config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
      schema: { body: deleteAccountSchema },
    },
    async (req, reply) => {
      const a = auth(req);
      const user = await withCtx(deps.db, ctxOf(req), (tx) =>
        tx
          .selectFrom('users')
          .select(['password_hash', 'role'])
          .where('id', '=', a.userId)
          .where('deleted_at', 'is', null)
          .executeTakeFirst(),
      );
      if (!user) throw notFound();
      if (!(await verifyPassword(user.password_hash, req.body.password)))
        throw badRequest('wrong_password', 'Parola hatalı.');
      if (user.role === 'admin')
        throw badRequest('admin_cannot_delete', 'Admin hesabı uygulamadan silinemez.');

      await deleteAccount(deps, a.userId, a.cafeId);
      return reply.status(204).send();
    },
  );
};
