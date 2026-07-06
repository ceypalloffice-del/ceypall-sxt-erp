-- ════════════════════════════════════════════════════════════════════════════
-- 18 — Structured plank details on the materials price book
-- Planks carry species + dimensions; buying price basis lives in `unit`
-- ('ft' | 'plank'). Idempotent: safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

alter table cost_items add column if not exists wood_species    text;
alter table cost_items add column if not exists plank_width     text;  -- e.g. 4"
alter table cost_items add column if not exists plank_length    text;  -- e.g. 5'
alter table cost_items add column if not exists plank_thickness text;  -- e.g. 3/4"
