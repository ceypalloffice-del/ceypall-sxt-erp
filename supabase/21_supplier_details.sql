-- ════════════════════════════════════════════════════════════════════════════
-- 21 — Supplier (vendor) details
-- Company name, address, credit terms on suppliers;
-- name/category/phone/email already exist.
-- Idempotent: safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

alter table suppliers add column if not exists company_name text;
alter table suppliers add column if not exists address      text;
alter table suppliers add column if not exists credit_days  int default 30;
