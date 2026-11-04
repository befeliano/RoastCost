import { orderCreateSchema, uuidSchema } from '@roastcost/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { withCtx } from '../../db';
import { notFound } from '../../lib/errors';
import { auth, ctxOf, requireCafe } from '../../plugins/auth';
import { decodeCursor, encodeCursor } from '../dto';
import { createOrder, orderDto, regenerateLink, transition } from './service';

const idParams = z.object({ id: uuidSchema });

export const orderRoutes: FastifyPluginAsyncZod = async (app) => {
  const deps = app.deps;
  app.addHook('onRequest', requireCafe);

  app.post(
    '/',
    {
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
      schema: { body: orderCreateSchema },
    },
    async (req, reply) => reply.status(201).send(await createOrder(deps, ctxOf(req), req.body)),
  );

  app.post('/:id/link', { schema: { params: idParams } }, async (req) =>
    regenerateLink(deps, ctxOf(req), req.params.id),
  );
  app.post('/:id/mark-sent', { schema: { params: idParams } }, async (req) =>
    transition(deps, ctxOf(req), req.params.id, 'sent'),
  );
  app.post('/:id/cancel', { schema: { params: idParams } }, async (req) =>
    transition(deps, ctxOf(req), req.params.id, 'cancelled'),
  );

  app.get(
    '/',
    {
      schema: {
        querystring: z.object({
          cursor: z.string().max(200).optional(),
          limit: z.coerce.number().int().min(1).max(50).default(20),
        }),
      },
    },
    async (req) =>
      withCtx(deps.db, ctxOf(req), async (tx) => {
        const c = decodeCursor(req.query.cursor);
        let q = tx
          .selectFrom('orders')
          .selectAll()
          .where('cafe_id', '=', auth(req).cafeId as string);
        if (c)
          q = q.where((eb) =>
            eb.or([
              eb('created_at', '<', c.createdAt),
              eb.and([eb('created_at', '=', c.createdAt), eb('id', '<', c.id)]),
            ]),
          );
        const rows = await q
          .orderBy('created_at', 'desc')
          .orderBy('id', 'desc')
          .limit(req.query.limit + 1)
          .execute();
        const page = rows.slice(0, req.query.limit);
        const last = page[page.length - 1];
        return {
          items: page.map((o) => orderDto(o)),
          nextCursor:
            rows.length > req.query.limit && last ? encodeCursor(last.created_at, last.id) : null,
        };
      }),
  );

  app.get('/:id', { schema: { params: idParams } }, async (req) =>
    withCtx(deps.db, ctxOf(req), async (tx) => {
      const o = await tx
        .selectFrom('orders')
        .selectAll()
        .where('id', '=', req.params.id)
        .where('cafe_id', '=', auth(req).cafeId as string)
        .executeTakeFirst();
      if (!o) throw notFound();
      const items = await tx
        .selectFrom('order_items')
        .selectAll()
        .where('order_id', '=', o.id)
        .execute();
      return orderDto(o, items);
    }),
  );
};
