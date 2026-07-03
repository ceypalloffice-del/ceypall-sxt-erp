-- ════════════════════════════════════════════════════════════════════════════
-- Seeds the CPL materials price book from the standard costing templates.
-- Safe to re-run — upserts on (entity_id, name).
-- ════════════════════════════════════════════════════════════════════════════

insert into cost_items (entity_id, category, name, unit, unit_price) values
  ('CPL', 'timber',    '1" x 4" x 4'' Plank',      'pc', 160),
  ('CPL', 'timber',    '3/4" x 4" x 4'' Plank',    'pc', 125),
  ('CPL', 'timber',    '5/8" x 4" x 4'' Plank',    'pc', 110),
  ('CPL', 'timber',    '2" x 4" x 4ft Beam',       'pc', 300),
  ('CPL', 'timber',    '2" x 4" x 4" Block',       'pc', 27),
  ('CPL', 'timber',    '3" x 4" x 4" Block',       'pc', 35),
  ('CPL', 'timber',    '4" x 4" x 4" Block',       'pc', 45),
  ('CPL', 'timber',    '4" x 6" x 4" Block',       'pc', 55),
  ('CPL', 'nail',      '2 x 10 Wire Nail',         'pc', 2.5),
  ('CPL', 'nail',      '2.5 x 10 Wire Nail',       'pc', 2.5),
  ('CPL', 'nail',      '2 x 12 Wire Nail',         'pc', 2.5),
  ('CPL', 'nail',      '3 1/2" x 8 Wire Nail',     'pc', 5),
  ('CPL', 'nail',      '4" x 5 Wire Nail',         'pc', 7),
  ('CPL', 'nail',      '3" x 8 Wire Nail',         'pc', 5),
  ('CPL', 'nail',      '2 x 12 Screw Nail',        'pc', 8),
  ('CPL', 'labour',    'Labour',                   'job', 350),
  ('CPL', 'chemical',  'Chemical (Impregnation)',  'pc', 65),
  ('CPL', 'chemical',  'Chemical (Dipping)',        'pc', 14),
  ('CPL', 'transport', 'Transport',                 'job', 0)
on conflict (entity_id, name) do nothing;
