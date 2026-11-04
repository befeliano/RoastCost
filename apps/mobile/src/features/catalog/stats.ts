import type { CatalogRoaster } from '@/api/types';
import { productsOf, tiersOf } from './store';

type CatalogLike = Parameters<typeof productsOf>[0];

export interface RoasterStats {
  espresso: number;
  filter: number;
  /** cheapest 1-tier price per kg across the roaster's products */
  minPricePerKgKurus: number | null;
}

export function roasterStats(s: CatalogLike, roasterId: string): RoasterStats {
  const products = productsOf(s, roasterId);
  let min: number | null = null;
  for (const p of products) {
    for (const t of tiersOf(s, p.id))
      if (min === null || t.pricePerKgKurus < min) min = t.pricePerKgKurus;
  }
  return {
    espresso: products.filter((p) => p.category === 'espresso').length,
    filter: products.filter((p) => p.category === 'filter').length,
    minPricePerKgKurus: min,
  };
}

export function districtsOf(roasters: CatalogRoaster[]): string[] {
  return Array.from(new Set(roasters.map((r) => r.district).filter((d): d is string => !!d))).sort(
    (a, b) => a.localeCompare(b, 'tr'),
  );
}
