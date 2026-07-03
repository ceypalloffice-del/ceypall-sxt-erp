-- =========================================================
-- 13: Central Chemical Stock Management
-- Tracks Borax, Boric Acid, Anti Borer across CPI (SXT)
-- and pallet manufacturing (CPL). Shared central stock.
-- =========================================================

-- Master chemical products list
CREATE TABLE IF NOT EXISTS chemical_products (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT          NOT NULL,
  unit                 TEXT          NOT NULL,            -- 'kg' | 'L'
  pack_sizes           TEXT[]        NOT NULL DEFAULT '{}', -- dropdown options
  low_stock_threshold  NUMERIC(12,3) NOT NULL DEFAULT 0,
  is_active            BOOLEAN       NOT NULL DEFAULT true,
  sort_order           INT           NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Append-only movements ledger
CREATE TABLE IF NOT EXISTS chemical_movements (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id     UUID          NOT NULL REFERENCES chemical_products(id),
  movement_type  TEXT          NOT NULL
                   CHECK (movement_type IN (
                     'purchase',       -- stock in: bought chemicals
                     'cpi_treatment',  -- stock out: used in CPI treatment
                     'pallet_use',     -- stock out: used in pallet manufacturing
                     'tank_fill',      -- stock out: filled CPI chemical storage tank
                     'adjustment',     -- manual stock correction (spillage, damage, count)
                     'opening'         -- opening balance entry
                   )),
  quantity       NUMERIC(12,3) NOT NULL,   -- positive = in, negative = out (base unit)
  pack_size      TEXT,                      -- label e.g. '25 kg bag'
  packs_count    INT,                       -- number of packs (purchases)
  unit_cost      NUMERIC(12,4),             -- cost per base unit (per kg or per L)
  total_cost     NUMERIC(12,2),
  reference_no   TEXT,
  entity_id      TEXT          NOT NULL REFERENCES entities(id),
  notes          TEXT,
  movement_date  DATE          NOT NULL DEFAULT CURRENT_DATE,
  created_by     UUID          REFERENCES auth.users(id),
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chem_mov_product_idx ON chemical_movements(product_id);
CREATE INDEX IF NOT EXISTS chem_mov_date_idx    ON chemical_movements(movement_date DESC);
CREATE INDEX IF NOT EXISTS chem_mov_entity_idx  ON chemical_movements(entity_id);
CREATE INDEX IF NOT EXISTS chem_mov_type_idx    ON chemical_movements(movement_type);

-- Current stock on hand per chemical (sum of all movements)
CREATE OR REPLACE VIEW chemical_stock_on_hand AS
SELECT
  p.id,
  p.name,
  p.unit,
  p.pack_sizes,
  p.low_stock_threshold,
  p.sort_order,
  COALESCE(SUM(m.quantity), 0)   AS stock_qty,
  CASE
    WHEN COALESCE(SUM(m.quantity), 0) <= p.low_stock_threshold THEN true
    ELSE false
  END                            AS is_low_stock,
  -- Weighted average cost from inbound movements that have a unit_cost
  ROUND(
    COALESCE(SUM(
      CASE WHEN m.quantity > 0 AND m.unit_cost IS NOT NULL
           THEN m.quantity * m.unit_cost ELSE 0 END
    ), 0)
    / NULLIF(SUM(
      CASE WHEN m.quantity > 0 AND m.unit_cost IS NOT NULL
           THEN m.quantity ELSE 0 END
    ), 0),
  2) AS avg_cost_per_unit,
  -- Total cost of movements by type for reporting
  COALESCE(SUM(CASE WHEN m.movement_type = 'purchase' THEN m.total_cost ELSE 0 END), 0)  AS total_purchased_cost,
  COUNT(CASE WHEN m.movement_type = 'purchase' THEN 1 END)                                AS purchase_count
FROM chemical_products p
LEFT JOIN chemical_movements m ON m.product_id = p.id
WHERE p.is_active = true
GROUP BY p.id, p.name, p.unit, p.pack_sizes, p.low_stock_threshold, p.sort_order
ORDER BY p.sort_order;

-- Seed the three standard chemicals
-- Pack sizes determine dropdown options; qty-per-pack is handled in the app layer.
-- Anti Borer base unit = L (100ml = 0.1 L, 200ml = 0.2 L, 1L = 1.0 L)
INSERT INTO chemical_products (name, unit, pack_sizes, low_stock_threshold, sort_order)
VALUES
  ('Borax',      'kg', ARRAY['25 kg bag'],                                          50,  1),
  ('Boric Acid', 'kg', ARRAY['25 kg bag'],                                          50,  2),
  ('Anti Borer', 'L',  ARRAY['100 ml bottle', '200 ml bottle', '1 L bottle'],       2,   3)
ON CONFLICT DO NOTHING;

-- Row-Level Security
ALTER TABLE chemical_products  ENABLE ROW LEVEL SECURITY;
ALTER TABLE chemical_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chem_prod_read"  ON chemical_products;
DROP POLICY IF EXISTS "chem_prod_write" ON chemical_products;
DROP POLICY IF EXISTS "chem_mov_read"   ON chemical_movements;
DROP POLICY IF EXISTS "chem_mov_write"  ON chemical_movements;

CREATE POLICY "chem_prod_read"  ON chemical_products  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "chem_prod_write" ON chemical_products  FOR ALL    USING (can_keep_books());
CREATE POLICY "chem_mov_read"   ON chemical_movements FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "chem_mov_write"  ON chemical_movements FOR ALL    USING (can_keep_books());
