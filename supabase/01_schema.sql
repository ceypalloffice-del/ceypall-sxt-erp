-- ════════════════════════════════════════════════════════════════════════════
-- CeyPall + St. Xavier Timber — Group ERP — Phase 1 schema
-- Run this first in the Supabase SQL editor, then 02_seed.sql.
-- Multi-entity (SXT / CPL / consolidated), job-centric costing, computed balances.
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── Entities & users ─────────────────────────────────────────────────────────
create table entities (
  id         text primary key,                 -- 'SXT' | 'CPL'
  name       text not null,
  short_name text not null,
  color      text,
  website    text,
  address    text,
  phone      text,
  email      text
);

create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text,
  role         text not null default 'viewer',  -- director | accounts | production | viewer
  entity_scope text references entities(id)      -- null = all entities
);

-- Auto-create a profile on signup (defaults to viewer; elevate yourself after).
-- search_path is pinned because the auth role's default path excludes public.
create or replace function handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ── Role helpers (security definer = bypass RLS, no recursion) ────────────────
create or replace function app_role()  returns text    language sql security definer stable as $$ select role from profiles where id = auth.uid() $$;
create or replace function app_scope() returns text    language sql security definer stable as $$ select entity_scope from profiles where id = auth.uid() $$;
create or replace function is_director() returns boolean language sql security definer stable as $$ select coalesce(app_role() = 'director', false) $$;
create or replace function can_keep_books() returns boolean language sql security definer stable as $$ select coalesce(app_role() in ('director','accounts'), false) $$;
-- Scope test used by read policies
create or replace function in_scope(e text) returns boolean language sql security definer stable as $$ select is_director() or app_scope() is null or app_scope() = e $$;

-- ── Core master data ─────────────────────────────────────────────────────────
create table customers (
  id           uuid primary key default gen_random_uuid(),
  entity_id    text not null references entities(id),
  name         text not null,
  type         text default 'Corporate',
  credit_days  int  default 30,
  phone        text,
  email        text,
  external_ref text,                            -- QuickBooks ListID, for idempotent import
  created_at   timestamptz default now(),
  unique (entity_id, external_ref)
);

create table suppliers (
  id           uuid primary key default gen_random_uuid(),
  entity_id    text not null references entities(id),
  name         text not null,
  category     text,
  phone        text,
  email        text,
  external_ref text,
  created_at   timestamptz default now(),
  unique (entity_id, external_ref)
);

create table products (
  id            uuid primary key default gen_random_uuid(),
  entity_id     text not null references entities(id),
  code          text,
  name          text not null,
  kind          text not null,                  -- 'Product' | 'Service'
  unit          text,
  price         numeric(14,2) not null,
  stock         numeric(14,2),
  reorder_level numeric(14,2),
  external_ref  text,
  unique (entity_id, external_ref)
);

create table staff (
  id          uuid primary key default gen_random_uuid(),
  entity_id   text not null references entities(id),
  name        text not null,
  role        text,
  salary_type text default 'monthly',
  salary      numeric(14,2) not null,
  active      boolean default true
);

-- ── Jobs (the spine) ─────────────────────────────────────────────────────────
create table jobs (
  id          uuid primary key default gen_random_uuid(),
  entity_id   text not null references entities(id),
  job_no      text not null,
  customer_id uuid references customers(id),
  description text,
  status      text default 'open',              -- open|in_progress|complete|invoiced|closed
  created_at  timestamptz default now()
);

create table job_costs (
  id         uuid primary key default gen_random_uuid(),
  job_id     uuid references jobs(id) on delete cascade,
  cost_type  text not null,                      -- timber|labour|treatment|transport|electricity|fuel|other
  description text,
  amount     numeric(14,2) not null,
  logged_at  timestamptz default now()
);

-- ── Sales ledger (balances are derived, never stored) ────────────────────────
create table invoices (
  id           uuid primary key default gen_random_uuid(),
  entity_id    text not null references entities(id),
  invoice_no   text not null,
  customer_id  uuid references customers(id),
  job_id       uuid references jobs(id),
  issue_date   date not null default current_date,
  due_date     date,
  status       text default 'unpaid',           -- unpaid|partial|paid
  notes        text,
  external_ref text,
  unique (entity_id, external_ref)
);

create table invoice_lines (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid references invoices(id) on delete cascade,
  product_id  uuid references products(id),
  description text,
  qty         numeric(14,2) not null,
  unit_price  numeric(14,2) not null,
  line_total  numeric(14,2) generated always as (qty * unit_price) stored
);

create table payments (
  id          uuid primary key default gen_random_uuid(),
  entity_id   text not null references entities(id),
  invoice_id  uuid references invoices(id),
  amount      numeric(14,2) not null,
  paid_date   date not null default current_date,
  method      text
);

-- ── Finance (director-only) ──────────────────────────────────────────────────
create table bank_accounts (
  id        uuid primary key default gen_random_uuid(),
  entity_id text references entities(id),        -- null = personal/director
  name      text not null,
  type      text,
  balance   numeric(16,2) not null,              -- negative = overdrawn
  od_target numeric(16,2)
);

create table director_loan (
  id          uuid primary key default gen_random_uuid(),
  entity_id   text references entities(id),
  entry_date  date not null,
  description text,
  direction   text not null,                     -- 'in' = director funded | 'out' = repaid to director
  amount      numeric(16,2) not null
);

create table intercompany (
  id          uuid primary key default gen_random_uuid(),
  from_entity text references entities(id),
  to_entity   text references entities(id),
  entry_date  date not null,
  description text,
  amount      numeric(16,2) not null
);

-- ── Derived views ────────────────────────────────────────────────────────────
create view customer_balances as
select c.id, c.entity_id, c.name, c.credit_days,
  coalesce(sum(il.line_total), 0) - coalesce(pp.paid, 0) as balance,
  min(case when i.status <> 'paid' then i.due_date end) as oldest_due
from customers c
left join invoices i on i.customer_id = c.id and i.status <> 'paid'
left join invoice_lines il on il.invoice_id = i.id
left join (select invoice_id, sum(amount) paid from payments group by invoice_id) pp on pp.invoice_id = i.id
group by c.id, pp.paid;

create view supplier_payables as
select id, entity_id, name, category from suppliers;  -- replace with bills ledger in Phase 4

create view job_pnl as
select j.id, j.entity_id, j.job_no, j.description,
  coalesce(rev.total, 0) as revenue,
  coalesce(cost.total, 0) as cost,
  coalesce(rev.total, 0) - coalesce(cost.total, 0) as profit,
  case when coalesce(rev.total, 0) > 0
    then round((coalesce(rev.total,0) - coalesce(cost.total,0)) / rev.total * 100, 1) end as margin_pct
from jobs j
left join (select i.job_id, sum(il.line_total) total from invoices i join invoice_lines il on il.invoice_id = i.id group by i.job_id) rev on rev.job_id = j.id
left join (select job_id, sum(amount) total from job_costs group by job_id) cost on cost.job_id = j.id;

create view ar_ageing as
select id, entity_id, name, balance,
  current_date - oldest_due as days_overdue,
  case
    when oldest_due is null then 'green'
    when current_date - oldest_due <= 30 then 'green'
    when current_date - oldest_due <= 60 then 'orange'
    else 'red' end as bucket
from customer_balances where balance > 0;

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table profiles      enable row level security;
alter table customers     enable row level security;
alter table suppliers     enable row level security;
alter table products      enable row level security;
alter table staff         enable row level security;
alter table jobs          enable row level security;
alter table job_costs     enable row level security;
alter table invoices      enable row level security;
alter table invoice_lines enable row level security;
alter table payments      enable row level security;
alter table bank_accounts enable row level security;
alter table director_loan enable row level security;
alter table intercompany  enable row level security;

-- Everyone reads their own profile; directors read all.
create policy own_profile on profiles for select using (id = auth.uid() or is_director());

-- Entity-scoped read for master + sales data
create policy r_customers on customers for select using (in_scope(entity_id));
create policy r_suppliers on suppliers for select using (in_scope(entity_id));
create policy r_products  on products  for select using (in_scope(entity_id));
create policy r_jobs      on jobs      for select using (in_scope(entity_id));
create policy r_invoices  on invoices  for select using (in_scope(entity_id));
create policy r_inv_lines on invoice_lines for select using (
  exists (select 1 from invoices i where i.id = invoice_id and in_scope(i.entity_id)));
create policy r_payments  on payments  for select using (in_scope(entity_id));

-- Bookkeepers (director + accounts) write sales data
create policy w_customers on customers for all using (can_keep_books()) with check (can_keep_books());
create policy w_suppliers on suppliers for all using (can_keep_books()) with check (can_keep_books());
create policy w_products  on products  for all using (can_keep_books()) with check (can_keep_books());
create policy w_invoices  on invoices  for all using (can_keep_books()) with check (can_keep_books());
create policy w_inv_lines on invoice_lines for all using (can_keep_books()) with check (can_keep_books());
create policy w_payments  on payments  for all using (can_keep_books()) with check (can_keep_books());
create policy w_jobs      on jobs      for all using (can_keep_books()) with check (can_keep_books());

-- Director-only: anything exposing cost, margin, pay, or the group's money
create policy d_job_costs on job_costs     for all using (is_director()) with check (is_director());
create policy d_staff     on staff         for all using (is_director()) with check (is_director());
create policy d_banks     on bank_accounts for all using (is_director()) with check (is_director());
create policy d_loan      on director_loan for all using (is_director()) with check (is_director());
create policy d_inter     on intercompany  for all using (is_director()) with check (is_director());

-- NOTE: job_pnl view exposes margin → restrict at the app layer to directors,
-- or wrap it in a security-definer function gated on is_director().
