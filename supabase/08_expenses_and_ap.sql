-- ════════════════════════════════════════════════════════════════════════════
-- Expense management: vendor bills (AP ledger), AP ageing, petty cash float.
-- Supersedes the placeholder supplier_payables view from 01_schema.sql.
-- Run after 01_schema.sql. Entity-scoped like the rest of the schema.
-- ════════════════════════════════════════════════════════════════════════════

drop view if exists supplier_payables;

-- ── Vendor bills (AP) ──────────────────────────────────────────────────────────
create table vendor_bills (
  id           uuid primary key default gen_random_uuid(),
  entity_id    text not null references entities(id),
  supplier_id  uuid references suppliers(id),
  bill_no      text,
  category     text not null default 'material',  -- material|utility|licence|tax|maintenance|transport|other
  description  text,
  bill_date    date not null default current_date,
  due_date     date,
  amount       numeric(14,2) not null default 0,
  status       text not null default 'unpaid',     -- unpaid|partial|paid
  external_ref text,
  created_at   timestamptz default now(),
  unique (entity_id, external_ref)
);

create table vendor_bill_payments (
  id         uuid primary key default gen_random_uuid(),
  entity_id  text not null references entities(id),
  bill_id    uuid references vendor_bills(id) on delete cascade,
  amount     numeric(14,2) not null,
  paid_date  date not null default current_date,
  method     text default 'bank'                  -- bank|cash|petty_cash
);

-- ── AP balances & ageing (mirrors customer_balances / ar_ageing) ──────────────
create view supplier_balances as
select s.id, s.entity_id, s.name,
  coalesce(sum(vb.amount), 0) - coalesce(pp.paid, 0) as balance,
  min(case when vb.status <> 'paid' then vb.due_date end) as oldest_due
from suppliers s
left join vendor_bills vb on vb.supplier_id = s.id and vb.status <> 'paid'
left join (select bill_id, sum(amount) paid from vendor_bill_payments group by bill_id) pp on pp.bill_id = vb.id
group by s.id, pp.paid;

create view ap_ageing as
select id, entity_id, name, balance,
  current_date - oldest_due as days_overdue,
  case
    when oldest_due is null then 'green'
    when current_date - oldest_due <= 30 then 'green'
    when current_date - oldest_due <= 60 then 'orange'
    else 'red' end as bucket
from supplier_balances where balance > 0;

-- ── Petty cash float ──────────────────────────────────────────────────────────
create table petty_cash_transactions (
  id          uuid primary key default gen_random_uuid(),
  entity_id   text not null references entities(id),
  type        text not null,                       -- top_up | expense
  category    text,                                 -- fuel|donation|food|stationery|salary_advance|maintenance|transport|other
  description text,
  amount      numeric(12,2) not null,
  txn_date    date not null default current_date,
  created_at  timestamptz default now()
);

create view petty_cash_balance as
select entity_id,
  coalesce(sum(case when type = 'top_up' then amount else -amount end), 0) as balance
from petty_cash_transactions
group by entity_id;

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table vendor_bills          enable row level security;
alter table vendor_bill_payments  enable row level security;
alter table petty_cash_transactions enable row level security;

create policy r_vendor_bills on vendor_bills for select using (in_scope(entity_id));
create policy w_vendor_bills on vendor_bills for all using (can_keep_books()) with check (can_keep_books());

create policy r_vendor_bill_payments on vendor_bill_payments for select using (in_scope(entity_id));
create policy w_vendor_bill_payments on vendor_bill_payments for all using (can_keep_books()) with check (can_keep_books());

create policy r_petty_cash on petty_cash_transactions for select using (in_scope(entity_id));
create policy w_petty_cash on petty_cash_transactions for all using (can_keep_books()) with check (can_keep_books());
