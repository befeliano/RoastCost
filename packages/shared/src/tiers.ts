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

/**
 * "Add X kg more → next tier price" hint for a line. Returns null when already on the best tier
 * or when the next tier is more than `maxExtraKg` away (don't nag about 20 kg jumps).
 */
export function nextTierHint<T extends PriceTier>(
  tiers: readonly T[],
  quantityG: number,
  maxExtraKg = 5,
): { extraKg: number; tier: T } | null {
  const kg = quantityG / 1000;
  const next = [...tiers].sort((a, b) => a.minKg - b.minKg).find((t) => t.minKg > kg);
  if (!next) return null;
  const extraKg = Math.round((next.minKg - kg) * 1000) / 1000;
  return extraKg <= maxExtraKg ? { extraKg, tier: next } : null;
}

export interface OrderTerms {
  totalG: number;
  /** null when the roaster has no minimum */
  minOrderKg: number | null;
  missingKg: number;
  meetsMinimum: boolean;
  /** 0..1 for a progress bar */
  progress: number;
  /** extra charged when paying by card (kuruş), null when the roaster has no surcharge */
  cardSurchargeKurus: number | null;
}

/** Roaster-level order rules for a cart (0003: total kg minimum, card surcharge). */
export function orderTerms(
  quantitiesG: readonly number[],
  subtotalKurus: number,
  minOrderKg: number | null | undefined,
  cardSurchargeBp: number | null | undefined,
): OrderTerms {
  const totalG = quantitiesG.reduce((s, g) => s + g, 0);
  const min = minOrderKg ?? null;
  const missingKg = min ? Math.max(0, Math.round((min * 1000 - totalG) / 10) / 100) : 0;
  return {
    totalG,
    minOrderKg: min,
    missingKg,
    meetsMinimum: missingKg === 0,
    progress: min ? Math.min(1, totalG / (min * 1000)) : 1,
    cardSurchargeKurus: cardSurchargeBp
      ? Math.round((subtotalKurus * cardSurchargeBp) / 10_000)
      : null,
  };
}
