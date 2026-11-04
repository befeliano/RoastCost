import { DEFAULT_COST_SETTINGS } from '@roastcost/shared';
import { describe, expect, it } from 'vitest';
import { compareProducts, toRecipeInput } from './compute';

const roaster = (id: string, inc = false) => ({
  id,
  name: id,
  city: 'Eskişehir',
  pricesIncludeVat: inc,
  vatRatePct: 10,
  pricesUpdatedAt: null,
  isActive: true,
  rev: 1,
  deletedAt: null,
});
const product = (id: string, roasterId: string) => ({
  id,
  roasterId,
  name: id,
  category: 'espresso' as const,
  process: null,
  origin: null,
  tastingNotes: null,
  isActive: true,
  rev: 1,
  deletedAt: null,
});
const tier = (productId: string, minKg: number, price: number) => ({
  id: `${productId}-${minKg}`,
  productId,
  minKg,
  pricePerKgKurus: price,
  validUntil: null,
  rev: 1,
  deletedAt: null,
});

describe('compareProducts', () => {
  it('sorts by cup cost using the tier for the monthly kg and strips VAT from VAT-inclusive prices', () => {
    const tiers = [
      tier('a', 1, 100_000),
      tier('a', 5, 80_000),
      tier('b', 1, 99_000),
      tier('c', 1, 105_000),
    ];
    const rows = compareProducts(
      { coffeeGrams: 18, usesCup: false, sellPriceKurus: null, ingredients: [] },
      DEFAULT_COST_SETTINGS,
      [product('a', 'r1'), product('b', 'r1'), product('c', 'r2')],
      { r1: roaster('r1'), r2: roaster('r2', true) },
      (id) => tiers.filter((t) => t.productId === id),
      5,
    );
    expect(rows.map((r) => r.product.id)).toEqual(['a', 'c', 'b']); // a: 800 TL/kg; c: 105/1.1=954; b: 990
    expect(rows[0]?.tier.minKg).toBe(5);
    expect(rows[0]?.breakdown.coffeeKurus).toBe(1440);
  });

  it('flags tiers used below their minimum', () => {
    const rows = compareProducts(
      { coffeeGrams: 18, usesCup: false, sellPriceKurus: null, ingredients: [] },
      DEFAULT_COST_SETTINGS,
      [product('a', 'r1')],
      { r1: roaster('r1') },
      () => [tier('a', 5, 80_000)],
      2,
    );
    expect(rows[0]?.belowMinimum).toBe(true);
  });
});

describe('toRecipeInput', () => {
  it('joins recipe ingredients with cafe prices (missing → 0)', () => {
    const input = toRecipeInput(
      {
        id: 'r',
        name: 'Latte',
        templateKey: 'latte',
        coffeeGrams: null,
        usesCup: true,
        sellPriceKurus: 9000,
        sortOrder: 0,
        isActive: true,
        ingredients: [
          { ingredientId: 'milk', quantityMl: 200 },
          { ingredientId: 'gone', quantityMl: 20 },
        ],
      },
      [{ id: 'milk', name: 'Süt', kind: 'milk', pricePerLiterKurus: 4500, isActive: true }],
    );
    expect(input.ingredients).toEqual([
      { quantityMl: 200, pricePerLiterKurus: 4500 },
      { quantityMl: 20, pricePerLiterKurus: 0 },
    ]);
  });
});
