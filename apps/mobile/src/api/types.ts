import type {
  CafeStatus,
  CommissionStatus,
  IngredientKind,
  OrderStatus,
  ProductCategory,
} from '@roastcost/shared';

export interface Session {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface Cafe {
  id: string;
  name: string;
  city: string;
  district: string;
  phone: string;
  status: CafeStatus;
  statusNote: string | null;
  approvedAt: string | null;
  createdAt: string;
}

export interface Me {
  user: {
    id: string;
    email: string;
    role: 'cafe_owner' | 'admin';
    emailVerified: boolean;
    createdAt: string;
  };
  cafe: Cafe | null;
  missingConsents: ('terms' | 'privacy' | 'kvkk_notice')[];
  legalVersions: Record<'terms' | 'privacy' | 'kvkk_notice', string>;
}

export interface Settings {
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

export interface Ingredient {
  id: string;
  name: string;
  kind: IngredientKind;
  pricePerLiterKurus: number;
  isActive: boolean;
}

export interface Recipe {
  id: string;
  name: string;
  templateKey: string | null;
  coffeeGrams: number | null;
  usesCup: boolean;
  sellPriceKurus: number | null;
  sortOrder: number;
  isActive: boolean;
  ingredients: { ingredientId: string; quantityMl: number }[];
}

export interface CatalogRoaster {
  id: string;
  name: string;
  city: string;
  district: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  logoUrl: string | null;
  brandColor: string | null;
  description: string | null;
  isFeatured: boolean;
  pricesIncludeVat: boolean;
  vatRatePct: number;
  pricesUpdatedAt: string | null;
  isActive: boolean;
  rev: number;
  deletedAt: string | null;
}
export interface CatalogProduct {
  id: string;
  roasterId: string;
  name: string;
  category: ProductCategory;
  process: string | null;
  origin: string | null;
  tastingNotes: string | null;
  roastLevel: 'light' | 'medium' | 'dark' | null;
  isActive: boolean;
  rev: number;
  deletedAt: string | null;
}
export interface CatalogTier {
  id: string;
  productId: string;
  minKg: number;
  pricePerKgKurus: number;
  validUntil: string | null;
  rev: number;
  deletedAt: string | null;
}
export interface CatalogSync {
  rev: number;
  roasters: CatalogRoaster[];
  products: CatalogProduct[];
  priceTiers: CatalogTier[];
}

export interface OrderItem {
  productId: string | null;
  productName: string;
  quantityG: number;
  tierMinKg: number;
  pricePerKgKurus: number;
  lineTotalKurus: number;
}
export interface Order {
  id: string;
  orderNo: number;
  roasterId: string;
  roasterName: string;
  status: OrderStatus;
  requestedDeliveryDate: string | null;
  note: string | null;
  subtotalKurus: number;
  sentAt: string | null;
  decidedAt: string | null;
  declineReason: string | null;
  createdAt: string;
  items?: OrderItem[];
}
export interface OrderCreated {
  order: Order;
  message: string;
  waUrl: string;
}
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

// ---- admin ----
export interface AdminStats {
  pendingCafes: number;
  approvedCafes: number;
  commissionToCollectKurus: number;
  commissionRequestedKurus: number;
  ordersThisMonth: number;
  commissionConflicts: number;
}
export interface AdminCafe extends Cafe {
  ownerEmail?: string | null;
  ownerEmailVerified?: boolean;
  owner?: { email: string; emailVerified: boolean; createdAt: string } | null;
  orderCount?: number;
}
export interface AdminRoaster {
  id: string;
  name: string;
  city: string;
  district: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  logoUrl: string | null;
  brandColor: string | null;
  description: string | null;
  isFeatured: boolean;
  whatsapp: string;
  pricesIncludeVat: boolean;
  vatRatePct: number;
  pricesUpdatedAt: string | null;
  isActive: boolean;
  commissionRateBp: number;
  adminNotes: string | null;
  productCount: number;
}
export interface AdminTier {
  id: string;
  productId: string;
  minKg: number;
  pricePerKgKurus: number;
  validUntil: string | null;
  deletedAt: string | null;
}
export interface AdminProduct {
  id: string;
  roasterId: string;
  name: string;
  category: ProductCategory;
  process: string | null;
  origin: string | null;
  tastingNotes: string | null;
  isActive: boolean;
  tiers: AdminTier[];
}
export interface PriceHistory {
  id: number;
  action: 'insert' | 'update' | 'delete' | 'rollback';
  minKg: number;
  oldPriceKurus: number | null;
  newPriceKurus: number | null;
  reason: string | null;
  changedAt: string;
  changedBy: string | null;
}
export interface AdminOrder extends Order {
  cafeId: string;
  cafeName: string;
  cafePhone: string;
  roasterSaysNewCustomer: boolean | null;
  isFirstOrder: boolean;
  commissionConflict: boolean;
  commissionRateBp: number | null;
  commissionBaseKurus: number | null;
  commissionAmountKurus: number | null;
  commissionStatus: CommissionStatus;
  commissionNote: string | null;
}
export interface ImportResult {
  dryRun: boolean;
  applied: boolean;
  plan: {
    line: number;
    productName: string;
    minKg: number;
    pricePerKgKurus: number;
    action: string;
    oldPriceKurus: number | null;
  }[];
  errors: { line: number; raw: string; message: string }[];
  summary: {
    createProduct: number;
    createTier: number;
    updatePrice: number;
    unchanged: number;
    errors: number;
  };
}
export interface AuditLog {
  id: number;
  action: string;
  entity: string;
  entityId: string | null;
  createdAt: string;
  actor: string | null;
  before: unknown;
  after: unknown;
}
