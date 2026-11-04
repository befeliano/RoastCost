import type { Selectable } from 'kysely';
import type { CafeIngredientsTable, CafeSettingsTable, CafesTable } from '../db/types';

export const cafeDto = (c: Selectable<CafesTable>) => ({
  id: c.id,
  name: c.name,
  city: c.city,
  district: c.district,
  phone: c.phone_e164,
  status: c.status,
  statusNote: c.status_note,
  approvedAt: c.approved_at,
  createdAt: c.created_at,
});

export const settingsDto = (s: Selectable<CafeSettingsTable>) => ({
  espressoDoseG: s.espresso_dose_g,
  coffeeWastePct: s.coffee_waste_pct,
  ingredientWastePct: s.ingredient_waste_pct,
  cupCostKurus: s.cup_cost_kurus,
  fixedOverheadPerCupKurus: s.fixed_overhead_per_cup_kurus,
  targetMarginPct: s.target_margin_pct,
  saleVatRatePct: s.sale_vat_rate_pct,
  costExcludesVat: s.cost_excludes_vat,
  priceRoundingStepKurus: s.price_rounding_step_kurus,
  updatedAt: s.updated_at,
});

export const ingredientDto = (i: Selectable<CafeIngredientsTable>) => ({
  id: i.id,
  name: i.name,
  kind: i.kind,
  pricePerLiterKurus: i.price_per_liter_kurus,
  isActive: i.is_active,
  updatedAt: i.updated_at,
});

/** Keyset pagination cursor: base64url("<iso date>|<uuid>") */
export function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.toISOString()}|${id}`).toString('base64url');
}
export function decodeCursor(cursor: string | undefined): { createdAt: Date; id: string } | null {
  if (!cursor) return null;
  const [d, id] = Buffer.from(cursor, 'base64url').toString().split('|');
  const date = d ? new Date(d) : null;
  if (!date || Number.isNaN(date.getTime()) || !id || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  return { createdAt: date, id };
}
