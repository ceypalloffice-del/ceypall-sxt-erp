-- ════════════════════════════════════════════════════════════════════════════
-- Phase 2 — STX Timber Treatment Suite (Kiln Drying module, v1.0)
-- SXT-specific tables; no entity_id column (these tables are inherently SXT).
-- All derived values (sqft, m³, cost, profit) computed in the engine, never stored.
-- Run after 04_sxt_treatment.sql.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Settings (key-value pairs for kiln and costing configuration) ─────────
create table if not exists sxt_settings (
  key        text primary key,
  value      text not null,
  label      text not null,
  unit       text,
  updated_at timestamptz default now()
);

-- ── Competitors ───────────────────────────────────────────────────────────
create table if not exists sxt_competitors (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  location   text,
  active     boolean default true,
  notes      text,
  created_at timestamptz default now()
);

create table if not exists sxt_competitor_prices (
  id             uuid primary key default gen_random_uuid(),
  competitor_id  uuid not null references sxt_competitors(id) on delete cascade,
  thickness_mm   numeric(6,2) not null,
  width_mm       numeric(6,2),
  treatment_type text not null default 'kiln_drying',  -- kiln_drying|impregnation|both
  price_per_sqft numeric(10,2) not null,
  effective_date date not null default current_date,
  notes          text,
  created_at     timestamptz default now()
);

-- ── Kiln batches (multi-customer kiln loads) ──────────────────────────────
-- Electricity settings are captured at batch creation time so that
-- historical batch costs remain accurate even when settings change later.
create table if not exists sxt_batches (
  id                        uuid primary key default gen_random_uuid(),
  batch_no                  text unique not null,
  status                    text not null default 'open',   -- open|drying|complete|cancelled
  started_at                date,
  completed_at              date,
  electricity_units_per_day numeric(10,2) not null,
  drying_days               numeric(6,1) not null,
  electricity_rate          numeric(10,2) not null,
  labour_cost               numeric(12,2) not null default 0,
  notes                     text,
  created_by                uuid references profiles(id),
  created_at                timestamptz default now()
);

-- Auto-generate batch numbers in KD-000001 format
create sequence if not exists sxt_batch_no_seq start 1;

create or replace function sxt_set_batch_no()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.batch_no is null or new.batch_no = '' then
    new.batch_no := 'KD-' || lpad(nextval('sxt_batch_no_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sxt_batch_no on sxt_batches;
create trigger trg_sxt_batch_no
  before insert on sxt_batches
  for each row execute function sxt_set_batch_no();

-- ── Batch items (one row per customer-timber-size entry) ──────────────────
create table if not exists sxt_batch_items (
  id             uuid primary key default gen_random_uuid(),
  batch_id       uuid not null references sxt_batches(id) on delete cascade,
  customer_id    uuid references customers(id),
  customer_name  text,        -- walk-in fallback; prefer customer_id
  thickness_in   numeric(6,3) not null,
  width_in       numeric(6,3) not null,
  length_ft      numeric(8,2) not null,
  qty            integer not null check (qty > 0),
  treatment_type text not null default 'kiln_drying',
  rate_per_sqft  numeric(10,2),
  notes          text,
  sort_order     integer default 0,
  created_at     timestamptz default now()
);

-- ── Saved custom timber sizes (reusable in calculator) ────────────────────
create table if not exists sxt_saved_sizes (
  id           uuid primary key default gen_random_uuid(),
  label        text not null,
  size_type    text not null default 'plank',   -- plank|beam
  thickness_in numeric(6,3) not null,
  width_in     numeric(6,3),
  length_ft    numeric(8,2),
  created_at   timestamptz default now()
);

-- ── Default settings seed ─────────────────────────────────────────────────
insert into sxt_settings (key, value, label, unit) values
  ('kiln_capacity_m3',          '25',                   'Kiln Capacity',              'm³'),
  ('kiln_length_ft',            '20',                   'Kiln Length',                'ft'),
  ('kiln_width_ft',             '8',                    'Kiln Width',                 'ft'),
  ('kiln_height_ft',            '8',                    'Kiln Height (stacking)',      'ft'),
  ('electricity_units_per_day', '125',                  'Electricity Usage',          'kWh/day'),
  ('electricity_rate',          '45',                   'Electricity Rate',           'LKR/kWh'),
  ('drying_days',               '10',                   'Standard Drying Period',     'days'),
  ('sticker_thickness_in',      '0.75',                 'Sticker Thickness',          'inches'),
  ('target_margin_pct',         '40',                   'Target Gross Margin',        '%'),
  ('labour_cost_per_batch',     '5000',                 'Labour Cost per Batch',      'LKR'),
  ('company_name',              'St. Xavier Timber',    'Company Name',               ''),
  ('company_address',           '',                     'Company Address',            ''),
  ('company_phone',             '',                     'Company Phone',              ''),
  ('quotation_terms',           'Payment within 30 days of delivery. All timber remains the property of St. Xavier Timber until full payment is received.',
                                'Default Quotation Terms', '')
on conflict (key) do nothing;

-- ── RLS ──────────────────────────────────────────────────────────────────
alter table sxt_settings          enable row level security;
alter table sxt_competitors       enable row level security;
alter table sxt_competitor_prices enable row level security;
alter table sxt_batches           enable row level security;
alter table sxt_batch_items       enable row level security;
alter table sxt_saved_sizes       enable row level security;

drop policy if exists r_sxt_settings on sxt_settings;
drop policy if exists w_sxt_settings on sxt_settings;
create policy r_sxt_settings on sxt_settings for select using (auth.uid() is not null);
create policy w_sxt_settings on sxt_settings for all using (can_keep_books()) with check (can_keep_books());

drop policy if exists r_sxt_competitors on sxt_competitors;
drop policy if exists w_sxt_competitors on sxt_competitors;
create policy r_sxt_competitors on sxt_competitors for select using (auth.uid() is not null);
create policy w_sxt_competitors on sxt_competitors for all using (can_keep_books()) with check (can_keep_books());

drop policy if exists r_sxt_competitor_prices on sxt_competitor_prices;
drop policy if exists w_sxt_competitor_prices on sxt_competitor_prices;
create policy r_sxt_competitor_prices on sxt_competitor_prices for select using (auth.uid() is not null);
create policy w_sxt_competitor_prices on sxt_competitor_prices for all using (can_keep_books()) with check (can_keep_books());

drop policy if exists r_sxt_batches on sxt_batches;
drop policy if exists w_sxt_batches on sxt_batches;
create policy r_sxt_batches on sxt_batches for select using (auth.uid() is not null);
create policy w_sxt_batches on sxt_batches for all using (can_keep_books()) with check (can_keep_books());

drop policy if exists r_sxt_batch_items on sxt_batch_items;
drop policy if exists w_sxt_batch_items on sxt_batch_items;
create policy r_sxt_batch_items on sxt_batch_items for select using (auth.uid() is not null);
create policy w_sxt_batch_items on sxt_batch_items for all using (can_keep_books()) with check (can_keep_books());

drop policy if exists r_sxt_saved_sizes on sxt_saved_sizes;
drop policy if exists w_sxt_saved_sizes on sxt_saved_sizes;
create policy r_sxt_saved_sizes on sxt_saved_sizes for select using (auth.uid() is not null);
create policy w_sxt_saved_sizes on sxt_saved_sizes for all using (can_keep_books()) with check (can_keep_books());
