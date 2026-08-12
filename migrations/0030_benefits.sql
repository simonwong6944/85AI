-- Migration 0030: Member Benefits System
-- Tables: benefit_categories (preset), benefits, benefit_fields (extra fields), benefit_claims

-- ─── 1. benefit_categories ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS benefit_categories (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  icon       TEXT    NOT NULL DEFAULT '🎁',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active  INTEGER NOT NULL DEFAULT 1,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO benefit_categories (id, name, icon, sort_order) VALUES
  (1, '健康', '💊', 1),
  (2, '餐飲', '🍽️', 2),
  (3, '購物', '🛍️', 3),
  (4, '旅遊', '✈️', 4),
  (5, '娛樂', '🎬', 5),
  (6, '其他', '🎁', 6);

-- ─── 2. benefits ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS benefits (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id      INTEGER NOT NULL REFERENCES benefit_categories(id),
  title            TEXT    NOT NULL,
  description      TEXT    NOT NULL DEFAULT '',
  image_url        TEXT,
  -- Date range
  start_date       TEXT,
  end_date         TEXT,
  -- Benefit content
  benefit_content  TEXT    NOT NULL DEFAULT '',   -- main benefit description
  -- Claim settings
  claim_limit      INTEGER NOT NULL DEFAULT 0,    -- 0=unlimited per member
  total_quota      INTEGER NOT NULL DEFAULT 0,    -- 0=unlimited total
  -- Extra custom fields stored as JSON: [{label, value}]
  extra_fields     TEXT    NOT NULL DEFAULT '[]',
  -- Status
  status           TEXT    NOT NULL DEFAULT 'active'
                    CHECK(status IN ('active','inactive','expired')),
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_by       TEXT    NOT NULL DEFAULT 'admin',
  created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_benefits_category ON benefits(category_id);
CREATE INDEX IF NOT EXISTS idx_benefits_status   ON benefits(status);

-- ─── 3. benefit_claims ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS benefit_claims (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  benefit_id  INTEGER NOT NULL REFERENCES benefits(id) ON DELETE CASCADE,
  member_no   TEXT    NOT NULL,
  claimed_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  notes       TEXT    NOT NULL DEFAULT '',
  UNIQUE(benefit_id, member_no)   -- one claim per member per benefit
);
CREATE INDEX IF NOT EXISTS idx_bc_benefit  ON benefit_claims(benefit_id);
CREATE INDEX IF NOT EXISTS idx_bc_member   ON benefit_claims(member_no);
CREATE INDEX IF NOT EXISTS idx_bc_claimed  ON benefit_claims(claimed_at);
