alter table if exists public.supply_items add column if not exists high_price numeric(12,2) not null default 0;
alter table if exists public.supply_attribute_values add column if not exists high_supplement numeric(12,2) not null default 0;
