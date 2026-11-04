export interface PriceTier {
  minKg: number;
  pricePerKgKurus: number;
}

/** Highest tier whose minKg <= requested kg. null when kg is below every tier (spec §7.3). */
export function selectTier<T extends PriceTier>(tiers: readonly T[], kg: number): T | null {
  let best: T | null = null;
  for (const t of tiers) {
    if (t.minKg <= kg + 1e-9 && (!best || t.minKg > best.minKg)) best = t;
  }
  return best;
}

/** For comparisons: the applicable tier, or the smallest tier when kg is below all tiers. */
export function selectTierForComparison<T extends PriceTier>(
  tiers: readonly T[],
  kg: number,
): { tier: T; belowMinimum: boolean } | null {
  const t = selectTier(tiers, kg);
  if (t) return { tier: t, belowMinimum: false };
  const lowest = [...tiers].sort((a, b) => a.minKg - b.minKg)[0];
  return lowest ? { tier: lowest, belowMinimum: true } : null;
}

/** Line total in kuruş for a quantity in grams at a per-kg price. */
export function lineTotalKurus(quantityG: number, pricePerKgKurus: number): number {
  return Math.round((quantityG * pricePerKgKurus) / 1000);
}
