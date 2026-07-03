-- ════════════════════════════════════════════════════════════════════════════
-- Pallet costing module — materials price book, pallet/crate specs, BOM lines.
-- Run after 01_schema.sql.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Materials price book ──────────────────────────────────────────────────────
create table cost_items (
  id          uuid primary key default gen_random_uuid(),
  entity_id   text not null references entities(id),
  category    text not null,                    -- timber | nail | chemical | labour | transport | other
  name        text not null,
  unit        text,
  unit_price  numeric(14,2) not null default 0,
  active      boolean default true,
  created_at  timestamptz default now(),
  unique (entity_id, name)
);

-- ── Pallet / crate specs (the design) ─────────────────────────────────────────
create table pallet_specs (
  id                 uuid primary key default gen_random_uuid(),
  entity_id          text not null references entities(id),
  customer_id        uuid references customers(id),
  name               text not null,
  pallet_size        text,                       -- e.g. '1200mm x 1200mm'
  base_type          text,                       -- 2-way | 4-way
  treatment_type     text,                        -- Chemical Vacuum Pressure Impregnation | Dipping | ...
  additional_treatment text,                      -- e.g. Kiln drying
  wood_species       text,
  planer             boolean default false,
  plank_thickness    text,
  planks_top         int,
  planks_middle      int,
  planks_bottom      int,
  block_spec         text,
  block_qty          int,
  wire_nail_spec     text,
  wire_nail_qty      int,
  screw_nail_spec    text,
  screw_nail_qty     int,
  margin_pct         numeric(5,4) not null default 0.20,
  notes              text,
  created_at         timestamptz default now()
);

-- ── BOM line items for a spec ─────────────────────────────────────────────────
create table pallet_spec_items (
  id           uuid primary key default gen_random_uuid(),
  spec_id      uuid references pallet_specs(id) on delete cascade,
  cost_item_id uuid references cost_items(id),
  item_name    text not null,                    -- snapshot of the name at time of costing
  unit_price   numeric(14,2) not null default 0,  -- snapshot, editable independently of cost_items
  qty          numeric(14,2) not null default 0,
  sort_order   int not null default 0
);

-- ── Derived view: BOM grand total per spec ────────────────────────────────────
create view pallet_spec_costing as
select spec_id, coalesce(sum(qty * unit_price), 0) as grand_total
from pallet_spec_items
group by spec_id;

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table cost_items        enable row level security;
alter table pallet_specs      enable row level security;
alter table pallet_spec_items enable row level security;

create policy r_cost_items on cost_items for select using (in_scope(entity_id));
create policy w_cost_items on cost_items for all using (can_keep_books()) with check (can_keep_books());

create policy r_pallet_specs on pallet_specs for select using (in_scope(entity_id));
create policy w_pallet_specs on pallet_specs for all using (can_keep_books()) with check (can_keep_books());

create policy r_pallet_spec_items on pallet_spec_items for select using (
  exists (select 1 from pallet_specs s where s.id = spec_id and in_scope(s.entity_id)));
create policy w_pallet_spec_items on pallet_spec_items for all using (can_keep_books()) with check (can_keep_books());
