-- ════════════════════════════════════════════════════════════════════════════
-- Phase 2 — STX Chemical Pressure Impregnation (CPI) Management System
-- Idempotent. Run after 11_sxt_batch_timestamps.sql.
-- ════════════════════════════════════════════════════════════════════════════

-- ── CPI Settings ─────────────────────────────────────────────────────────
create table if not exists cpi_settings (
  key        text primary key,
  value      text not null,
  label      text not null,
  unit       text,
  updated_at timestamptz default now()
);

insert into cpi_settings (key, value, label, unit) values
  -- Machine (rarely change)
  ('tank_diameter_in',       '111',   'Chemical Tank Diameter',   'in'),
  ('tank_height_ft',         '12',    'Tank Height',              'ft'),
  ('cylinder_diameter_in',   '41',    'Pressure Cylinder Dia.',   'in'),
  ('cylinder_length_ft',     '27',    'Pressure Cylinder Length', 'ft'),
  ('tray_diameter_in',       '24',    'Tray Diameter',            'in'),
  ('tray_length_ft',         '26',    'Tray Length',              'ft'),
  ('tray_capacity_cuft',     '173',   'Tray Capacity',            'cu.ft'),
  ('bf_capacity',            '2076',  'Board Feet Capacity',      'BF'),
  -- Default chemical level used per treatment
  ('default_tank_drop_in',   '5',     'Default Chemical Level',   'in'),
  -- Chemical formula — quantities per 100 litres of solution
  ('borax_per_100l',         '4.5',   'Borax',                    'kg / 100 L'),
  ('boric_per_100l',         '3.5',   'Boric Acid',               'kg / 100 L'),
  ('anti_borer_ml_per_100l', '20',    'Anti Borer',               'ml / 100 L'),
  -- Chemical prices
  ('borax_price_per_kg',     '400',   'Borax Price',              'LKR / kg'),
  ('boric_price_per_kg',     '600',   'Boric Acid Price',         'LKR / kg'),
  ('anti_borer_price_per_l', '25000', 'Anti Borer Price',         'LKR / litre'),
  ('labour_cost',            '5000',  'Labour Cost',              'LKR / treatment'),
  ('electricity_cost',       '1500',  'Electricity Cost',         'LKR / treatment'),
  -- Profit
  ('target_margin_pct',      '25',    'Target Gross Margin',      '%'),
  -- 'auto' = prices calculated from live costs + margin; 'manual' = stored overrides win
  ('pricing_mode',           'auto',  'Pricing Mode',             '')
on conflict (key) do nothing;

-- ── Treatment logs (one row per CPI run) ─────────────────────────────────
create table if not exists cpi_treatment_logs (
  id               uuid primary key default gen_random_uuid(),
  log_no           text unique,
  log_date         date not null default current_date,
  operator         text,
  tank_drop_in     numeric(6,2)  not null,
  litres_used      numeric(10,2) not null,
  borax_kg         numeric(8,3)  not null,
  boric_kg         numeric(8,3)  not null,
  anti_borer_ml    numeric(8,2)  not null,
  borax_cost       numeric(12,2) not null,
  boric_cost       numeric(12,2) not null,
  anti_borer_cost  numeric(12,2) not null,
  chemical_cost    numeric(12,2) not null,
  labour_cost      numeric(12,2) not null,
  electricity_cost numeric(12,2) not null,
  total_cost       numeric(12,2) not null,
  board_feet       numeric(10,2),
  cost_per_bf      numeric(10,4),
  notes            text,
  created_at       timestamptz default now(),
  created_by       uuid references auth.users(id)
);

create sequence if not exists cpi_log_no_seq start 1;

create or replace function cpi_set_log_no()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.log_no is null or new.log_no = '' then
    new.log_no := 'CPI-' || lpad(nextval('cpi_log_no_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_cpi_log_no on cpi_treatment_logs;
create trigger trg_cpi_log_no
  before insert on cpi_treatment_logs
  for each row execute function cpi_set_log_no();

-- ── Standard size price list ──────────────────────────────────────────────
-- manual_*_per_piece = null → use auto-calculated price from live settings.
-- standard_length_ft is the reference length for per-piece price display.
create table if not exists cpi_price_lists (
  id                        uuid primary key default gen_random_uuid(),
  size_label                text not null,           -- e.g. '1x6'
  item_type                 text not null check (item_type in ('plank','beam')),
  thickness_in              numeric(6,3) not null,
  width_in                  numeric(6,3) not null,
  standard_length_ft        numeric(6,2) not null default 10,
  manual_chemical_per_piece numeric(10,2),           -- CPI price override (null = auto)
  manual_kiln_per_piece     numeric(10,2),           -- KD price (manual entry)
  manual_both_per_piece     numeric(10,2),           -- Combined CPI+KD (manual entry)
  sort_order                int default 0,
  unique(size_label, item_type)
);

-- Plank seed (all 10 ft reference length)
insert into cpi_price_lists (size_label, item_type, thickness_in, width_in, sort_order) values
  ('1x2',  'plank', 1,   2,  10),
  ('1x3',  'plank', 1,   3,  20),
  ('1x4',  'plank', 1,   4,  30),
  ('1x5',  'plank', 1,   5,  40),
  ('1x6',  'plank', 1,   6,  50),
  ('1x8',  'plank', 1,   8,  60),
  ('1x10', 'plank', 1,  10,  70),
  ('1x12', 'plank', 1,  12,  80),
  ('1½x2', 'plank', 1.5, 2,  90),
  ('1½x4', 'plank', 1.5, 4, 100),
  ('1½x6', 'plank', 1.5, 6, 110),
  ('2x2',  'plank', 2,   2, 120),
  ('2x4',  'plank', 2,   4, 130),
  ('2x6',  'plank', 2,   6, 140),
  ('2x8',  'plank', 2,   8, 150),
  ('2x10', 'plank', 2,  10, 160),
  ('2x12', 'plank', 2,  12, 170)
on conflict (size_label, item_type) do nothing;

-- Beam seed
insert into cpi_price_lists (size_label, item_type, thickness_in, width_in, sort_order) values
  ('1x2',  'beam', 1,   2,  10),
  ('2x2',  'beam', 2,   2,  20),
  ('2x4',  'beam', 2,   4,  30),
  ('2x6',  'beam', 2,   6,  40),
  ('3x4',  'beam', 3,   4,  50),
  ('3x5',  'beam', 3,   5,  60),
  ('3x6',  'beam', 3,   6,  70),
  ('4x6',  'beam', 4,   6,  80),
  ('4x8',  'beam', 4,   8,  90),
  ('4x10', 'beam', 4,  10, 100),
  ('4x12', 'beam', 4,  12, 110),
  ('6x8',  'beam', 6,   8, 120),
  ('6x10', 'beam', 6,  10, 130),
  ('6x12', 'beam', 6,  12, 140)
on conflict (size_label, item_type) do nothing;

-- ── Competitor CPI prices ─────────────────────────────────────────────────
create table if not exists cpi_competitor_prices (
  id               uuid primary key default gen_random_uuid(),
  competitor_id    uuid not null references sxt_competitors(id) on delete cascade,
  size_label       text not null,
  item_type        text not null check (item_type in ('plank','beam')),
  chemical_per_piece numeric(10,2),
  effective_date   date not null default current_date,
  notes            text,
  created_at       timestamptz default now(),
  unique(competitor_id, size_label, item_type)
);

-- ── RLS ──────────────────────────────────────────────────────────────────
alter table cpi_settings          enable row level security;
alter table cpi_treatment_logs    enable row level security;
alter table cpi_price_lists       enable row level security;
alter table cpi_competitor_prices enable row level security;

drop policy if exists r_cpi_settings on cpi_settings;
drop policy if exists w_cpi_settings on cpi_settings;
create policy r_cpi_settings on cpi_settings for select using (auth.uid() is not null);
create policy w_cpi_settings on cpi_settings for all using (can_keep_books()) with check (can_keep_books());

drop policy if exists r_cpi_logs on cpi_treatment_logs;
drop policy if exists w_cpi_logs on cpi_treatment_logs;
create policy r_cpi_logs on cpi_treatment_logs for select using (auth.uid() is not null);
create policy w_cpi_logs on cpi_treatment_logs for all using (can_keep_books()) with check (can_keep_books());

drop policy if exists r_cpi_price_lists on cpi_price_lists;
drop policy if exists w_cpi_price_lists on cpi_price_lists;
create policy r_cpi_price_lists on cpi_price_lists for select using (auth.uid() is not null);
create policy w_cpi_price_lists on cpi_price_lists for all using (can_keep_books()) with check (can_keep_books());

drop policy if exists r_cpi_competitor_prices on cpi_competitor_prices;
drop policy if exists w_cpi_competitor_prices on cpi_competitor_prices;
create policy r_cpi_competitor_prices on cpi_competitor_prices for select using (auth.uid() is not null);
create policy w_cpi_competitor_prices on cpi_competitor_prices for all using (can_keep_books()) with check (can_keep_books());
