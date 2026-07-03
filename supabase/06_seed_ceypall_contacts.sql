-- ════════════════════════════════════════════════════════════════════════════
-- Seeds CPL customers and suppliers extracted from the QuickBooks P&L Detail
-- (Jan 1 - Jun 26 2026). Several names were truncated in the source PDF —
-- correct full names later as you get a clean QuickBooks export.
-- Idempotent via NOT EXISTS guard (no external_ref available yet to upsert on).
-- ════════════════════════════════════════════════════════════════════════════

insert into customers (entity_id, name)
select 'CPL', v.name
from (values
  ('MINRA Garments (Pvt) Ltd'),
  ('Queens Work Wear (Pvt) Ltd'),
  ('hemas consummer'),
  ('Ceylon Plant Food (Pvt) Ltd'),
  ('Azan Trading (Pvt) Ltd'),
  ('Bio Food Exports (Pvt) Ltd'),
  ('Dherana International'),
  ('Ceylon Tea Marketing'),
  ('Plastipak Lanka (Pvt) Ltd'),
  ('Jagro (Pvt) Ltd'),
  ('De La Ru'),
  ('AKBAR BROTHERS'),
  ('Variosystems (Pvt) Ltd'),
  ('APL Logistic Lanka'),
  ('Flintec Transducers'),
  ('Global Rubber Industries'),
  ('Assidua Technologies'),
  ('CBL Natural Foods')
) as v(name)
where not exists (
  select 1 from customers c where c.entity_id = 'CPL' and c.name = v.name
);

insert into suppliers (entity_id, name)
select 'CPL', v.name
from (values
  ('Metro Wire Industries'),
  ('The Adela Trading Co.'),
  ('Ruhunu'),
  ('Plywood House (Pvt) Ltd'),
  ('Sehasa Power Solutions')
) as v(name)
where not exists (
  select 1 from suppliers s where s.entity_id = 'CPL' and s.name = v.name
);
