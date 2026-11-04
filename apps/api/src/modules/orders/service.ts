import {
  ORDER_TOKEN_DAYS,
  buildOrderMessage,
  buildWaUrl,
  formatTrPhone,
  lineTotalKurus,
  selectTier,
  type OrderCreateInput,
} from '@roastcost/shared';
import type { Selectable } from 'kysely';
import type { Deps } from '../../app';
import { SYSTEM, withCtx, type DbContext, type Tx } from '../../db';
import type { OrderItemsTable, OrdersTable } from '../../db/types';
import { randomToken, sha256 } from '../../lib/crypto';
import { badRequest, forbidden, notFound } from '../../lib/errors';
import { addDays, todayTr } from '../../lib/time';
import { assertApprovedCafe } from '../catalog/routes';

export const orderDto = (o: Selectable<OrdersTable>, items?: Selectable<OrderItemsTable>[]) => ({
  id: o.id,
  orderNo: o.order_no,
  roasterId: o.roaster_id,
  roasterName: o.roaster_name_snapshot,
  status: o.status,
  requestedDeliveryDate: o.requested_delivery_date,
  note: o.note,
  subtotalKurus: o.subtotal_kurus,
  sentAt: o.sent_at,
  decidedAt: o.decided_at,
  declineReason: o.decline_reason,
  createdAt: o.created_at,
  updatedAt: o.updated_at,
  ...(items && {
    items: items.map((i) => ({
      productId: i.product_id,
      productName: i.product_name_snapshot,
      quantityG: i.quantity_g,
      tierMinKg: i.tier_min_kg_snapshot,
      pricePerKgKurus: i.price_per_kg_kurus_snapshot,
      lineTotalKurus: i.line_total_kurus,
    })),
  }),
});

async function messageFor(deps: Deps, tx: Tx, orderId: string, token: string) {
  const o = await tx
    .selectFrom('orders')
    .selectAll()
    .where('id', '=', orderId)
    .executeTakeFirstOrThrow();
  const items = await tx
    .selectFrom('order_items')
    .selectAll()
    .where('order_id', '=', orderId)
    .execute();
  const cafe = await tx
    .selectFrom('cafes')
    .select(['district'])
    .where('id', '=', o.cafe_id)
    .executeTakeFirstOrThrow();
  const roaster = await tx
    .selectFrom('roasters')
    .select(['whatsapp_e164'])
    .where('id', '=', o.roaster_id)
    .executeTakeFirstOrThrow();
  const message = buildOrderMessage({
    roasterName: o.roaster_name_snapshot,
    cafeName: o.cafe_name_snapshot,
    district: cafe.district,
    cafePhone: formatTrPhone(o.cafe_phone_snapshot),
    orderNo: o.order_no,
    items: items.map((i) => ({ productName: i.product_name_snapshot, quantityG: i.quantity_g })),
    requestedDeliveryDate: o.requested_delivery_date,
    note: o.note,
    confirmUrl: `${deps.config.PUBLIC_BASE_URL}/r/${token}`,
  });
  return { order: orderDto(o, items), message, waUrl: buildWaUrl(roaster.whatsapp_e164, message) };
}

export async function createOrder(deps: Deps, ctx: DbContext, input: OrderCreateInput) {
  const now = deps.clock();
  const today = todayTr(now);
  if (input.requestedDeliveryDate && input.requestedDeliveryDate < today) {
    throw badRequest('date_in_past', 'Teslim tarihi bugünden önce olamaz.');
  }
  return withCtx(deps.db, ctx, async (tx) => {
    await assertApprovedCafe(tx, ctx.cafeId ?? null);
    const user = await tx
      .selectFrom('users')
      .select('email_verified_at')
      .where('id', '=', ctx.userId as string)
      .executeTakeFirst();
    if (!user?.email_verified_at)
      throw forbidden(
        'email_not_verified',
        'Sipariş vermek için önce e-posta adresinizi doğrulayın.',
      );

    const cafe = await tx
      .selectFrom('cafes')
      .select(['id', 'name', 'phone_e164'])
      .where('id', '=', ctx.cafeId as string)
      .executeTakeFirstOrThrow();
    const roaster = await tx
      .selectFrom('roasters')
      .select(['id', 'name'])
      .where('id', '=', input.roasterId)
      .where('is_active', '=', true)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
    if (!roaster) throw notFound('roaster_not_found', 'Kavurucu bulunamadı.');

    const productIds = input.items.map((i) => i.productId);
    const products = await tx
      .selectFrom('products')
      .select(['id', 'name'])
      .where('id', 'in', productIds)
      .where('roaster_id', '=', roaster.id)
      .where('is_active', '=', true)
      .where('deleted_at', 'is', null)
      .execute();
    const tiers = await tx
      .selectFrom('price_tiers')
      .select(['product_id', 'min_kg', 'price_per_kg_kurus', 'valid_until'])
      .where('product_id', 'in', productIds)
      .where('deleted_at', 'is', null)
      .execute();

    const lines = input.items.map((item) => {
      const p = products.find((x) => x.id === item.productId);
      if (!p)
        throw badRequest('product_unavailable', 'Sepetteki bir ürün artık satışta değil.', {
          productId: item.productId,
        });
      const valid = tiers
        .filter((t) => t.product_id === p.id && (!t.valid_until || t.valid_until >= today))
        .map((t) => ({ minKg: t.min_kg, pricePerKgKurus: t.price_per_kg_kurus }));
      const tier = selectTier(valid, item.quantityG / 1000);
      if (!tier) {
        const min = valid.length ? Math.min(...valid.map((t) => t.minKg)) : null;
        throw badRequest(
          'below_minimum',
          min
            ? `${p.name} için en az ${min} kg sipariş verilebilir.`
            : `${p.name} için güncel fiyat yok.`,
          {
            productId: p.id,
            minKg: min,
          },
        );
      }
      return {
        product_id: p.id,
        product_name_snapshot: p.name,
        quantity_g: item.quantityG,
        tier_min_kg_snapshot: tier.minKg,
        price_per_kg_kurus_snapshot: tier.pricePerKgKurus,
        line_total_kurus: lineTotalKurus(item.quantityG, tier.pricePerKgKurus),
      };
    });
    const subtotal = lines.reduce((s, l) => s + l.line_total_kurus, 0);
    const token = randomToken();
    const order = await tx
      .insertInto('orders')
      .values({
        cafe_id: cafe.id,
        roaster_id: roaster.id,
        created_by: ctx.userId ?? null,
        cafe_name_snapshot: cafe.name,
        cafe_phone_snapshot: cafe.phone_e164,
        roaster_name_snapshot: roaster.name,
        requested_delivery_date: input.requestedDeliveryDate ?? null,
        note: input.note ?? null,
        subtotal_kurus: subtotal,
        token_hash: sha256(token),
        token_expires_at: addDays(now, ORDER_TOKEN_DAYS),
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    await tx
      .insertInto('order_items')
      .values(lines.map((l) => ({ ...l, order_id: order.id })))
      .execute();
    return messageFor(deps, tx, order.id, token);
  });
}

/** New link for a draft/sent order (the raw token is never stored, so "send again" needs a fresh one). */
export async function regenerateLink(deps: Deps, ctx: DbContext, orderId: string) {
  const now = deps.clock();
  const owned = await withCtx(deps.db, ctx, (tx) =>
    tx
      .selectFrom('orders')
      .select(['id', 'status'])
      .where('id', '=', orderId)
      .where('cafe_id', '=', ctx.cafeId as string)
      .executeTakeFirst(),
  );
  if (!owned) throw notFound();
  if (owned.status !== 'draft' && owned.status !== 'sent')
    throw badRequest('order_closed', 'Bu sipariş artık gönderilemez.');
  const token = randomToken();
  // token_hash is a protected column → system context, after the ownership check above.
  return withCtx(deps.db, { ...SYSTEM, userId: ctx.userId ?? null }, async (tx) => {
    await tx
      .updateTable('orders')
      .set({ token_hash: sha256(token), token_expires_at: addDays(now, ORDER_TOKEN_DAYS) })
      .where('id', '=', orderId)
      .execute();
    return messageFor(deps, tx, orderId, token);
  });
}

export async function transition(
  deps: Deps,
  ctx: DbContext,
  orderId: string,
  to: 'sent' | 'cancelled',
) {
  const now = deps.clock();
  return withCtx(deps.db, ctx, async (tx) => {
    const o = await tx
      .selectFrom('orders')
      .select(['status'])
      .where('id', '=', orderId)
      .where('cafe_id', '=', ctx.cafeId as string)
      .forUpdate()
      .executeTakeFirst();
    if (!o) throw notFound();
    const allowed = to === 'sent' ? ['draft', 'sent'] : ['draft', 'sent'];
    if (!allowed.includes(o.status))
      throw badRequest('invalid_transition', 'Bu siparişin durumu değiştirilemez.');
    const row = await tx
      .updateTable('orders')
      .set(to === 'sent' ? { status: 'sent', sent_at: now } : { status: 'cancelled' })
      .where('id', '=', orderId)
      .returningAll()
      .executeTakeFirstOrThrow();
    return orderDto(row);
  });
}
