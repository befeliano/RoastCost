import type { ColumnType, Generated } from 'kysely';

/** Hand-maintained Kysely types for migrations/*.sql — keep in sync when adding a migration. */
type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;
type TimestampNullable = ColumnType<
  Date | null,
  Date | string | null | undefined,
  Date | string | null
>;
type Num = ColumnType<number, number | undefined, number>;

export type UserRole = 'cafe_owner' | 'admin';
export type CafeStatusDb = 'pending' | 'approved' | 'rejected' | 'suspended';
export type OrderStatusDb = 'draft' | 'sent' | 'confirmed' | 'declined' | 'expired' | 'cancelled';
export type CommissionStatusDb = 'not_applicable' | 'pending' | 'requested' | 'paid' | 'waived';

export interface UsersTable {
  id: Generated<string>;
  email: string;
  password_hash: string;
  role: ColumnType<UserRole, UserRole | undefined, UserRole>;
  email_verified_at: TimestampNullable;
  failed_login_count: Num;
  locked_until: TimestampNullable;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at: TimestampNullable;
}
export interface CafesTable {
  id: Generated<string>;
  name: string;
  city: ColumnType<string, string | undefined, string>;
  district: string;
  phone_e164: string;
  status: ColumnType<CafeStatusDb, CafeStatusDb | undefined, CafeStatusDb>;
  status_note: string | null;
  approved_at: TimestampNullable;
  approved_by: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at: TimestampNullable;
}
export interface CafeMembersTable {
  cafe_id: string;
  user_id: string;
  member_role: ColumnType<string, string | undefined, string>;
  created_at: Timestamp;
}
export interface RefreshTokensTable {
  id: Generated<string>;
  user_id: string;
  family_id: string;
  token_hash: string;
  device_label: string | null;
  expires_at: Timestamp;
  revoked_at: TimestampNullable;
  replaced_by: string | null;
  created_at: Timestamp;
}
export interface EmailTokensTable {
  id: Generated<string>;
  user_id: string;
  purpose: 'verify_email' | 'reset_password';
  token_hash: string;
  expires_at: Timestamp;
  used_at: TimestampNullable;
  created_at: Timestamp;
}
export interface ConsentsTable {
  id: Generated<string>;
  user_id: string;
  doc_type: 'terms' | 'privacy' | 'kvkk_notice';
  doc_version: string;
  accepted_at: Timestamp;
}
export interface CafeSettingsTable {
  cafe_id: string;
  espresso_dose_g: Num;
  coffee_waste_pct: Num;
  ingredient_waste_pct: Num;
  cup_cost_kurus: Num;
  fixed_overhead_per_cup_kurus: Num;
  target_margin_pct: Num;
  sale_vat_rate_pct: Num;
  cost_excludes_vat: ColumnType<boolean, boolean | undefined, boolean>;
  price_rounding_step_kurus: Num;
  updated_at: Timestamp;
}
export interface CafeIngredientsTable {
  id: Generated<string>;
  cafe_id: string;
  name: string;
  kind: 'milk' | 'syrup' | 'other';
  price_per_liter_kurus: number;
  is_active: ColumnType<boolean, boolean | undefined, boolean>;
  created_at: Timestamp;
  updated_at: Timestamp;
}
export interface RecipesTable {
  id: Generated<string>;
  cafe_id: string;
  name: string;
  template_key: string | null;
  coffee_grams: number | null;
  uses_cup: ColumnType<boolean, boolean | undefined, boolean>;
  sell_price_kurus: number | null;
  sort_order: Num;
  is_active: ColumnType<boolean, boolean | undefined, boolean>;
  created_at: Timestamp;
  updated_at: Timestamp;
}
export interface RecipeIngredientsTable {
  id: Generated<string>;
  recipe_id: string;
  ingredient_id: string;
  quantity_ml: number;
}
export interface RoastersTable {
  id: Generated<string>;
  name: string;
  city: ColumnType<string, string | undefined, string>;
  whatsapp_e164: string;
  prices_include_vat: ColumnType<boolean, boolean | undefined, boolean>;
  vat_rate_pct: Num;
  prices_updated_at: TimestampNullable;
  is_active: ColumnType<boolean, boolean | undefined, boolean>;
  rev: Generated<number>;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at: TimestampNullable;
}
export interface RoasterAdminTable {
  roaster_id: string;
  commission_rate_bp: Num;
  admin_notes: string | null;
}
export interface ProductsTable {
  id: Generated<string>;
  roaster_id: string;
  name: string;
  category: 'espresso' | 'filter';
  process: string | null;
  origin: string | null;
  tasting_notes: string | null;
  is_active: ColumnType<boolean, boolean | undefined, boolean>;
  rev: Generated<number>;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at: TimestampNullable;
}
export interface PriceTiersTable {
  id: Generated<string>;
  product_id: string;
  min_kg: number;
  price_per_kg_kurus: number;
  valid_until: string | null;
  rev: Generated<number>;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at: TimestampNullable;
}
export interface PriceTierHistoryTable {
  id: Generated<number>;
  price_tier_id: string;
  product_id: string;
  min_kg: number;
  old_price_kurus: number | null;
  new_price_kurus: number | null;
  action: 'insert' | 'update' | 'delete' | 'rollback';
  changed_by: string | null;
  reason: string | null;
  changed_at: Timestamp;
}
export interface OrdersTable {
  id: Generated<string>;
  order_no: Generated<number>;
  cafe_id: string;
  roaster_id: string;
  created_by: string | null;
  cafe_name_snapshot: string;
  cafe_phone_snapshot: string;
  roaster_name_snapshot: string;
  status: ColumnType<OrderStatusDb, OrderStatusDb | undefined, OrderStatusDb>;
  requested_delivery_date: string | null;
  note: string | null;
  subtotal_kurus: Num;
  token_hash: string | null;
  token_expires_at: TimestampNullable;
  sent_at: TimestampNullable;
  decided_at: TimestampNullable;
  roaster_says_new_customer: boolean | null;
  decline_reason: string | null;
  is_first_order: boolean | null;
  commission_conflict: ColumnType<boolean, boolean | undefined, boolean>;
  commission_rate_bp_snapshot: number | null;
  commission_base_kurus: number | null;
  commission_amount_kurus: number | null;
  commission_status: ColumnType<
    CommissionStatusDb,
    CommissionStatusDb | undefined,
    CommissionStatusDb
  >;
  commission_note: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}
export interface OrderItemsTable {
  id: Generated<string>;
  order_id: string;
  product_id: string | null;
  product_name_snapshot: string;
  quantity_g: number;
  tier_min_kg_snapshot: number;
  price_per_kg_kurus_snapshot: number;
  line_total_kurus: number;
}
export interface AuditLogsTable {
  id: Generated<number>;
  actor_user_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  before: unknown;
  after: unknown;
  created_at: Timestamp;
}

export interface DB {
  users: UsersTable;
  cafes: CafesTable;
  cafe_members: CafeMembersTable;
  refresh_tokens: RefreshTokensTable;
  email_tokens: EmailTokensTable;
  consents: ConsentsTable;
  cafe_settings: CafeSettingsTable;
  cafe_ingredients: CafeIngredientsTable;
  recipes: RecipesTable;
  recipe_ingredients: RecipeIngredientsTable;
  roasters: RoastersTable;
  roaster_admin: RoasterAdminTable;
  products: ProductsTable;
  price_tiers: PriceTiersTable;
  price_tier_history: PriceTierHistoryTable;
  orders: OrdersTable;
  order_items: OrderItemsTable;
  audit_logs: AuditLogsTable;
}
