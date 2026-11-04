-- 0003 — roaster order terms shown to cafes and enforced when an order is created.
--   min_order_kg       minimum TOTAL kg per order across all products (e.g. Flores: 5 kg, mixed beans OK)
--   card_surcharge_bp  credit-card surcharge in basis points (250 = %2,5); informational for the cafe
alter table roasters
  add column min_order_kg      numeric(6,2) check (min_order_kg > 0 and min_order_kg <= 1000),
  add column card_surcharge_bp integer check (card_surcharge_bp between 0 and 2000);
