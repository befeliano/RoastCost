import {
  calculateCupCost,
  selectTierForComparison,
  type CoffeeSource,
  type CostBreakdown,
  type CostSettings,
  type RecipeCostInput,
} from '@roastcost/shared';
import type {
  CatalogProduct,
  CatalogRoaster,
  CatalogTier,
  Ingredient,
  Recipe,
  Settings,
} from '@/api/types';

export function toCostSettings(s: Settings): CostSettings {
  return {
    espressoDoseG: s.espressoDoseG,
    coffeeWastePct: s.coffeeWastePct,
    ingredientWastePct: s.ingredientWastePct,
    cupCostKurus: s.cupCostKurus,
    fixedOverheadPerCupKurus: s.fixedOverheadPerCupKurus,
    targetMarginPct: s.targetMarginPct,
    saleVatRatePct: s.saleVatRatePct,
    costExcludesVat: s.costExcludesVat,
    priceRoundingStepKurus: s.priceRoundingStepKurus,
  };
}

export function toRecipeInput(r: Recipe, ingredients: Ingredient[]): RecipeCostInput {
  return {
    coffeeGrams: r.coffeeGrams,
    usesCup: r.usesCup,
    sellPriceKurus: r.sellPriceKurus,
    ingredients: r.ingredients.map((ri) => ({
      quantityMl: ri.quantityMl,
      pricePerLiterKurus:
        ingredients.find((i) => i.id === ri.ingredientId)?.pricePerLiterKurus ?? 0,
    })),
  };
}

export interface CatalogSource {
  source: CoffeeSource;
  tier: CatalogTier;
  belowMinimum: boolean;
}

/** Catalog product → coffee source at the tier that matches the monthly kg (spec §7.3 karşılaştırma). */
export function catalogSource(
  roaster: CatalogRoaster,
  tiers: CatalogTier[],
  monthlyKg: number,
): CatalogSource | null {
  const pick = selectTierForComparison(tiers, monthlyKg);
  if (!pick) return null;
  return {
    source: {
      pricePerKgKurus: pick.tier.pricePerKgKurus,
      pricesIncludeVat: roaster.pricesIncludeVat,
      vatRatePct: roaster.vatRatePct,
    },
    tier: pick.tier,
    belowMinimum: pick.belowMinimum,
  };
}

export interface ComparisonRow {
  product: CatalogProduct;
  roaster: CatalogRoaster;
  tier: CatalogTier;
  belowMinimum: boolean;
  breakdown: CostBreakdown;
}

export function compareProducts(
  recipe: RecipeCostInput,
  settings: CostSettings,
  products: CatalogProduct[],
  roasters: Record<string, CatalogRoaster>,
  tiersFor: (productId: string) => CatalogTier[],
  monthlyKg: number,
): ComparisonRow[] {
  const rows: ComparisonRow[] = [];
  for (const p of products) {
    const roaster = roasters[p.roasterId];
    if (!roaster || !roaster.isActive || !p.isActive) continue;
    const cs = catalogSource(roaster, tiersFor(p.id), monthlyKg);
    if (!cs) continue;
    rows.push({
      product: p,
      roaster,
      tier: cs.tier,
      belowMinimum: cs.belowMinimum,
      breakdown: calculateCupCost(recipe, cs.source, settings),
    });
  }
  return rows.sort((a, b) => a.breakdown.totalKurus - b.breakdown.totalKurus);
}
