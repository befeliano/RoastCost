/**
 * Development seed (spec §6.3): 1 admin, 2 approved cafes, 1 pending cafe, 3 roasters, 12 products, tiered prices.
 * All names are made up. Refuses to run in production.
 *   pnpm db:seed           (password for every account: SEED_PASSWORD or "gelistirme123")
 */
import { SYSTEM, createDb, withCtx } from '../src/db';
import { hashPassword } from '../src/lib/crypto';
import { seedCafeDefaults } from '../src/modules/auth/service';

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

const ROASTERS = [
  { name: 'Odun Ateşi Kahve Kavurma', whatsapp: '+905550000001', vatIncluded: false },
  { name: 'Porsuk Kavurucu', whatsapp: '+905550000002', vatIncluded: true },
  { name: 'Sazova Coffee Lab', whatsapp: '+905550000003', vatIncluded: false },
];
const PRODUCTS: [number, string, 'espresso' | 'filter', string, string, number][] = [
  // roaster index, name, category, process, origin, 1 kg price (TL)
  [0, 'Ev Harmanı', 'espresso', 'washed', 'Brezilya / Kolombiya', 900],
  [0, 'Karamel Espresso', 'espresso', 'natural', 'Brezilya', 980],
  [0, 'Etiyopya Guji', 'filter', 'natural', 'Etiyopya', 1450],
  [0, 'Kenya AA', 'filter', 'washed', 'Kenya', 1600],
  [1, 'Porsuk Blend', 'espresso', 'washed', 'Brezilya / Hindistan', 850],
  [1, 'Kolombiya Huila', 'espresso', 'washed', 'Kolombiya', 1100],
  [1, 'Guatemala Antigua', 'filter', 'washed', 'Guatemala', 1300],
  [1, 'Ruanda Honey', 'filter', 'honey', 'Ruanda', 1500],
  [2, 'Lab Espresso No.1', 'espresso', 'natural', 'Brezilya / Etiyopya', 1050],
  [2, 'Decaf Kolombiya', 'espresso', 'other', 'Kolombiya', 1200],
  [2, 'Panama Anaerobik', 'filter', 'anaerobic', 'Panama', 2400],
  [2, 'Burundi Kayanza', 'filter', 'washed', 'Burundi', 1550],
];

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

  const roasterIds: string[] = [];
  for (const r of ROASTERS) {
    const row = await tx
      .insertInto('roasters')
      .values({
        name: r.name,
        whatsapp_e164: r.whatsapp,
        prices_include_vat: r.vatIncluded,
        prices_updated_at: new Date(),
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    await tx
      .insertInto('roaster_admin')
      .values({ roaster_id: row.id, commission_rate_bp: 1500 })
      .execute();
    roasterIds.push(row.id);
  }
  for (const [ri, name, category, process, origin, tl] of PRODUCTS) {
    const p = await tx
      .insertInto('products')
      .values({ roaster_id: roasterIds[ri] as string, name, category, process, origin })
      .returning('id')
      .executeTakeFirstOrThrow();
    const base = tl * 100;
    await tx
      .insertInto('price_tiers')
      .values([
        { product_id: p.id, min_kg: 1, price_per_kg_kurus: base },
        { product_id: p.id, min_kg: 5, price_per_kg_kurus: Math.round(base * 0.93) },
        { product_id: p.id, min_kg: 10, price_per_kg_kurus: Math.round(base * 0.87) },
      ])
      .execute();
  }
  console.log(
    'seed done: admin@roastcost.local, kafe1/kafe2 (approved), kafe3 (pending) @roastcost.local',
  );
});
await db.destroy();
