-- ════════════════════════════════════════════════════════════════════════════
-- Change sxt_batches.started_at / completed_at from date → timestamptz so
-- that actual treatment duration can be computed to the hour.
-- Costing uses elapsed time (days + fractional hours) rather than a fixed
-- planned-days value.
-- ════════════════════════════════════════════════════════════════════════════

alter table sxt_batches
  alter column started_at   type timestamptz using started_at::timestamptz,
  alter column completed_at type timestamptz using completed_at::timestamptz;
