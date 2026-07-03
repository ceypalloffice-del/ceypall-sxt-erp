-- ════════════════════════════════════════════════════════════════════════════
-- Phase 2, Module 4 — Purchase Orders & Goods Received Notes (GRN)
-- When a GRN is confirmed the trigger auto-updates:
--   inventory_items  → inventory_movements  (col: qty, reference)
--   chemical_products → chemical_movements  (col: quantity, reference_no, movement_date)
-- ════════════════════════════════════════════════════════════════════════════

-- Auto-numbering sequences
CREATE SEQUENCE IF NOT EXISTS po_no_seq  START 1;
CREATE SEQUENCE IF NOT EXISTS grn_no_seq START 1;

-- ── Purchase Orders header ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_orders (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  po_no         TEXT        UNIQUE,
  entity_id     TEXT        NOT NULL REFERENCES entities(id),
  supplier_id   UUID        REFERENCES suppliers(id),
  status        TEXT        NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft','approved','sent','partial','received','cancelled')),
  order_date    DATE        NOT NULL DEFAULT CURRENT_DATE,
  expected_date DATE,
  notes         TEXT,
  created_by    UUID        REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION assign_po_no()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.po_no IS NULL OR NEW.po_no = '' THEN
    NEW.po_no := 'PO-' || LPAD(nextval('po_no_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_po_no ON purchase_orders;
CREATE TRIGGER trg_po_no BEFORE INSERT ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION assign_po_no();

-- ── Purchase Order line items ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id                UUID         NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  description          TEXT         NOT NULL,
  inventory_item_id    UUID         REFERENCES inventory_items(id),
  chemical_product_id  UUID         REFERENCES chemical_products(id),
  unit                 TEXT         NOT NULL,
  qty_ordered          NUMERIC(14,3) NOT NULL,
  unit_cost            NUMERIC(14,2),
  qty_received         NUMERIC(14,3) NOT NULL DEFAULT 0,
  sort_order           INT          NOT NULL DEFAULT 0
);

-- ── Goods Received Notes (GRN) header ────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_grns (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_no       TEXT        UNIQUE,
  po_id        UUID        NOT NULL REFERENCES purchase_orders(id),
  receipt_date DATE        NOT NULL DEFAULT CURRENT_DATE,
  notes        TEXT,
  created_by   UUID        REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION assign_grn_no()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.grn_no IS NULL OR NEW.grn_no = '' THEN
    NEW.grn_no := 'GRN-' || LPAD(nextval('grn_no_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_grn_no ON purchase_grns;
CREATE TRIGGER trg_grn_no BEFORE INSERT ON purchase_grns
  FOR EACH ROW EXECUTE FUNCTION assign_grn_no();

-- ── GRN line items ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_grn_items (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_id       UUID          NOT NULL REFERENCES purchase_grns(id) ON DELETE CASCADE,
  po_item_id   UUID          NOT NULL REFERENCES purchase_order_items(id),
  qty_received NUMERIC(14,3) NOT NULL,
  notes        TEXT
);

-- ── GRN trigger: auto-update stock on every GRN item insert ──────────────
-- inventory_movements uses: qty, reference   (no movement_date col)
-- chemical_movements  uses: quantity, reference_no, movement_date
CREATE OR REPLACE FUNCTION handle_grn_item()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_item  purchase_order_items%ROWTYPE;
  v_po    purchase_orders%ROWTYPE;
  v_grn   purchase_grns%ROWTYPE;
  v_total_ordered  NUMERIC;
  v_total_received NUMERIC;
BEGIN
  SELECT * INTO v_item FROM purchase_order_items WHERE id = NEW.po_item_id;
  SELECT * INTO v_po   FROM purchase_orders        WHERE id = v_item.po_id;
  SELECT * INTO v_grn  FROM purchase_grns           WHERE id = NEW.grn_id;

  -- 1. Accumulate qty_received on the PO line
  UPDATE purchase_order_items
     SET qty_received = qty_received + NEW.qty_received
   WHERE id = NEW.po_item_id;

  -- 2. Push stock: inventory item
  IF v_item.inventory_item_id IS NOT NULL THEN
    INSERT INTO inventory_movements
      (entity_id, item_id, movement_type, qty, unit_cost, reference, notes, created_by)
    VALUES
      (v_po.entity_id, v_item.inventory_item_id, 'purchase',
       NEW.qty_received, v_item.unit_cost,
       v_grn.grn_no, 'Auto from ' || v_grn.grn_no,
       v_po.created_by);
  END IF;

  -- 3. Push stock: chemical product
  IF v_item.chemical_product_id IS NOT NULL THEN
    INSERT INTO chemical_movements
      (product_id, movement_type, quantity, unit_cost, reference_no,
       entity_id, notes, movement_date, created_by)
    VALUES
      (v_item.chemical_product_id, 'purchase',
       NEW.qty_received, v_item.unit_cost,
       v_grn.grn_no, v_po.entity_id,
       'Auto from ' || v_grn.grn_no,
       v_grn.receipt_date,
       v_po.created_by);
  END IF;

  -- 4. Recalculate PO status
  SELECT COALESCE(SUM(qty_ordered),  0),
         COALESCE(SUM(qty_received), 0)
    INTO v_total_ordered, v_total_received
    FROM purchase_order_items
   WHERE po_id = v_po.id;

  UPDATE purchase_orders
     SET status = CASE
                    WHEN v_total_received = 0             THEN status  -- no change (shouldn't happen)
                    WHEN v_total_received >= v_total_ordered THEN 'received'
                    ELSE 'partial'
                  END,
         updated_at = now()
   WHERE id = v_po.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_grn_item ON purchase_grn_items;
CREATE TRIGGER trg_grn_item
  AFTER INSERT ON purchase_grn_items
  FOR EACH ROW EXECUTE FUNCTION handle_grn_item();

-- ── Summary view ──────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW purchase_order_summary AS
SELECT
  po.id,
  po.po_no,
  po.entity_id,
  po.status,
  po.order_date,
  po.expected_date,
  po.created_at,
  po.updated_at,
  s.name                                                          AS supplier_name,
  COUNT(poi.id)                                                   AS line_count,
  COALESCE(SUM(poi.qty_ordered * poi.unit_cost), 0)              AS total_value,
  COALESCE(SUM(poi.qty_received),                0)              AS total_qty_received,
  COALESCE(SUM(poi.qty_ordered),                 0)              AS total_qty_ordered
FROM purchase_orders po
LEFT JOIN suppliers s             ON s.id   = po.supplier_id
LEFT JOIN purchase_order_items poi ON poi.po_id = po.id
GROUP BY po.id, po.po_no, po.entity_id, po.status, po.order_date,
         po.expected_date, po.created_at, po.updated_at, s.name
ORDER BY po.created_at DESC;

-- ── Indexes ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS po_entity_idx   ON purchase_orders(entity_id);
CREATE INDEX IF NOT EXISTS po_status_idx   ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS poi_po_idx      ON purchase_order_items(po_id);
CREATE INDEX IF NOT EXISTS grn_po_idx      ON purchase_grns(po_id);
CREATE INDEX IF NOT EXISTS grni_grn_idx    ON purchase_grn_items(grn_id);

-- ── RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE purchase_orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_grns        ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_grn_items   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS r_po   ON purchase_orders;
DROP POLICY IF EXISTS w_po   ON purchase_orders;
DROP POLICY IF EXISTS r_poi  ON purchase_order_items;
DROP POLICY IF EXISTS w_poi  ON purchase_order_items;
DROP POLICY IF EXISTS r_grn  ON purchase_grns;
DROP POLICY IF EXISTS w_grn  ON purchase_grns;
DROP POLICY IF EXISTS r_grni ON purchase_grn_items;
DROP POLICY IF EXISTS w_grni ON purchase_grn_items;

CREATE POLICY r_po   ON purchase_orders      FOR SELECT USING (in_scope(entity_id));
CREATE POLICY w_po   ON purchase_orders      FOR ALL    USING (can_keep_books());
CREATE POLICY r_poi  ON purchase_order_items FOR SELECT USING (true);
CREATE POLICY w_poi  ON purchase_order_items FOR ALL    USING (can_keep_books());
CREATE POLICY r_grn  ON purchase_grns        FOR SELECT USING (true);
CREATE POLICY w_grn  ON purchase_grns        FOR ALL    USING (can_keep_books());
CREATE POLICY r_grni ON purchase_grn_items   FOR SELECT USING (true);
CREATE POLICY w_grni ON purchase_grn_items   FOR ALL    USING (can_keep_books());
