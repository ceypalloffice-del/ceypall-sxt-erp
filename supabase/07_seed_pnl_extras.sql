-- ════════════════════════════════════════════════════════════════════════════
-- Extra data extracted from the QuickBooks P&L Detail (Jan 1 - Jun 26 2026):
--   1. Pallet/crate product catalog (draft specs, no BOM/pricing yet)
--   2. New raw materials seen on vendor bills, not yet in the price book
--   3. Historical invoice headers (no line amounts — dollar figures unreadable
--      from the source PDF's split column layout, see chat for why)
--   4. Jobs linked to those historical invoices
-- All idempotent via NOT EXISTS guards. Several descriptions were truncated
-- in the source PDF ("...") — clean up full names/specs later as needed.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Draft pallet/crate specs (CPL) ─────────────────────────────────────────
insert into pallet_specs (entity_id, name, pallet_size, notes)
select 'CPL', v.name, v.name, 'Imported from QB P&L memo field — spec incomplete, needs BOM and full dimensions.'
from (values
  ('48" x 48" Heat Treated...'),
  ('1000mm x 12...'),
  ('100cm x 120cm...'),
  ('44" x 44" Heat Treated...'),
  ('80cm x 120cm...'),
  ('Wooden pallet...'),
  ('80cm x 115cm...'),
  ('106cm x 110cm...'),
  ('1050mm(W) x...'),
  ('675mm(W) x...'),
  ('127cm x 97cm...'),
  ('113cm x 97cm...'),
  ('De la ru 134cm...'),
  ('1200mmX1000mm...'),
  ('112cm (L) x 7...'),
  ('138cm x 84cm...'),
  ('137cm x 84cm...'),
  ('136cm x 83cm...'),
  ('De la ru 138cm...'),
  ('8cm x 120cm...'),
  ('Box 360mm x...'),
  ('Box 800mm x...'),
  ('G R I Heat Treated...'),
  ('80" x 120" Heat Treated...'),
  ('44cm x 44cm'),
  ('Crate 730mm...'),
  ('Assidua 120cm...'),
  ('110cm x 110cm...'),
  ('APL 110CM X...')
) as v(name)
where not exists (
  select 1 from pallet_specs p where p.entity_id = 'CPL' and p.name = v.name
);

-- ── 2. New raw materials seen on vendor bills (price left at 0, inactive) ────
insert into cost_items (entity_id, category, name, unit, unit_price, active)
select 'CPL', v.category, v.name, v.unit, 0, false
from (values
  ('timber',   '9mm Plywood',         'sheet'),
  ('timber',   '15mm Plywood',        'sheet'),
  ('timber',   '18mm Plywood',        'sheet'),
  ('other',    'Drywall Screw',       'pc'),
  ('other',    'Sand Paper',          'pc'),
  ('other',    'Multibond Adhesive',  'pc')
) as v(category, name, unit)
where not exists (
  select 1 from cost_items c where c.entity_id = 'CPL' and c.name = v.name
);

-- ── 3. Historical invoice headers (no lines/amounts — see chat for why) ─────
insert into invoices (entity_id, invoice_no, customer_id, issue_date, status)
select 'CPL', v.invoice_no, c.id, v.issue_date::date, 'paid'
from (values
  ('0001','2026-02-26','MINRA Garments (Pvt) Ltd'),
  ('0002','2026-03-17','Queens Work Wear (Pvt) Ltd'),
  ('0003','2026-03-17','hemas consummer'),
  ('0004','2026-03-24','hemas consummer'),
  ('0005','2026-03-26','Ceylon Plant Food (Pvt) Ltd'),
  ('0006','2026-03-28','Azan Trading (Pvt) Ltd'),
  ('0007','2026-04-01','hemas consummer'),
  ('0008','2026-04-02','Azan Trading (Pvt) Ltd'),
  ('0009','2026-04-10','Plastipak Lanka (Pvt) Ltd'),
  ('0010','2026-04-22','Bio Food Exports (Pvt) Ltd'),
  ('0011','2026-04-22','Dherana International'),
  ('0012','2026-04-23','Ceylon Tea Marketing'),
  ('0013','2026-04-25','Dherana International'),
  ('0014','2026-04-28','hemas consummer'),
  ('0015','2026-04-29','hemas consummer'),
  ('0016','2026-04-29','Dherana International'),
  ('0017','2026-04-29','Ceylon Tea Marketing'),
  ('0018','2026-05-06','De La Ru'),
  ('0019','2026-05-07','AKBAR BROTHERS'),
  ('0020','2026-05-11','AKBAR BROTHERS'),
  ('0021','2026-05-05','Jagro (Pvt) Ltd'),
  ('0022','2026-05-14','De La Ru'),
  ('0023','2026-05-14','Dherana International'),
  ('0024','2026-05-14','Dherana International'),
  ('0025','2026-05-15','hemas consummer'),
  ('0026','2026-05-15','Dherana International'),
  ('0027','2026-05-18','hemas consummer'),
  ('0028','2026-05-19','AKBAR BROTHERS'),
  ('0029','2026-05-21','De La Ru'),
  ('0030','2026-05-21','AKBAR BROTHERS'),
  ('0031','2026-05-22','Ceylon Plant Food (Pvt) Ltd'),
  ('0032','2026-05-25','hemas consummer'),
  ('0033','2026-05-26','De La Ru'),
  ('0034','2026-05-27','AKBAR BROTHERS'),
  ('0035','2026-06-01','hemas consummer'),
  ('0036','2026-06-02','De La Ru'),
  ('0037','2026-06-02','Ceylon Plant Food (Pvt) Ltd'),
  ('0038','2026-06-03','APL Logistic Lanka'),
  ('0039','2026-06-05','Ceylon Tea Marketing'),
  ('0040','2026-06-08','AKBAR BROTHERS'),
  ('0041','2026-06-09','hemas consummer'),
  ('0042','2026-06-10','Variosystems (Pvt) Ltd'),
  ('0043','2026-06-12','AKBAR BROTHERS'),
  ('0044','2026-06-12','hemas consummer'),
  ('0045','2026-06-16','Plastipak Lanka (Pvt) Ltd'),
  ('0046','2026-06-17','AKBAR BROTHERS'),
  ('0047','2026-06-19','De La Ru'),
  ('0048','2026-06-19','CBL Natural Foods'),
  ('0049','2026-06-20','AKBAR BROTHERS'),
  ('0050','2026-06-20','Variosystems (Pvt) Ltd'),
  ('0051','2026-06-24','APL Logistic Lanka'),
  ('0052','2026-06-25','hemas consummer'),
  ('0053','2026-06-25','Variosystems (Pvt) Ltd'),
  ('0054','2026-06-26','De La Ru'),
  ('0056','2026-06-26','APL Logistic Lanka')
) as v(invoice_no, issue_date, customer_name)
join customers c on c.entity_id = 'CPL' and c.name = v.customer_name
where not exists (
  select 1 from invoices i where i.entity_id = 'CPL' and i.invoice_no = v.invoice_no
);

-- ── 4. Jobs linked to those historical invoices ──────────────────────────────
insert into jobs (entity_id, job_no, customer_id, status)
select 'CPL', i.invoice_no, i.customer_id, 'closed'
from invoices i
where i.entity_id = 'CPL'
  and not exists (select 1 from jobs j where j.entity_id = 'CPL' and j.job_no = i.invoice_no);

update invoices i
set job_id = j.id
from jobs j
where j.entity_id = 'CPL' and j.job_no = i.invoice_no and i.job_id is null and i.entity_id = 'CPL';
