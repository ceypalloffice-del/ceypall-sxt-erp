-- Migration 15: Add VAT and extra fields to invoices
-- Idempotent

alter table invoices
  add column if not exists vat_rate      numeric(5,2) default 18.0,
  add column if not exists delivery_no   text,
  add column if not exists purchaser_tin text,
  add column if not exists po_ref        text;

comment on column invoices.vat_rate      is 'VAT % applied to this invoice (default 18)';
comment on column invoices.delivery_no   is 'Delivery note / DO number';
comment on column invoices.purchaser_tin is 'Buyer TIN number for B2B tax invoices';
comment on column invoices.po_ref        is 'Customer purchase order reference';
