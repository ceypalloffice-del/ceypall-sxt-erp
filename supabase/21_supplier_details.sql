-- ════════════════════════════════════════════════════════════════════════════
-- 21 — Supplier (vendor) details
-- Address on suppliers; name/category/phone/email already exist.
-- Idempotent: safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

alter table suppliers add column if not exists address text;
