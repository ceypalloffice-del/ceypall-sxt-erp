-- ════════════════════════════════════════════════════════════════════════════
-- 19 — Structured block details on the materials price book
-- Blocks carry species (shared wood_species column from 18) + dimensions;
-- buying price basis lives in `unit` ('ft' | 'beam').
-- Idempotent: safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

alter table cost_items add column if not exists block_dimensions text;  -- e.g. 75mm x 100mm (3"x4")
