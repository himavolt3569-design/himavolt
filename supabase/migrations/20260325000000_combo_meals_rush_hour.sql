-- ─── Combo Deals ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS combo_meals (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name           TEXT NOT NULL,
  description    TEXT,
  image_url      TEXT,
  combo_price    DOUBLE PRECISION NOT NULL,
  original_price DOUBLE PRECISION NOT NULL,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  restaurant_id  TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS combo_meal_items (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name         TEXT NOT NULL,
  quantity     INTEGER NOT NULL DEFAULT 1,
  combo_id     TEXT NOT NULL REFERENCES combo_meals(id) ON DELETE CASCADE,
  menu_item_id TEXT REFERENCES menu_items(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS combo_meals_restaurant_id_idx ON combo_meals(restaurant_id);
CREATE INDEX IF NOT EXISTS combo_meal_items_combo_id_idx ON combo_meal_items(combo_id);

-- ─── Rush Hour ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rush_hour_configs (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  is_enabled    BOOLEAN NOT NULL DEFAULT false,
  surge_enabled BOOLEAN NOT NULL DEFAULT false,
  surge_percent DOUBLE PRECISION NOT NULL DEFAULT 10,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  restaurant_id TEXT NOT NULL UNIQUE REFERENCES restaurants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rush_hour_slots (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  label      TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time   TEXT NOT NULL,
  days       TEXT[] NOT NULL DEFAULT '{}',
  is_active  BOOLEAN NOT NULL DEFAULT true,
  config_id  TEXT NOT NULL REFERENCES rush_hour_configs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS rush_hour_slots_config_id_idx ON rush_hour_slots(config_id);

-- RLS policies (same pattern as other tables)
ALTER TABLE combo_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE combo_meal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE rush_hour_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rush_hour_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "combo_meals_all" ON combo_meals FOR ALL USING (true);
CREATE POLICY "combo_meal_items_all" ON combo_meal_items FOR ALL USING (true);
CREATE POLICY "rush_hour_configs_all" ON rush_hour_configs FOR ALL USING (true);
CREATE POLICY "rush_hour_slots_all" ON rush_hour_slots FOR ALL USING (true);
