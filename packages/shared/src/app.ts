/** Display name of the app. Change here only (single source). */
export const APP_NAME = 'RoastCost';

/** Current versions of legal documents. Bump when the text changes; users must re-accept. */
export const LEGAL_VERSIONS = {
  terms: '2026-11-04',
  privacy: '2026-11-04',
  kvkk_notice: '2026-11-04',
} as const;

export type LegalDocType = keyof typeof LEGAL_VERSIONS;
export const LEGAL_DOC_TYPES = ['terms', 'privacy', 'kvkk_notice'] as const;

export const CAFE_STATUSES = ['pending', 'approved', 'rejected', 'suspended'] as const;
export type CafeStatus = (typeof CAFE_STATUSES)[number];

export const ORDER_STATUSES = [
  'draft',
  'sent',
  'confirmed',
  'declined',
  'expired',
  'cancelled',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const COMMISSION_STATUSES = [
  'not_applicable',
  'pending',
  'requested',
  'paid',
  'waived',
] as const;
export type CommissionStatus = (typeof COMMISSION_STATUSES)[number];

export const PRODUCT_CATEGORIES = ['espresso', 'filter'] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const PRODUCT_PROCESSES = ['washed', 'natural', 'honey', 'anaerobic', 'other'] as const;
export type ProductProcess = (typeof PRODUCT_PROCESSES)[number];

export const INGREDIENT_KINDS = ['milk', 'syrup', 'other'] as const;
export type IngredientKind = (typeof INGREDIENT_KINDS)[number];

/** Days after which a sent-but-undecided order expires. */
export const ORDER_EXPIRE_DAYS = 14;
/** Lifetime of the roaster confirmation link. */
export const ORDER_TOKEN_DAYS = 30;
