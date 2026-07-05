-- Migration 0009: JHC Stores and Roadshows tables

-- JHC Shopping Centres / stores list
CREATE TABLE IF NOT EXISTS jhc_stores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_code TEXT UNIQUE NOT NULL,   -- e.g. "APM", "MK"
  name_zh TEXT NOT NULL,              -- Chinese name
  name_en TEXT,                       -- English name
  district TEXT,                      -- District / region
  address TEXT,                       -- Full address
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_jhc_stores_code ON jhc_stores(store_code);
CREATE INDEX IF NOT EXISTS idx_jhc_stores_district ON jhc_stores(district);

-- Roadshows (events held at JHC stores)
CREATE TABLE IF NOT EXISTS roadshows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,          -- Short unique code e.g. "RS2024-001"
  store_id INTEGER,                   -- FK -> jhc_stores.id
  store_code TEXT,                    -- Denormalised for convenience
  name TEXT NOT NULL,                 -- Display name of this roadshow
  start_date TEXT,                    -- ISO date "YYYY-MM-DD"
  end_date TEXT,                      -- ISO date "YYYY-MM-DD"
  status TEXT NOT NULL DEFAULT 'active',  -- active | inactive | ended
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (store_id) REFERENCES jhc_stores(id)
);
CREATE INDEX IF NOT EXISTS idx_roadshows_code ON roadshows(code);
CREATE INDEX IF NOT EXISTS idx_roadshows_store ON roadshows(store_id);
CREATE INDEX IF NOT EXISTS idx_roadshows_status ON roadshows(status);
