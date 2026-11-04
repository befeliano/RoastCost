-- 0001_init.sql — RoastCost base schema (spec §6.2, with hardening noted in docs/DECISIONS.md)
-- Runs as roastcost_migrator (schema owner). The API connects as roastcost_app (RLS enforced).

-- ===== Enums =====
create type user_role         as enum ('cafe_owner','admin');
create type cafe_status       as enum ('pending','approved','rejected','suspended');
create type product_category  as enum ('espresso','filter');
create type ingredient_kind   as enum ('milk','syrup','other');
create type order_status      as enum ('draft','sent','confirmed','declined','expired','cancelled');
create type commission_status as enum ('not_applicable','pending','requested','paid','waived');

create sequence catalog_rev_seq;
create sequence order_no_seq start 1001;

-- ===== Trigger helpers =====
create function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create function set_catalog_rev() returns trigger language plpgsql as $$
begin new.updated_at = now(); new.rev = nextval('catalog_rev_seq'); return new; end $$;

-- ===== RLS context (the API sets these with set_config(..., true) inside each transaction) =====
create function app_cafe_id()   returns uuid    language sql stable as $$ select nullif(current_setting('app.cafe_id', true), '')::uuid $$;
create function app_user_id()   returns uuid    language sql stable as $$ select nullif(current_setting('app.user_id', true), '')::uuid $$;
create function app_is_admin()  returns boolean language sql stable as $$ select coalesce(current_setting('app.is_admin', true), '') = 'true' $$;
-- Only for server-internal flows (register/login, token pages, jobs) AFTER the code validated the input.
create function app_is_system() returns boolean language sql stable as $$ select coalesce(current_setting('app.is_system', true), '') = 'true' $$;

-- ===== Identity =====
create table users (
  id                 uuid primary key default gen_random_uuid(),
  email              citext not null unique,
  password_hash      text not null,
  role               user_role not null default 'cafe_owner',
  email_verified_at  timestamptz,
  failed_login_count integer not null default 0,
  locked_until       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz
);
create trigger trg_users_updated before update on users for each row execute function set_updated_at();

create table cafes (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 2 and 120),
  city         text not null default 'Eskişehir',
  district     text not null check (char_length(district) between 2 and 80),
  phone_e164   text not null check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  status       cafe_status not null default 'pending',
  status_note  text check (char_length(status_note) <= 500),
  approved_at  timestamptz,
  approved_by  uuid references users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);
create trigger trg_cafes_updated before update on cafes for each row execute function set_updated_at();
create index idx_cafes_status on cafes(status) where deleted_at is null;

create table cafe_members (   -- MVP: one row per cafe (owner). Multi-user / branches later.
  cafe_id     uuid not null references cafes(id) on delete cascade,
  user_id     uuid not null references users(id) on delete cascade,
  member_role text not null default 'owner',
  created_at  timestamptz not null default now(),
  primary key (cafe_id, user_id)
);
create index idx_cafe_members_user on cafe_members(user_id);

create table refresh_tokens (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  family_id    uuid not null,
  token_hash   text not null unique,
  device_label text,
  expires_at   timestamptz not null,
  revoked_at   timestamptz,
  replaced_by  uuid references refresh_tokens(id),
  created_at   timestamptz not null default now()
);
create index idx_refresh_user on refresh_tokens(user_id);
create index idx_refresh_family on refresh_tokens(family_id);

create table email_tokens (   -- email verification and password reset
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  purpose    text not null check (purpose in ('verify_email','reset_password')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);
create index idx_email_tokens_user on email_tokens(user_id, purpose);

create table consents (       -- which version of which legal text was accepted when
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  doc_type    text not null check (doc_type in ('terms','privacy','kvkk_notice')),
  doc_version text not null,
  accepted_at timestamptz not null default now()
);
create index idx_consents_user on consents(user_id, doc_type);

-- ===== Cafe (tenant) data =====
create table cafe_settings (
  cafe_id                       uuid primary key references cafes(id) on delete cascade,
  espresso_dose_g               numeric(5,1) not null default 18.0 check (espresso_dose_g between 5 and 40),
  coffee_waste_pct              numeric(4,1) not null default 0 check (coffee_waste_pct between 0 and 50),
  ingredient_waste_pct          numeric(4,1) not null default 0 check (ingredient_waste_pct between 0 and 50),
  cup_cost_kurus                integer not null default 0 check (cup_cost_kurus >= 0),
  fixed_overhead_per_cup_kurus  integer not null default 0 check (fixed_overhead_per_cup_kurus >= 0),
  target_margin_pct             numeric(4,1) not null default 65 check (target_margin_pct between 1 and 95),
  sale_vat_rate_pct             numeric(4,1) not null default 10 check (sale_vat_rate_pct between 0 and 30),
  cost_excludes_vat             boolean not null default true,
  price_rounding_step_kurus     integer not null default 500 check (price_rounding_step_kurus > 0),
  updated_at                    timestamptz not null default now()
);
create trigger trg_cafe_settings_updated before update on cafe_settings for each row execute function set_updated_at();

create table cafe_ingredients (
  id                    uuid primary key default gen_random_uuid(),
  cafe_id               uuid not null references cafes(id) on delete cascade,
  name                  text not null check (char_length(name) between 1 and 80),
  kind                  ingredient_kind not null,
  price_per_liter_kurus integer not null check (price_per_liter_kurus >= 0),
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create trigger trg_cafe_ingredients_updated before update on cafe_ingredients for each row execute function set_updated_at();
create index idx_cafe_ingredients_cafe on cafe_ingredients(cafe_id);

create table recipes (
  id               uuid primary key default gen_random_uuid(),
  cafe_id          uuid not null references cafes(id) on delete cascade,
  name             text not null check (char_length(name) between 1 and 80),
  template_key     text check (template_key in ('espresso','americano','latte','cortado','cappuccino','mocha')),
  coffee_grams     numeric(5,1) check (coffee_grams > 0 and coffee_grams <= 60),
  uses_cup         boolean not null default true,
  sell_price_kurus integer check (sell_price_kurus > 0),
  sort_order       integer not null default 0,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create trigger trg_recipes_updated before update on recipes for each row execute function set_updated_at();
create index idx_recipes_cafe on recipes(cafe_id);

create table recipe_ingredients (
  id            uuid primary key default gen_random_uuid(),
  recipe_id     uuid not null references recipes(id) on delete cascade,
  ingredient_id uuid not null references cafe_ingredients(id) on delete restrict,
  quantity_ml   numeric(6,1) not null check (quantity_ml > 0 and quantity_ml <= 1000),
  unique (recipe_id, ingredient_id)
);
create index idx_recipe_ingredients_ingredient on recipe_ingredients(ingredient_id);

-- A recipe may only use ingredients of its own cafe.
create function check_recipe_ingredient_tenant() returns trigger language plpgsql as $$
begin
  if not exists (
    select 1 from recipes r join cafe_ingredients i on i.cafe_id = r.cafe_id
    where r.id = new.recipe_id and i.id = new.ingredient_id
  ) then
    raise exception 'ingredient does not belong to recipe cafe' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger trg_recipe_ingredient_tenant before insert or update on recipe_ingredients
  for each row execute function check_recipe_ingredient_tenant();

-- ===== Catalog (global; admin writes, approved cafes read) =====
create table roasters (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null check (char_length(name) between 2 and 120),
  city               text not null default 'Eskişehir',
  whatsapp_e164      text not null check (whatsapp_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  prices_include_vat boolean not null default false,
  vat_rate_pct       numeric(4,1) not null default 10 check (vat_rate_pct between 0 and 30),
  prices_updated_at  timestamptz,
  is_active          boolean not null default true,
  rev                bigint not null default nextval('catalog_rev_seq'),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz
);
create trigger trg_roasters_rev before insert or update on roasters for each row execute function set_catalog_rev();
create index idx_roasters_rev on roasters(rev);

create table roaster_admin (   -- NEVER exposed to cafes
  roaster_id         uuid primary key references roasters(id) on delete cascade,
  commission_rate_bp integer not null default 1500 check (commission_rate_bp between 0 and 5000),
  admin_notes        text check (char_length(admin_notes) <= 2000)
);

create table products (
  id            uuid primary key default gen_random_uuid(),
  roaster_id    uuid not null references roasters(id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 120),
  category      product_category not null,
  process       text check (process in ('washed','natural','honey','anaerobic','other')),
  origin        text check (char_length(origin) <= 120),
  tasting_notes text check (char_length(tasting_notes) <= 300),
  is_active     boolean not null default true,
  rev           bigint not null default nextval('catalog_rev_seq'),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create trigger trg_products_rev before insert or update on products for each row execute function set_catalog_rev();
create index idx_products_roaster on products(roaster_id) where deleted_at is null;
create index idx_products_rev on products(rev);

create table price_tiers (
  id                 uuid primary key default gen_random_uuid(),
  product_id         uuid not null references products(id) on delete cascade,
  min_kg             integer not null check (min_kg > 0),
  price_per_kg_kurus bigint not null check (price_per_kg_kurus > 0),
  valid_until        date,
  rev                bigint not null default nextval('catalog_rev_seq'),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz
);
create unique index uq_price_tier_product_minkg on price_tiers(product_id, min_kg) where deleted_at is null;
create trigger trg_price_tiers_rev before insert or update on price_tiers for each row execute function set_catalog_rev();
create index idx_price_tiers_rev on price_tiers(rev);
create index idx_price_tiers_product on price_tiers(product_id) where deleted_at is null;

create table price_tier_history (
  id              bigserial primary key,
  price_tier_id   uuid not null,
  product_id      uuid not null,
  min_kg          integer not null,
  old_price_kurus bigint,
  new_price_kurus bigint,
  action          text not null check (action in ('insert','update','delete','rollback')),
  changed_by      uuid references users(id),
  reason          text,
  changed_at      timestamptz not null default now()
);
create index idx_price_hist_tier on price_tier_history(price_tier_id, changed_at desc);
create index idx_price_hist_product on price_tier_history(product_id, changed_at desc);

-- SECURITY DEFINER: runs as the table owner so the history table can stay write-protected
-- for roastcost_app (no direct INSERT grant); the only writer is this trigger.
create function log_price_tier_change() returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_user   uuid := nullif(current_setting('app.user_id', true), '')::uuid;
  v_reason text := nullif(current_setting('app.change_reason', true), '');
begin
  if tg_op = 'INSERT' then
    insert into price_tier_history(price_tier_id, product_id, min_kg, old_price_kurus, new_price_kurus, action, changed_by, reason)
    values (new.id, new.product_id, new.min_kg, null, new.price_per_kg_kurus, 'insert', v_user, v_reason);
  elsif tg_op = 'UPDATE' then
    if new.deleted_at is not null and old.deleted_at is null then
      insert into price_tier_history(price_tier_id, product_id, min_kg, old_price_kurus, new_price_kurus, action, changed_by, reason)
      values (new.id, new.product_id, new.min_kg, old.price_per_kg_kurus, null, 'delete', v_user, v_reason);
    elsif new.deleted_at is null and old.deleted_at is not null then
      insert into price_tier_history(price_tier_id, product_id, min_kg, old_price_kurus, new_price_kurus, action, changed_by, reason)
      values (new.id, new.product_id, new.min_kg, null, new.price_per_kg_kurus, 'rollback', v_user, v_reason);
    elsif new.price_per_kg_kurus is distinct from old.price_per_kg_kurus then
      insert into price_tier_history(price_tier_id, product_id, min_kg, old_price_kurus, new_price_kurus, action, changed_by, reason)
      values (new.id, new.product_id, new.min_kg, old.price_per_kg_kurus, new.price_per_kg_kurus,
              case when v_reason like 'rollback%' then 'rollback' else 'update' end, v_user, v_reason);
    end if;
  end if;
  return new;
end $$;
create trigger trg_price_tier_history after insert or update on price_tiers for each row execute function log_price_tier_change();

-- ===== Orders =====
create table orders (
  id                          uuid primary key default gen_random_uuid(),
  order_no                    bigint not null unique default nextval('order_no_seq'),
  cafe_id                     uuid not null references cafes(id),
  roaster_id                  uuid not null references roasters(id),
  created_by                  uuid references users(id),
  cafe_name_snapshot          text not null,
  cafe_phone_snapshot         text not null,
  roaster_name_snapshot       text not null,
  status                      order_status not null default 'draft',
  requested_delivery_date     date,
  note                        text check (char_length(note) <= 500),
  subtotal_kurus              bigint not null default 0,
  token_hash                  text unique,      -- roaster link; the raw token is NEVER stored
  token_expires_at            timestamptz,
  sent_at                     timestamptz,
  decided_at                  timestamptz,
  roaster_says_new_customer   boolean,
  decline_reason              text check (char_length(decline_reason) <= 300),
  is_first_order              boolean,          -- true or NULL (never false) so the unique index works
  commission_conflict         boolean not null default false,
  commission_rate_bp_snapshot integer,
  commission_base_kurus       bigint,
  commission_amount_kurus     bigint,
  commission_status           commission_status not null default 'not_applicable',
  commission_note             text check (char_length(commission_note) <= 500),
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  check (is_first_order is null or is_first_order = true)
);
create trigger trg_orders_updated before update on orders for each row execute function set_updated_at();
create index idx_orders_cafe_created on orders(cafe_id, created_at desc, id desc);
create index idx_orders_roaster_status on orders(roaster_id, status);
create index idx_orders_pair_confirmed on orders(cafe_id, roaster_id) where status = 'confirmed';
create index idx_orders_commission on orders(commission_status) where commission_status in ('pending','requested');
create index idx_orders_sent on orders(sent_at) where status = 'sent';
create unique index uq_first_order_pair on orders(cafe_id, roaster_id) where is_first_order = true;

create table order_items (
  id                          uuid primary key default gen_random_uuid(),
  order_id                    uuid not null references orders(id) on delete cascade,
  product_id                  uuid references products(id) on delete set null,
  product_name_snapshot       text not null,
  quantity_g                  integer not null check (quantity_g > 0 and quantity_g <= 1000000),
  tier_min_kg_snapshot        integer not null,
  price_per_kg_kurus_snapshot bigint not null,
  line_total_kurus            bigint not null
);
create index idx_order_items_order on order_items(order_id);

-- ===== Audit =====
create table audit_logs (
  id            bigserial primary key,
  actor_user_id uuid references users(id),
  action        text not null,   -- e.g. cafe.approve, price.update, order.commission_status
  entity        text not null,
  entity_id     uuid,
  before        jsonb,
  after         jsonb,
  created_at    timestamptz not null default now()
);
create index idx_audit_entity on audit_logs(entity, entity_id, created_at desc);
create index idx_audit_created on audit_logs(created_at desc);

-- ===== Guard rails: tenants cannot escalate themselves =====
create function protect_cafe_columns() returns trigger language plpgsql as $$
begin
  if app_is_admin() or app_is_system() then return new; end if;
  if new.status is distinct from old.status or new.approved_at is distinct from old.approved_at
     or new.approved_by is distinct from old.approved_by or new.status_note is distinct from old.status_note
     or new.deleted_at is distinct from old.deleted_at then
    raise exception 'cafe status can only be changed by an admin' using errcode = '42501';
  end if;
  return new;
end $$;

create function protect_user_columns() returns trigger language plpgsql as $$
begin
  if app_is_admin() or app_is_system() then return new; end if;
  if new.role is distinct from old.role or new.email_verified_at is distinct from old.email_verified_at
     or new.locked_until is distinct from old.locked_until or new.failed_login_count is distinct from old.failed_login_count then
    raise exception 'role can only be changed by the system' using errcode = '42501';
  end if;
  return new;
end $$;

create function protect_order_columns() returns trigger language plpgsql as $$
begin
  if app_is_admin() or app_is_system() then return new; end if;
  if new.commission_status is distinct from old.commission_status
     or new.commission_base_kurus is distinct from old.commission_base_kurus
     or new.commission_amount_kurus is distinct from old.commission_amount_kurus
     or new.commission_rate_bp_snapshot is distinct from old.commission_rate_bp_snapshot
     or new.commission_conflict is distinct from old.commission_conflict
     or new.is_first_order is distinct from old.is_first_order
     or new.roaster_says_new_customer is distinct from old.roaster_says_new_customer
     or new.decided_at is distinct from old.decided_at
     or new.subtotal_kurus is distinct from old.subtotal_kurus
     or new.token_hash is distinct from old.token_hash
     or new.cafe_id is distinct from old.cafe_id
     or new.roaster_id is distinct from old.roaster_id
     or (new.status is distinct from old.status and new.status in ('confirmed','declined','expired')) then
    raise exception 'order decision/commission fields are not writable by cafes' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger trg_cafes_protect  before update on cafes  for each row execute function protect_cafe_columns();
create trigger trg_users_protect  before update on users  for each row execute function protect_user_columns();
create trigger trg_orders_protect before update on orders for each row execute function protect_order_columns();

-- ===== Grants =====
alter default privileges in schema public grant select, insert, update, delete on tables to roastcost_app;
alter default privileges in schema public grant usage, select on sequences to roastcost_app;
grant usage on schema public to roastcost_app;
grant select, insert, update, delete on all tables in schema public to roastcost_app;
grant usage, select on all sequences in schema public to roastcost_app;
revoke insert, update, delete on price_tier_history from roastcost_app;
revoke update, delete on audit_logs from roastcost_app;
grant execute on all functions in schema public to roastcost_app;

-- ===== Row Level Security =====
-- Identity tables (defense in depth; not in the original spec)
alter table users enable row level security;
create policy self_rw on users
  using (id = app_user_id() or app_is_admin() or app_is_system())
  with check (id = app_user_id() or app_is_admin() or app_is_system());

alter table cafe_members enable row level security;
create policy self_rw on cafe_members
  using (user_id = app_user_id() or app_is_admin() or app_is_system())
  with check (app_is_admin() or app_is_system());

alter table refresh_tokens enable row level security;
create policy self_rw on refresh_tokens
  using (user_id = app_user_id() or app_is_system())
  with check (user_id = app_user_id() or app_is_system());

alter table email_tokens enable row level security;
create policy system_only on email_tokens using (app_is_system()) with check (app_is_system());

alter table consents enable row level security;
create policy self_rw on consents
  using (user_id = app_user_id() or app_is_admin() or app_is_system())
  with check (user_id = app_user_id() or app_is_system());

-- Tenant tables
alter table cafes enable row level security;
create policy cafes_rw on cafes
  using (id = app_cafe_id() or app_is_admin() or app_is_system())
  with check (id = app_cafe_id() or app_is_admin() or app_is_system());

alter table cafe_settings enable row level security;
create policy tenant on cafe_settings
  using (cafe_id = app_cafe_id() or app_is_admin() or app_is_system())
  with check (cafe_id = app_cafe_id() or app_is_admin() or app_is_system());

alter table cafe_ingredients enable row level security;
create policy tenant on cafe_ingredients
  using (cafe_id = app_cafe_id() or app_is_admin() or app_is_system())
  with check (cafe_id = app_cafe_id() or app_is_admin() or app_is_system());

alter table recipes enable row level security;
create policy tenant on recipes
  using (cafe_id = app_cafe_id() or app_is_admin() or app_is_system())
  with check (cafe_id = app_cafe_id() or app_is_admin() or app_is_system());

alter table recipe_ingredients enable row level security;
create policy tenant on recipe_ingredients
  using (exists (select 1 from recipes r where r.id = recipe_id and (r.cafe_id = app_cafe_id() or app_is_admin() or app_is_system())))
  with check (exists (select 1 from recipes r where r.id = recipe_id and (r.cafe_id = app_cafe_id() or app_is_admin() or app_is_system())));

alter table orders enable row level security;
create policy tenant on orders
  using (cafe_id = app_cafe_id() or app_is_admin() or app_is_system())
  with check (cafe_id = app_cafe_id() or app_is_admin() or app_is_system());

alter table order_items enable row level security;
create policy tenant on order_items
  using (exists (select 1 from orders o where o.id = order_id and (o.cafe_id = app_cafe_id() or app_is_admin() or app_is_system())))
  with check (exists (select 1 from orders o where o.id = order_id and (o.cafe_id = app_cafe_id() or app_is_admin() or app_is_system())));

-- Catalog: approved cafes read, admin writes
create function app_cafe_approved() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from cafes where id = app_cafe_id() and status = 'approved' and deleted_at is null)
$$;

alter table roasters enable row level security;
create policy read_approved on roasters for select using (app_is_admin() or app_cafe_approved() or app_is_system());
create policy admin_write  on roasters for all    using (app_is_admin()) with check (app_is_admin());

alter table products enable row level security;
create policy read_approved on products for select using (app_is_admin() or app_cafe_approved() or app_is_system());
create policy admin_write  on products for all    using (app_is_admin()) with check (app_is_admin());

alter table price_tiers enable row level security;
create policy read_approved on price_tiers for select using (app_is_admin() or app_cafe_approved() or app_is_system());
create policy admin_write  on price_tiers for all    using (app_is_admin()) with check (app_is_admin());

alter table roaster_admin enable row level security;
create policy admin_only on roaster_admin for all using (app_is_admin() or app_is_system()) with check (app_is_admin());

alter table price_tier_history enable row level security;
create policy admin_read on price_tier_history for select using (app_is_admin());
-- no insert policy for roastcost_app: rows are written only by the SECURITY DEFINER trigger

alter table audit_logs enable row level security;
create policy admin_read on audit_logs for select using (app_is_admin());
create policy writers    on audit_logs for insert
  with check (app_is_admin() or app_is_system() or actor_user_id = app_user_id());
