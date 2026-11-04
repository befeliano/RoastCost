import { ceilToStep, roundKurus } from './money';

/** Cafe-level cost parameters (mirrors cafe_settings). */
export interface CostSettings {
  espressoDoseG: number;
  coffeeWastePct: number;
  ingredientWastePct: number;
  cupCostKurus: number;
  fixedOverheadPerCupKurus: number;
  targetMarginPct: number;
  saleVatRatePct: number;
  costExcludesVat: boolean;
  priceRoundingStepKurus: number;
}

export const DEFAULT_COST_SETTINGS: CostSettings = {
  espressoDoseG: 18,
  coffeeWastePct: 0,
  ingredientWastePct: 0,
  cupCostKurus: 0,
  fixedOverheadPerCupKurus: 0,
  targetMarginPct: 65,
  saleVatRatePct: 10,
  costExcludesVat: true,
  priceRoundingStepKurus: 500,
};

/** Where the coffee price comes from: a catalog product tier or a manually typed price. */
export interface CoffeeSource {
  pricePerKgKurus: number;
  pricesIncludeVat: boolean;
  vatRatePct: number;
}

export interface RecipeIngredientInput {
  quantityMl: number;
  pricePerLiterKurus: number;
}

export interface RecipeCostInput {
  /** null → use settings.espressoDoseG */
  coffeeGrams: number | null;
  usesCup: boolean;
  /** Current menu price incl. VAT (optional) */
  sellPriceKurus: number | null;
  ingredients: RecipeIngredientInput[];
}

export type MarginStatus = 'ok' | 'below_target' | 'loss' | 'unknown';

export interface CostBreakdown {
  coffeeGrams: number;
  coffeeKurus: number;
  ingredientsKurus: number;
  cupKurus: number;
  overheadKurus: number;
  totalKurus: number;
  suggestedPriceExVatKurus: number;
  suggestedPriceIncVatKurus: number;
  suggestedPriceRoundedKurus: number;
  /** Margin of the current menu price, in percent (e.g. 62.5). null when no sell price. */
  currentMarginPct: number | null;
  marginStatus: MarginStatus;
}

/** Coffee price per kg after VAT normalisation (spec §7.3). */
export function effectiveCoffeePricePerKg(
  source: CoffeeSource,
  settings: Pick<CostSettings, 'costExcludesVat'>,
): number {
  if (settings.costExcludesVat && source.pricesIncludeVat) {
    return source.pricePerKgKurus / (1 + source.vatRatePct / 100);
  }
  return source.pricePerKgKurus;
}

function wasteFactor(pct: number): number {
  if (pct < 0 || pct >= 100) throw new RangeError('waste pct must be in [0, 100)');
  return 1 / (1 - pct / 100);
}

/**
 * Cup cost engine. Pure, no I/O — used offline in the app and in API tests.
 * Intermediate values are NOT rounded; only outputs are rounded to kuruş.
 */
export function calculateCupCost(
  recipe: RecipeCostInput,
  coffee: CoffeeSource | null,
  settings: CostSettings,
): CostBreakdown {
  const grams = recipe.coffeeGrams ?? settings.espressoDoseG;
  const pricePerKg = coffee ? effectiveCoffeePricePerKg(coffee, settings) : 0;

  const coffeeCost = (grams * wasteFactor(settings.coffeeWastePct) * pricePerKg) / 1000;
  const ingWaste = wasteFactor(settings.ingredientWastePct);
  const ingredientsCost = recipe.ingredients.reduce(
    (sum, i) => sum + ((i.quantityMl * ingWaste) / 1000) * i.pricePerLiterKurus,
    0,
  );
  const cupCost = recipe.usesCup ? settings.cupCostKurus : 0;
  const overhead = settings.fixedOverheadPerCupKurus;
  const total = coffeeCost + ingredientsCost + cupCost + overhead;

  const suggestedExVat = total / (1 - settings.targetMarginPct / 100);
  const suggestedIncVat = suggestedExVat * (1 + settings.saleVatRatePct / 100);
  const suggestedRounded = ceilToStep(roundKurus(suggestedIncVat), settings.priceRoundingStepKurus);

  let currentMarginPct: number | null = null;
  let marginStatus: MarginStatus = 'unknown';
  if (recipe.sellPriceKurus && recipe.sellPriceKurus > 0) {
    const saleExVat = recipe.sellPriceKurus / (1 + settings.saleVatRatePct / 100);
    currentMarginPct = ((saleExVat - total) / saleExVat) * 100;
    marginStatus =
      currentMarginPct < 0
        ? 'loss'
        : currentMarginPct < settings.targetMarginPct
          ? 'below_target'
          : 'ok';
  }

  return {
    coffeeGrams: grams,
    coffeeKurus: roundKurus(coffeeCost),
    ingredientsKurus: roundKurus(ingredientsCost),
    cupKurus: roundKurus(cupCost),
    overheadKurus: roundKurus(overhead),
    totalKurus: roundKurus(total),
    suggestedPriceExVatKurus: roundKurus(suggestedExVat),
    suggestedPriceIncVatKurus: roundKurus(suggestedIncVat),
    suggestedPriceRoundedKurus: suggestedRounded,
    currentMarginPct: currentMarginPct === null ? null : Math.round(currentMarginPct * 10) / 10,
    marginStatus,
  };
}
