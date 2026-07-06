-- ════════════════════════════════════════════════════════════════════════════
-- 20 — Structured nail details on the materials price book
-- Nail type + size + gauge; buying price basis lives in `unit` ('kg' | 'nail').
-- Idempotent: safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

alter table cost_items add column if not exists nail_type  text;  -- e.g. Wire Nails
alter table cost_items add column if not exists nail_size  text;  -- e.g. 2"
alter table cost_items add column if not exists nail_gauge text;  -- e.g. 10
