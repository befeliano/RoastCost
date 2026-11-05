import { calculateCupCost } from '@roastcost/shared';
import { useEffect, useMemo } from 'react';
import { activeRoasters, productsOf, tiersOf, useCatalog } from '@/features/catalog/store';
import { useIngredients, useRecipes, useSettings } from '@/hooks/useCafeData';
import { useSession } from '@/store/session';
import { catalogSource, toCostSettings, toRecipeInput } from './compute';
import { useCostPrefs } from './prefs';

/** Cheapest active espresso bean (by its entry-tier kg price) — the sensible first pick. */
export function useCheapestEspresso() {
  const catalog = useCatalog();
  return useMemo(() => {
    const all = activeRoasters(catalog).flatMap((r) =>
      productsOf(catalog, r.id)
        .filter((p) => p.category === 'espresso')
        .map((p) => ({ p, r, tier: tiersOf(catalog, p.id)[0] })),
    );
    return all
      .filter((x) => x.tier)
      .sort((a, b) => (a.tier?.pricePerKgKurus ?? 0) - (b.tier?.pricePerKgKurus ?? 0));
  }, [catalog]);
}

/**
 * The calculator's current state (recipe + coffee source → cost breakdown), shared by the Maliyet tab
 * and the Keşfet summary card. On first use an approved cafe starts in catalog mode with the cheapest
 * espresso bean instead of an empty manual price (₺0 coffee).
 */
export function useCupCost() {
  const me = useSession((s) => s.me);
  const approved = me?.cafe?.status === 'approved';
  const settingsQ = useSettings();
  const recipesQ = useRecipes();
  const ingredientsQ = useIngredients();
  const catalog = useCatalog();
  const prefs = useCostPrefs();
  const cheapest = useCheapestEspresso();

  useEffect(() => {
    const first = cheapest[0];
    if (!approved || !first) return;
    const chosen = prefs.productId ? catalog.products[prefs.productId] : undefined;
    // first use, or the remembered bean was removed from the catalogue → pick a sensible one
    if (!prefs.productId && !prefs.manualPricePerKgKurus)
      prefs.set({ mode: 'catalog', productId: first.p.id });
    else if (prefs.productId && (!chosen || !chosen.isActive || chosen.deletedAt))
      prefs.set({ productId: first.p.id });
  }, [approved, cheapest, prefs, catalog.products]);

  const recipes = useMemo(() => (recipesQ.data ?? []).filter((r) => r.isActive), [recipesQ.data]);
  const recipe = recipes.find((r) => r.id === prefs.recipeId) ?? recipes[0];
  const ingredients = ingredientsQ.data ?? [];
  const settings = settingsQ.data ? toCostSettings(settingsQ.data) : null;
  const mode = approved ? prefs.mode : 'manual';
  const product = prefs.productId ? catalog.products[prefs.productId] : undefined;
  const roaster = product ? catalog.roasters[product.roasterId] : undefined;
  const fromCatalog =
    mode === 'catalog' && product && roaster
      ? catalogSource(roaster, tiersOf(catalog, product.id), prefs.monthlyKg)
      : null;
  const source =
    mode === 'manual'
      ? prefs.manualPricePerKgKurus
        ? {
            pricePerKgKurus: prefs.manualPricePerKgKurus,
            pricesIncludeVat: prefs.manualIncludesVat,
            vatRatePct: prefs.manualVatRatePct,
          }
        : null
      : (fromCatalog?.source ?? null);
  const result =
    recipe && settings
      ? calculateCupCost(toRecipeInput(recipe, ingredients), source, settings)
      : null;
  return {
    me,
    approved,
    prefs,
    recipes,
    recipe,
    ingredients,
    settings,
    mode,
    product,
    roaster,
    fromCatalog,
    source,
    result,
    queries: { settingsQ, recipesQ, ingredientsQ },
  };
}
