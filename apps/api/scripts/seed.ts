/**
 * Development seed (spec §6.3): 1 admin, 2 approved cafes, 1 pending cafe, 3 roasters, 12 products, tiered prices.
 * All names are made up. Refuses to run in production.
 *   pnpm db:seed           (password for every account: SEED_PASSWORD or "gelistirme123")
 */
import { SYSTEM, createDb, withCtx } from '../src/db';
import { hashPassword } from '../src/lib/crypto';
import { seedCafeDefaults } from '../src/modules/auth/service';
import { ESPRESSO, FILTER, FLORES, ROASTERS } from './seed-data';

try {
  process.loadEnvFile?.();
} catch {
  /* no .env */
}
if (process.env.NODE_ENV === 'production') throw new Error('seed is for development only');
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

const db = createDb({ connectionString: url, max: 1 });
const hash = await hashPassword(process.env.SEED_PASSWORD ?? 'gelistirme123');
const ctx = { ...SYSTEM, isAdmin: true };

await withCtx(db, ctx, async (tx) => {
  const already = await tx
    .selectFrom('users')
    .select('id')
    .where('email', '=', 'admin@roastcost.local')
    .executeTakeFirst();
  if (already) {
    console.log('seed already applied');
    return;
  }
  const admin = await tx
    .insertInto('users')
    .values({
      email: 'admin@roastcost.local',
      password_hash: hash,
      role: 'admin',
      email_verified_at: new Date(),
    })
    .returning('id')
    .executeTakeFirstOrThrow();

  const cafes = [
    {
      email: 'kafe1@roastcost.local',
      name: 'Köşe Fincan',
      district: 'Tepebaşı',
      phone: '+905551110001',
      status: 'approved' as const,
    },
    {
      email: 'kafe2@roastcost.local',
      name: 'Kitap & Kahve',
      district: 'Odunpazarı',
      phone: '+905551110002',
      status: 'approved' as const,
    },
    {
      email: 'kafe3@roastcost.local',
      name: 'Yeni Açılan Kafe',
      district: 'Tepebaşı',
      phone: '+905551110003',
      status: 'pending' as const,
    },
  ];
  for (const c of cafes) {
    const u = await tx
      .insertInto('users')
      .values({ email: c.email, password_hash: hash, email_verified_at: new Date() })
      .returning('id')
      .executeTakeFirstOrThrow();
    const cafe = await tx
      .insertInto('cafes')
      .values({
        name: c.name,
        district: c.district,
        phone_e164: c.phone,
        status: c.status,
        ...(c.status === 'approved' ? { approved_at: new Date(), approved_by: admin.id } : {}),
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    await tx.insertInto('cafe_members').values({ cafe_id: cafe.id, user_id: u.id }).execute();
    await tx
      .insertInto('cafe_settings')
      .values({ cafe_id: cafe.id, cup_cost_kurus: 350, fixed_overhead_per_cup_kurus: 1200 })
      .execute();
    await seedCafeDefaults(tx, cafe.id);
    await tx
      .updateTable('cafe_ingredients')
      .set({ price_per_liter_kurus: 4500 })
      .where('cafe_id', '=', cafe.id)
      .execute();
    await tx
      .insertInto('cafe_ingredients')
      .values({
        cafe_id: cafe.id,
        name: 'Çikolata şurubu',
        kind: 'syrup',
        price_per_liter_kurus: 32000,
      })
      .execute();
    for (const doc of ['terms', 'privacy', 'kvkk_notice'] as const) {
      await tx
        .insertInto('consents')
        .values({ user_id: u.id, doc_type: doc, doc_version: '2026-11-04' })
        .execute();
    }
  }

  // real catalogue (Flores Roastery) — featured, single 1 kg cash-price tier
  const flores = await tx
    .insertInto('roasters')
    .values({
      name: FLORES.name,
      whatsapp_e164: FLORES.whatsapp,
      prices_include_vat: true,
      min_order_kg: 5,
      card_surcharge_bp: 250,
      district: FLORES.district,
      address: FLORES.address,
      latitude: FLORES.latitude,
      longitude: FLORES.longitude,
      prices_updated_at: new Date(),
      brand_color: FLORES.color,
      description: FLORES.description,
      is_featured: true,
    })
    .returning('id')
    .executeTakeFirstOrThrow();
  await tx
    .insertInto('roaster_admin')
    .values({ roaster_id: flores.id, commission_rate_bp: 1500 })
    .execute();
  for (const it of FLORES.products) {
    const p = await tx
      .insertInto('products')
      .values({
        roaster_id: flores.id,
        name: it.name,
        category: it.category,
        process: it.process,
        origin: it.origin,
        tasting_notes: it.notes,
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    await tx
      .insertInto('price_tiers')
      .values({ product_id: p.id, min_kg: 1, price_per_kg_kurus: it.tl * 100 })
      .execute();
  }

  for (const r of ROASTERS) {
    const row = await tx
      .insertInto('roasters')
      .values({
        name: r.name,
        whatsapp_e164: r.whatsapp,
        prices_include_vat: r.vatIncluded,
        prices_updated_at: new Date(),
        district: r.district,
        address: r.address,
        latitude: r.lat,
        longitude: r.lon,
        brand_color: r.color,
        description: r.description,
        is_featured: r.featured,
        min_order_kg: r.featured ? 3 : null,
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    await tx
      .insertInto('roaster_admin')
      .values({ roaster_id: row.id, commission_rate_bp: 1500 })
      .execute();
    const items = [
      ...ESPRESSO.map((p) => ({ ...p, category: 'espresso' as const })),
      ...FILTER.slice(0, r.filterCount).map((p) => ({ ...p, category: 'filter' as const })),
    ];
    for (const [i, it] of items.entries()) {
      const p = await tx
        .insertInto('products')
        .values({
          roaster_id: row.id,
          name: it.name,
          category: it.category,
          process: it.process,
          origin: it.origin,
          tasting_notes: it.notes,
          roast_level: it.roast,
        })
        .returning('id')
        .executeTakeFirstOrThrow();
      // small deterministic variation so roasters differ in the comparison
      const base = Math.round(it.tl * r.priceFactor * (1 + ((i * 7) % 5) / 100)) * 100;
      await tx
        .insertInto('price_tiers')
        .values([
          { product_id: p.id, min_kg: 1, price_per_kg_kurus: base },
          {
            product_id: p.id,
            min_kg: 5,
            price_per_kg_kurus: Math.round((base * 0.93) / 100) * 100,
          },
          {
            product_id: p.id,
            min_kg: 10,
            price_per_kg_kurus: Math.round((base * 0.87) / 100) * 100,
          },
        ])
        .execute();
    }
  }
  console.log(
    'seed done: admin@roastcost.local, kafe1/kafe2 (approved), kafe3 (pending) @roastcost.local',
  );
});
await db.destroy();
