-- ════════════════════════════════════════════════════════════════════════════
-- Phase 2, Module 1 — Inventory Management.
-- Entity-scoped (both SXT and CPL track stock). Quantity on hand is never
-- stored directly — it's derived from the movements audit trail, same
-- principle as balances/margins elsewhere in this schema (never recompute
-- in app code, always read from a view).
-- Run after 01_schema.sql.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists warehouses (
  id         uuid primary key default gen_random_uuid(),
  entity_id  text not null references entities(id),
  name       text not null,
  location   text,
  created_at timestamptz default now()
);

create table if not exists inventory_items (
  id                   uuid primary key default gen_random_uuid(),
  entity_id            text not null references entities(id),
  sku                  text,
  name                 text not null,
  category             text not null,        -- raw_timber|plank|block|plywood|crate|nail|chemical|packaging|finished_goods|other
  description          text,
  unit                 text,
  min_qty              numeric(14,2) default 0,
  max_qty              numeric(14,2),
  last_purchase_price  numeric(14,2),
  supplier_id          uuid references suppliers(id),
  warehouse_id         uuid references warehouses(id),
  active               boolean default true,
  created_at           timestamptz default now(),
  unique (entity_id, sku)
);

-- Drop the stored avg_cost column if it exists from an earlier draft of this migration —
-- average cost is computed from movements via inventory_avg_cost, never stored on the row.
alter table inventory_items drop column if exists avg_cost;

-- Append-only audit trail. qty is signed: positive = stock in, negative = stock out.
create table if not exists inventory_movements (
  id            uuid primary key default gen_random_uuid(),
  entity_id     text not null references entities(id),
  item_id       uuid not null references inventory_items(id),
  movement_type text not null,   -- purchase|goods_receipt|consumption|production_output|adjustment|return|transfer
  qty           numeric(14,2) not null,
  unit_cost     numeric(14,2),
  reference     text,            -- free text now (PO/job no.); FK'd to real tables in later modules
  notes         text,
  created_by    uuid references profiles(id),
  created_at    timestamptz default now()
);

-- ── Derived views — current stock & avg cost are computed, never stored ──────
drop view if exists inventory_with_stock;
drop view if exists inventory_stock;
drop view if exists inventory_avg_cost;

create view inventory_stock as
select item_id, coalesce(sum(qty), 0) as qty_on_hand
from inventory_movements
group by item_id;

-- Weighted-average cost across stock-in movements that carry a unit cost.
create view inventory_avg_cost as
select item_id,
  sum(qty * unit_cost) / nullif(sum(qty), 0) as avg_cost
from inventory_movements
where qty > 0 and unit_cost is not null
group by item_id;

create view inventory_with_stock as
select
  i.id, i.entity_id, i.sku, i.name, i.category, i.description, i.unit,
  i.min_qty, i.max_qty, i.last_purchase_price, i.supplier_id, i.warehouse_id,
  i.active, i.created_at,
  coalesce(s.qty_on_hand, 0) as qty_on_hand,
  round(coalesce(ac.avg_cost, 0), 2) as avg_cost,
  case
    when coalesce(s.qty_on_hand, 0) <= 0 then 'out_of_stock'
    when coalesce(s.qty_on_hand, 0) <= i.min_qty then 'low'
    when i.max_qty is not null and coalesce(s.qty_on_hand, 0) >= i.max_qty then 'overstock'
    else 'ok'
  end as stock_status
from inventory_items i
left join inventory_stock s on s.item_id = i.id
left join inventory_avg_cost ac on ac.item_id = i.id;

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table warehouses          enable row level security;
alter table inventory_items     enable row level security;
alter table inventory_movements enable row level security;

drop policy if exists r_warehouses on warehouses;
drop policy if exists w_warehouses on warehouses;
create policy r_warehouses on warehouses for select using (in_scope(entity_id));
create policy w_warehouses on warehouses for all using (can_keep_books()) with check (can_keep_books());

drop policy if exists r_inventory_items on inventory_items;
drop policy if exists w_inventory_items on inventory_items;
create policy r_inventory_items on inventory_items for select using (in_scope(entity_id));
create policy w_inventory_items on inventory_items for all using (can_keep_books()) with check (can_keep_books());

drop policy if exists r_inventory_movements on inventory_movements;
drop policy if exists w_inventory_movements on inventory_movements;
create policy r_inventory_movements on inventory_movements for select using (in_scope(entity_id));
create policy w_inventory_movements on inventory_movements for all using (can_keep_books()) with check (can_keep_books());
