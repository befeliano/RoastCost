-- 0002 — roaster profile for the Keşfet (explore) screen: district, address, map position, logo, brand colour.
-- Products get a roast level. All columns optional so existing rows stay valid.
alter table roasters
  add column district     text check (char_length(district) <= 80),
  add column address      text check (char_length(address) <= 200),
  add column latitude     numeric(9,6) check (latitude between -90 and 90),
  add column longitude    numeric(9,6) check (longitude between -180 and 180),
  add column logo_url     text check (logo_url ~ '^https://' and char_length(logo_url) <= 500),
  add column brand_color  text check (brand_color ~ '^#[0-9A-Fa-f]{6}$'),
  add column description  text check (char_length(description) <= 500),
  add column is_featured  boolean not null default false;

alter table products
  add column roast_level text check (roast_level in ('light','medium','dark'));
