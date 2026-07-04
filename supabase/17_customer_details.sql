-- ════════════════════════════════════════════════════════════════════════════
-- 17 — Expanded customer details
-- Head-office + delivery addresses, per-department contact people
-- (accounts / operations / procurement), VAT TIN, free-form notes.
-- credit_days (credit terms), type, phone, email already exist on customers.
-- Idempotent: safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

alter table customers add column if not exists address            text;
alter table customers add column if not exists delivery_address   text;  -- only when different from head office
alter table customers add column if not exists vat_tin            text;

alter table customers add column if not exists accounts_contact    text;
alter table customers add column if not exists accounts_phone      text;
alter table customers add column if not exists accounts_email      text;

alter table customers add column if not exists operations_contact  text;
alter table customers add column if not exists operations_phone    text;
alter table customers add column if not exists operations_email    text;

alter table customers add column if not exists procurement_contact text;
alter table customers add column if not exists procurement_phone   text;
alter table customers add column if not exists procurement_email   text;

alter table customers add column if not exists notes               text;
