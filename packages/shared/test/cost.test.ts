import { describe, expect, it } from 'vitest';
import {
  DEFAULT_COST_SETTINGS,
  RECIPE_TEMPLATES,
  calculateCupCost,
  ceilToStep,
  effectiveCoffeePricePerKg,
  type CostSettings,
} from '../src';

const base: CostSettings = {
  ...DEFAULT_COST_SETTINGS,
  cupCostKurus: 300,
  fixedOverheadPerCupKurus: 500,
};
const coffee = { pricePerKgKurus: 100_000, pricesIncludeVat: false, vatRatePct: 10 }; // 1000 TL/kg

describe('calculateCupCost', () => {
  it('espresso, no waste: 18 g at 1000 TL/kg = 18 TL', () => {
    const r = calculateCupCost(
      { coffeeGrams: null, usesCup: true, sellPriceKurus: null, ingredients: [] },
      coffee,
      base,
    );
    expect(r.coffeeGrams).toBe(18);
    expect(r.coffeeKurus).toBe(1800);
    expect(r.cupKurus).toBe(300);
    expect(r.overheadKurus).toBe(500);
    expect(r.totalKurus).toBe(2600);
    // 2600 / 0.35 = 7428.57 ; *1.10 = 8171.43 → 8171 ; ceil to 500 → 8500
    expect(r.suggestedPriceExVatKurus).toBe(7429);
    expect(r.suggestedPriceIncVatKurus).toBe(8171);
    expect(r.suggestedPriceRoundedKurus).toBe(8500);
    expect(r.marginStatus).toBe('unknown');
  });

  it('applies coffee waste: 10% waste → 18/0.9 = 20 g used', () => {
    const r = calculateCupCost(
      { coffeeGrams: 18, usesCup: false, sellPriceKurus: null, ingredients: [] },
      coffee,
      { ...base, coffeeWastePct: 10, fixedOverheadPerCupKurus: 0 },
    );
    expect(r.coffeeKurus).toBe(2000);
    expect(r.cupKurus).toBe(0);
    expect(r.totalKurus).toBe(2000);
  });

  it('latte: milk 200 ml at 40 TL/L with 5% ingredient waste', () => {
    const r = calculateCupCost(
      {
        coffeeGrams: null,
        usesCup: true,
        sellPriceKurus: null,
        ingredients: [{ quantityMl: 200, pricePerLiterKurus: 4000 }],
      },
      coffee,
      { ...base, ingredientWastePct: 5 },
    );
    // 200/0.95/1000*4000 = 842.105...
    expect(r.ingredientsKurus).toBe(842);
    // total = 1800 + 842.105 + 300 + 500 = 3442.105 → 3442 (no intermediate rounding)
    expect(r.totalKurus).toBe(3442);
  });

  it('0 ml ingredient adds nothing', () => {
    const r = calculateCupCost(
      {
        coffeeGrams: 18,
        usesCup: true,
        sellPriceKurus: null,
        ingredients: [{ quantityMl: 0, pricePerLiterKurus: 5000 }],
      },
      coffee,
      base,
    );
    expect(r.ingredientsKurus).toBe(0);
  });

  it('removes VAT from VAT-inclusive roaster prices when cost excludes VAT', () => {
    const inc = { pricePerKgKurus: 110_000, pricesIncludeVat: true, vatRatePct: 10 };
    expect(effectiveCoffeePricePerKg(inc, { costExcludesVat: true })).toBeCloseTo(100_000, 6);
    expect(effectiveCoffeePricePerKg(inc, { costExcludesVat: false })).toBe(110_000);
    const r = calculateCupCost(
      { coffeeGrams: 18, usesCup: false, sellPriceKurus: null, ingredients: [] },
      inc,
      {
        ...base,
        fixedOverheadPerCupKurus: 0,
      },
    );
    expect(r.coffeeKurus).toBe(1800);
  });

  it('VAT-exclusive prices are used as-is', () => {
    expect(effectiveCoffeePricePerKg(coffee, { costExcludesVat: true })).toBe(100_000);
  });

  it('computes current margin and status', () => {
    const recipe = { coffeeGrams: 18, usesCup: true, sellPriceKurus: 11000, ingredients: [] };
    // total 2600; sale ex VAT = 11000/1.1 = 10000 → margin 74%
    const ok = calculateCupCost(recipe, coffee, base);
    expect(ok.currentMarginPct).toBe(74);
    expect(ok.marginStatus).toBe('ok');
    const below = calculateCupCost({ ...recipe, sellPriceKurus: 5500 }, coffee, base);
    // 5000 ex VAT → (5000-2600)/5000 = 48%
    expect(below.currentMarginPct).toBe(48);
    expect(below.marginStatus).toBe('below_target');
    const loss = calculateCupCost({ ...recipe, sellPriceKurus: 2200 }, coffee, base);
    expect(loss.currentMarginPct).toBe(-30);
    expect(loss.marginStatus).toBe('loss');
  });

  it('works without a coffee source (price not entered yet)', () => {
    const r = calculateCupCost(
      { coffeeGrams: null, usesCup: true, sellPriceKurus: null, ingredients: [] },
      null,
      base,
    );
    expect(r.coffeeKurus).toBe(0);
    expect(r.totalKurus).toBe(800);
  });

  it('rejects waste >= 100%', () => {
    expect(() =>
      calculateCupCost(
        { coffeeGrams: 18, usesCup: true, sellPriceKurus: null, ingredients: [] },
        coffee,
        { ...base, coffeeWastePct: 100 },
      ),
    ).toThrow(RangeError);
  });

  it('all 6 default templates produce finite costs', () => {
    expect(RECIPE_TEMPLATES).toHaveLength(6);
    for (const t of RECIPE_TEMPLATES) {
      const ings = [];
      if (t.milkMl) ings.push({ quantityMl: t.milkMl, pricePerLiterKurus: 4000 });
      if (t.syrupMl) ings.push({ quantityMl: t.syrupMl, pricePerLiterKurus: 30000 });
      const r = calculateCupCost(
        { coffeeGrams: null, usesCup: t.usesCup, sellPriceKurus: null, ingredients: ings },
        coffee,
        base,
      );
      expect(Number.isFinite(r.totalKurus)).toBe(true);
      expect(r.suggestedPriceRoundedKurus % base.priceRoundingStepKurus).toBe(0);
    }
  });
});

describe('ceilToStep', () => {
  it('rounds up to step and keeps exact multiples', () => {
    expect(ceilToStep(8171, 500)).toBe(8500);
    expect(ceilToStep(8500, 500)).toBe(8500);
    expect(ceilToStep(8501, 500)).toBe(9000);
    expect(ceilToStep(0, 500)).toBe(0);
  });
  it('tolerates float noise', () => {
    expect(ceilToStep(500 * 3 + 1e-10, 500)).toBe(1500);
  });
});
