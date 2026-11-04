/** Commission = round(base * rate_bp / 10000). 1500 bp = %15. */
export function commissionAmountKurus(baseKurus: number, rateBp: number): number {
  return Math.round((baseKurus * rateBp) / 10000);
}

export interface FirstOrderDecisionInput {
  roasterSaysNewCustomer: boolean;
  hasPreviousConfirmedOrder: boolean;
  subtotalKurus: number;
  commissionRateBp: number;
}

export interface FirstOrderDecision {
  isFirstOrder: boolean | null;
  commissionStatus: 'pending' | 'not_applicable';
  commissionRateBpSnapshot: number | null;
  commissionBaseKurus: number | null;
  commissionAmountKurus: number | null;
  /** Roaster said "new" but the system already has a confirmed order → admin should review. */
  conflict: boolean;
}

/** Spec §8.4 — commission only on the very first confirmed order of a cafe↔roaster pair. */
export function decideFirstOrder(i: FirstOrderDecisionInput): FirstOrderDecision {
  if (i.roasterSaysNewCustomer && !i.hasPreviousConfirmedOrder) {
    return {
      isFirstOrder: true,
      commissionStatus: 'pending',
      commissionRateBpSnapshot: i.commissionRateBp,
      commissionBaseKurus: i.subtotalKurus,
      commissionAmountKurus: commissionAmountKurus(i.subtotalKurus, i.commissionRateBp),
      conflict: false,
    };
  }
  return {
    isFirstOrder: null,
    commissionStatus: 'not_applicable',
    commissionRateBpSnapshot: null,
    commissionBaseKurus: null,
    commissionAmountKurus: null,
    conflict: i.roasterSaysNewCustomer && i.hasPreviousConfirmedOrder,
  };
}
