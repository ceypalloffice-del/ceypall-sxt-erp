-- ════════════════════════════════════════════════════════════════════════════
-- SXT timber treatment module — rate books (plank/beam) + quote calculator.
-- SXT is services-only: kiln drying and chemical (Boron) impregnation.
-- Run after 01_schema.sql (02/03 are CPL-only and not required for this).
-- ════════════════════════════════════════════════════════════════════════════

-- ── Rate books ───────────────────────────────────────────────────────────────
-- Planks: priced per sqft, rate varies by thickness.
create table plank_treatment_rates (
  id            uuid primary key default gen_random_uuid(),
  entity_id     text not null default 'SXT' references entities(id),
  service       text not null,                  -- kiln_drying | impregnation
  thickness     text not null,                  -- e.g. '1"', '3/4"', '5/8"'
  rate_per_sqft numeric(10,2) not null default 0,
  active        boolean default true,
  created_at    timestamptz default now(),
  unique (entity_id, service, thickness)
);

-- Beams: priced per LFT (linear foot), rate varies by cross-section (height x width).
create table beam_treatment_rates (
  id           uuid primary key default gen_random_uuid(),
  entity_id    text not null default 'SXT' references entities(id),
  service      text not null,                   -- kiln_drying | impregnation
  height       text not null,                   -- e.g. '2"'
  width        text not null,                   -- e.g. '4"'
  rate_per_lft numeric(10,2) not null default 0,
  active       boolean default true,
  created_at   timestamptz default now(),
  unique (entity_id, service, height, width)
);

-- ── Quote calculator (rate-based, no BOM — one line per quote) ───────────────
create table treatment_quotes (
  id          uuid primary key default gen_random_uuid(),
  entity_id   text not null default 'SXT' references entities(id),
  customer_id uuid references customers(id),
  name        text not null,
  service     text not null,                    -- kiln_drying | impregnation
  item_kind   text not null,                    -- plank | beam
  thickness   text,                              -- plank only
  height      text,                              -- beam only
  width       text,                              -- beam only
  qty         numeric(12,2) not null default 0,  -- sqft (plank) or LFT (beam)
  rate_used   numeric(10,2) not null default 0,   -- snapshot of the applied rate
  margin_pct  numeric(5,4) not null default 0.20,
  notes       text,
  created_at  timestamptz default now()
);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table plank_treatment_rates enable row level security;
alter table beam_treatment_rates  enable row level security;
alter table treatment_quotes      enable row level security;

create policy r_plank_rates on plank_treatment_rates for select using (in_scope(entity_id));
create policy w_plank_rates on plank_treatment_rates for all using (can_keep_books()) with check (can_keep_books());

create policy r_beam_rates on beam_treatment_rates for select using (in_scope(entity_id));
create policy w_beam_rates on beam_treatment_rates for all using (can_keep_books()) with check (can_keep_books());

create policy r_treatment_quotes on treatment_quotes for select using (in_scope(entity_id));
create policy w_treatment_quotes on treatment_quotes for all using (can_keep_books()) with check (can_keep_books());
