-- ════════════════════════════════════════════════════════════════════════════
-- UTILITY — Wipe all business data and start fresh.
-- ⚠️ IRREVERSIBLE. Deletes every transactional and master-data row.
-- Keeps: entities (SXT/CPL), profiles (users & roles), sxt_settings, cpi_settings.
-- Not a migration — run manually in the Supabase SQL editor only when you
-- deliberately want an empty ERP.
--
-- To restore the seeded reference data afterwards, re-run:
--   03_seed_cost_items.sql, 05_seed_treatment_rates.sql, 06_seed_ceypall_contacts.sql
-- ════════════════════════════════════════════════════════════════════════════

truncate table
  -- sales & jobs
  payments,
  invoice_lines,
  invoices,
  job_costs,
  jobs,
  treatment_quotes,
  customers,
  products,
  -- purchasing & expenses
  purchase_grn_items,
  purchase_grns,
  purchase_order_items,
  purchase_orders,
  vendor_bill_payments,
  vendor_bills,
  petty_cash_transactions,
  suppliers,
  -- money & people
  bank_accounts,
  director_loan,
  intercompany,
  staff,
  -- inventory & chemicals
  inventory_movements,
  inventory_items,
  warehouses,
  chemical_movements,
  chemical_products,
  -- pallet costing reference
  pallet_spec_items,
  pallet_specs,
  cost_items,
  -- treatment reference
  plank_treatment_rates,
  beam_treatment_rates,
  -- KD suite
  sxt_batch_items,
  sxt_batches,
  sxt_saved_sizes,
  sxt_competitor_prices,
  sxt_competitors,
  -- CPI suite
  cpi_treatment_logs,
  cpi_price_lists,
  cpi_competitor_prices
restart identity cascade;
