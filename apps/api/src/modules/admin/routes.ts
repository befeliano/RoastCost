import {
  CAFE_STATUSES,
  COMMISSION_STATUSES,
  ORDER_STATUSES,
  cafePatchSchema,
  commissionAmountKurus,
  commissionPatchSchema,
  decideFirstOrder,
  decisionFixSchema,
  statusNoteSchema,
  uuidSchema,
} from '@roastcost/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { sql } from 'kysely';
import { z } from 'zod';
import { withCtx } from '../../db';
import type { CommissionStatusDb } from '../../db/types';
import { audit } from '../../lib/audit';
import { badRequest, notFound } from '../../lib/errors';
import { auth, ctxOf, requireAdmin } from '../../plugins/auth';
import { cafeDto, decodeCursor, encodeCursor } from '../dto';
import { orderDto } from '../orders/service';
import { adminCatalogRoutes } from './catalog';

const idParams = z.object({ id: uuidSchema });
const pageQuery = {
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
};

/** Allowed manual commission moves (spec §8.4: pending → requested → paid / waived, plus corrections). */
const COMMISSION_FLOW: Record<CommissionStatusDb, CommissionStatusDb[]> = {
  not_applicable: [],
  pending: ['requested', 'paid', 'waived'],
  requested: ['pending', 'paid', 'waived'],
  paid: ['requested'],
  waived: ['pending'],
};

export const adminRoutes: FastifyPluginAsyncZod = async (app) => {
  const deps = app.deps;
  app.addHook('onRequest', requireAdmin);
  const admin = (req: Parameters<typeof auth>[0]) => auth(req).userId;

  await app.register(adminCatalogRoutes);

  app.get('/stats', async (req) =>
    withCtx(deps.db, ctxOf(req), async (tx) => {
      const r = await sql<{
        pending_cafes: number;
        approved_cafes: number;
        to_collect_kurus: number | null;
        requested_kurus: number | null;
        orders_this_month: number;
        conflicts: number;
      }>`select
          (select count(*) from cafes where status = 'pending' and deleted_at is null)::int as pending_cafes,
          (select count(*) from cafes where status = 'approved' and deleted_at is null)::int as approved_cafes,
          (select sum(commission_amount_kurus) from orders where commission_status = 'pending') as to_collect_kurus,
          (select sum(commission_amount_kurus) from orders where commission_status = 'requested') as requested_kurus,
          (select count(*) from orders where created_at >= date_trunc('month', now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul' and status <> 'draft')::int as orders_this_month,
          (select count(*) from orders where commission_conflict and commission_status = 'not_applicable')::int as conflicts`.execute(
        tx,
      );
      const s = r.rows[0];
      return {
        pendingCafes: s?.pending_cafes ?? 0,
        approvedCafes: s?.approved_cafes ?? 0,
        commissionToCollectKurus: Number(s?.to_collect_kurus ?? 0),
        commissionRequestedKurus: Number(s?.requested_kurus ?? 0),
        ordersThisMonth: s?.orders_this_month ?? 0,
        commissionConflicts: s?.conflicts ?? 0,
      };
    }),
  );

  // ---------------- cafes ----------------
  app.get(
    '/cafes',
    {
      schema: { querystring: z.object({ status: z.enum(CAFE_STATUSES).optional(), ...pageQuery }) },
    },
    async (req) =>
      withCtx(deps.db, ctxOf(req), async (tx) => {
        const c = decodeCursor(req.query.cursor);
        let q = tx
          .selectFrom('cafes as c')
          .leftJoin('cafe_members as m', 'm.cafe_id', 'c.id')
          .leftJoin('users as u', 'u.id', 'm.user_id')
          .selectAll('c')
          .select(['u.email as owner_email', 'u.email_verified_at as owner_verified_at'])
          .where('c.deleted_at', 'is', null);
        if (req.query.status) q = q.where('c.status', '=', req.query.status);
        if (c)
          q = q.where((eb) =>
            eb.or([
              eb('c.created_at', '<', c.createdAt),
              eb.and([eb('c.created_at', '=', c.createdAt), eb('c.id', '<', c.id)]),
            ]),
          );
        const rows = await q
          .orderBy('c.created_at', 'desc')
          .orderBy('c.id', 'desc')
          .limit(req.query.limit + 1)
          .execute();
        const page = rows.slice(0, req.query.limit);
        const last = page[page.length - 1];
        return {
          items: page.map((r) => ({
            ...cafeDto(r),
            ownerEmail: r.owner_email,
            ownerEmailVerified: !!r.owner_verified_at,
          })),
          nextCursor:
            rows.length > req.query.limit && last ? encodeCursor(last.created_at, last.id) : null,
        };
      }),
  );

  app.get('/cafes/:id', { schema: { params: idParams } }, async (req) =>
    withCtx(deps.db, ctxOf(req), async (tx) => {
      const c = await tx
        .selectFrom('cafes')
        .selectAll()
        .where('id', '=', req.params.id)
        .executeTakeFirst();
      if (!c) throw notFound();
      const owner = await tx
        .selectFrom('cafe_members as m')
        .innerJoin('users as u', 'u.id', 'm.user_id')
        .select(['u.email', 'u.email_verified_at', 'u.created_at'])
        .where('m.cafe_id', '=', c.id)
        .executeTakeFirst();
      const orders = await tx
        .selectFrom('orders')
        .select([(eb) => eb.fn.countAll<number>().as('n')])
        .where('cafe_id', '=', c.id)
        .executeTakeFirst();
      return {
        ...cafeDto(c),
        owner: owner
          ? {
              email: owner.email,
              emailVerified: !!owner.email_verified_at,
              createdAt: owner.created_at,
            }
          : null,
        orderCount: Number(orders?.n ?? 0),
      };
    }),
  );

  app.patch(
    '/cafes/:id',
    {
      schema: {
        params: idParams,
        body: cafePatchSchema.extend({ city: z.string().trim().min(2).max(80).optional() }),
      },
    },
    async (req) =>
      withCtx(deps.db, ctxOf(req), async (tx) => {
        const b = req.body;
        const before = await tx
          .selectFrom('cafes')
          .selectAll()
          .where('id', '=', req.params.id)
          .executeTakeFirst();
        if (!before) throw notFound();
        const row = await tx
          .updateTable('cafes')
          .set({
            ...(b.name && { name: b.name }),
            ...(b.district && { district: b.district }),
            ...(b.phone && { phone_e164: b.phone }),
            ...(b.city && { city: b.city }),
          })
          .where('id', '=', req.params.id)
          .returningAll()
          .executeTakeFirstOrThrow();
        await audit(tx, {
          actorUserId: admin(req),
          action: 'cafe.update',
          entity: 'cafe',
          entityId: row.id,
          before: cafeDto(before),
          after: b,
        });
        return cafeDto(row);
      }),
  );

  for (const [action, status] of [
    ['approve', 'approved'],
    ['reject', 'rejected'],
    ['suspend', 'suspended'],
  ] as const) {
    app.post(
      `/cafes/:id/${action}`,
      { schema: { params: idParams, body: statusNoteSchema } },
      async (req) =>
        withCtx(deps.db, ctxOf(req), async (tx) => {
          const before = await tx
            .selectFrom('cafes')
            .select(['status'])
            .where('id', '=', req.params.id)
            .where('deleted_at', 'is', null)
            .executeTakeFirst();
          if (!before) throw notFound();
          const now = deps.clock();
          const row = await tx
            .updateTable('cafes')
            .set({
              status,
              status_note: req.body.note,
              ...(status === 'approved' ? { approved_at: now, approved_by: admin(req) } : {}),
            })
            .where('id', '=', req.params.id)
            .returningAll()
            .executeTakeFirstOrThrow();
          await audit(tx, {
            actorUserId: admin(req),
            action: `cafe.${action}`,
            entity: 'cafe',
            entityId: row.id,
            before: { status: before.status },
            after: { status, note: req.body.note },
          });
          return cafeDto(row);
        }),
    );
  }

  // ---------------- orders & commission ----------------
  app.get(
    '/orders',
    {
      schema: {
        querystring: z.object({
          commission_status: z.enum(COMMISSION_STATUSES).optional(),
          status: z.enum(ORDER_STATUSES).optional(),
          roaster_id: uuidSchema.optional(),
          cafe_id: uuidSchema.optional(),
          conflict: z.enum(['true']).optional(),
          ...pageQuery,
        }),
      },
    },
    async (req) =>
      withCtx(deps.db, ctxOf(req), async (tx) => {
        const qy = req.query;
        const c = decodeCursor(qy.cursor);
        let q = tx.selectFrom('orders').selectAll();
        if (qy.commission_status) q = q.where('commission_status', '=', qy.commission_status);
        if (qy.status) q = q.where('status', '=', qy.status);
        if (qy.roaster_id) q = q.where('roaster_id', '=', qy.roaster_id);
        if (qy.cafe_id) q = q.where('cafe_id', '=', qy.cafe_id);
        if (qy.conflict) q = q.where('commission_conflict', '=', true);
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
          .limit(qy.limit + 1)
          .execute();
        const page = rows.slice(0, qy.limit);
        const last = page[page.length - 1];
        return {
          items: page.map((o) => ({ ...orderDto(o), ...adminOrderFields(o) })),
          nextCursor:
            rows.length > qy.limit && last ? encodeCursor(last.created_at, last.id) : null,
        };
      }),
  );

  app.get('/orders/:id', { schema: { params: idParams } }, async (req) =>
    withCtx(deps.db, ctxOf(req), async (tx) => {
      const o = await tx
        .selectFrom('orders')
        .selectAll()
        .where('id', '=', req.params.id)
        .executeTakeFirst();
      if (!o) throw notFound();
      const items = await tx
        .selectFrom('order_items')
        .selectAll()
        .where('order_id', '=', o.id)
        .execute();
      return { ...orderDto(o, items), ...adminOrderFields(o) };
    }),
  );

  app.patch(
    '/orders/:id/commission',
    { schema: { params: idParams, body: commissionPatchSchema } },
    async (req) =>
      withCtx(deps.db, ctxOf(req), async (tx) => {
        const o = await tx
          .selectFrom('orders')
          .selectAll()
          .where('id', '=', req.params.id)
          .forUpdate()
          .executeTakeFirst();
        if (!o) throw notFound();
        const b = req.body;
        if (o.commission_status === 'not_applicable')
          throw badRequest('no_commission', 'Bu siparişte komisyon yok.');
        if (
          b.status &&
          b.status !== o.commission_status &&
          !COMMISSION_FLOW[o.commission_status].includes(b.status)
        ) {
          throw badRequest(
            'invalid_transition',
            `Komisyon durumu ${o.commission_status} → ${b.status} yapılamaz.`,
          );
        }
        const base = b.baseKurus ?? o.commission_base_kurus ?? o.subtotal_kurus;
        const rate = o.commission_rate_bp_snapshot ?? 0;
        const row = await tx
          .updateTable('orders')
          .set({
            ...(b.status && { commission_status: b.status }),
            ...(b.baseKurus !== undefined && {
              commission_base_kurus: base,
              commission_amount_kurus: commissionAmountKurus(base, rate),
            }),
            ...(b.note !== undefined && { commission_note: b.note }),
          })
          .where('id', '=', o.id)
          .returningAll()
          .executeTakeFirstOrThrow();
        await audit(tx, {
          actorUserId: admin(req),
          action: 'order.commission',
          entity: 'order',
          entityId: o.id,
          before: adminOrderFields(o),
          after: adminOrderFields(row),
        });
        return { ...orderDto(row), ...adminOrderFields(row) };
      }),
  );

  /** Fix a wrong roaster decision (the roaster cannot change it from the link). */
  app.patch(
    '/orders/:id/decision',
    { schema: { params: idParams, body: decisionFixSchema } },
    async (req) =>
      withCtx(deps.db, ctxOf(req), async (tx) => {
        const o = await tx
          .selectFrom('orders')
          .selectAll()
          .where('id', '=', req.params.id)
          .forUpdate()
          .executeTakeFirst();
        if (!o) throw notFound();
        const b = req.body;
        await sql`select pg_advisory_xact_lock(hashtext(${o.cafe_id + ':' + o.roaster_id}))`.execute(
          tx,
        );
        const now = deps.clock();
        let set;
        if (b.status === 'confirmed') {
          if (b.roasterSaysNewCustomer === undefined || b.roasterSaysNewCustomer === null) {
            throw badRequest('missing_customer_flag', 'Yeni müşteri bilgisi gerekli.');
          }
          const previous = await tx
            .selectFrom('orders')
            .select('id')
            .where('cafe_id', '=', o.cafe_id)
            .where('roaster_id', '=', o.roaster_id)
            .where('status', '=', 'confirmed')
            .where('id', '<>', o.id)
            .executeTakeFirst();
          const rate = await tx
            .selectFrom('roaster_admin')
            .select('commission_rate_bp')
            .where('roaster_id', '=', o.roaster_id)
            .executeTakeFirst();
          const d = decideFirstOrder({
            roasterSaysNewCustomer: b.roasterSaysNewCustomer,
            hasPreviousConfirmedOrder: !!previous,
            subtotalKurus: o.subtotal_kurus,
            commissionRateBp: o.commission_rate_bp_snapshot ?? rate?.commission_rate_bp ?? 1500,
          });
          set = {
            status: 'confirmed' as const,
            decided_at: o.decided_at ?? now,
            roaster_says_new_customer: b.roasterSaysNewCustomer,
            is_first_order: d.isFirstOrder,
            commission_conflict: d.conflict,
            commission_rate_bp_snapshot: d.commissionRateBpSnapshot,
            commission_base_kurus: d.commissionBaseKurus,
            commission_amount_kurus: d.commissionAmountKurus,
            commission_status: d.commissionStatus,
          };
        } else {
          set = {
            status: b.status,
            decided_at: o.decided_at ?? now,
            decline_reason:
              b.status === 'declined' ? (b.reason ?? o.decline_reason) : o.decline_reason,
            is_first_order: null,
            commission_conflict: false,
            commission_rate_bp_snapshot: null,
            commission_base_kurus: null,
            commission_amount_kurus: null,
            commission_status: 'not_applicable' as const,
          };
        }
        // clear first-order flag first so the unique index never sees two rows
        await tx
          .updateTable('orders')
          .set({ is_first_order: null })
          .where('id', '=', o.id)
          .execute();
        const row = await tx
          .updateTable('orders')
          .set(set)
          .where('id', '=', o.id)
          .returningAll()
          .executeTakeFirstOrThrow();
        await audit(tx, {
          actorUserId: admin(req),
          action: 'order.decision_fix',
          entity: 'order',
          entityId: o.id,
          before: { status: o.status, ...adminOrderFields(o) },
          after: { status: row.status, reason: b.reason, ...adminOrderFields(row) },
        });
        return { ...orderDto(row), ...adminOrderFields(row) };
      }),
  );

  // ---------------- audit ----------------
  app.get(
    '/audit-logs',
    {
      schema: {
        querystring: z.object({
          entity: z.string().max(40).optional(),
          entity_id: uuidSchema.optional(),
          before_id: z.coerce.number().int().positive().optional(),
          limit: pageQuery.limit,
        }),
      },
    },
    async (req) =>
      withCtx(deps.db, ctxOf(req), async (tx) => {
        let q = tx
          .selectFrom('audit_logs as a')
          .leftJoin('users as u', 'u.id', 'a.actor_user_id')
          .select([
            'a.id',
            'a.action',
            'a.entity',
            'a.entity_id',
            'a.before',
            'a.after',
            'a.created_at',
            'u.email as actor_email',
          ]);
        if (req.query.entity) q = q.where('a.entity', '=', req.query.entity);
        if (req.query.entity_id) q = q.where('a.entity_id', '=', req.query.entity_id);
        if (req.query.before_id) q = q.where('a.id', '<', req.query.before_id);
        const rows = await q.orderBy('a.id', 'desc').limit(req.query.limit).execute();
        return {
          items: rows.map((r) => ({
            id: r.id,
            action: r.action,
            entity: r.entity,
            entityId: r.entity_id,
            before: r.before,
            after: r.after,
            createdAt: r.created_at,
            actor:
              r.actor_email ??
              (r.action.startsWith('order.roaster') ? 'kavurucu (bağlantı)' : null),
          })),
          nextBeforeId:
            rows.length === req.query.limit ? (rows[rows.length - 1]?.id ?? null) : null,
        };
      }),
  );
};

function adminOrderFields(o: {
  cafe_id: string;
  cafe_name_snapshot: string;
  cafe_phone_snapshot: string;
  roaster_says_new_customer: boolean | null;
  is_first_order: boolean | null;
  commission_conflict: boolean;
  commission_rate_bp_snapshot: number | null;
  commission_base_kurus: number | null;
  commission_amount_kurus: number | null;
  commission_status: CommissionStatusDb;
  commission_note: string | null;
}) {
  return {
    cafeId: o.cafe_id,
    cafeName: o.cafe_name_snapshot,
    cafePhone: o.cafe_phone_snapshot,
    roasterSaysNewCustomer: o.roaster_says_new_customer,
    isFirstOrder: o.is_first_order === true,
    commissionConflict: o.commission_conflict,
    commissionRateBp: o.commission_rate_bp_snapshot,
    commissionBaseKurus: o.commission_base_kurus,
    commissionAmountKurus: o.commission_amount_kurus,
    commissionStatus: o.commission_status,
    commissionNote: o.commission_note,
  };
}
