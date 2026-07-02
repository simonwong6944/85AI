-- CoEldery 85 · D1 Database Schema
-- Members table: stores all primary and family card holders

CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_no TEXT UNIQUE NOT NULL,         -- CE85-000001
  tier TEXT NOT NULL DEFAULT 'PRIMARY',   -- PRIMARY | FAMILY
  name_zh TEXT NOT NULL,                  -- 中文姓名
  phone TEXT NOT NULL,                    -- WhatsApp 電話 (8 digits)
  name_en TEXT DEFAULT '',                -- 英文姓名
  gender TEXT DEFAULT '',                 -- M | F | X
  birth_year INTEGER DEFAULT NULL,        -- 出生年份
  district TEXT DEFAULT '',               -- 居住地區
  id_prefix TEXT DEFAULT '',              -- 身份證頭 4 位
  parent_no TEXT DEFAULT '',              -- 綁定主卡編號 (FAMILY only)
  parent_name TEXT DEFAULT '',            -- 綁定主卡姓名 (FAMILY only)
  relation TEXT DEFAULT '',              -- 與長輩關係 (FAMILY only)
  roadshow TEXT DEFAULT 'walk-in',        -- Roadshow 場次
  kyc_status TEXT DEFAULT 'PENDING',      -- PENDING | DONE
  role TEXT DEFAULT 'CoExplorery',        -- CoExplorery | CoLinkery | CoSupportery | CoOwnery | CoLeadery
  notes TEXT DEFAULT '',                  -- 備註
  expires_at TEXT NOT NULL,              -- 有效日期 (ISO date string)
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone);
CREATE INDEX IF NOT EXISTS idx_members_tier ON members(tier);
CREATE INDEX IF NOT EXISTS idx_members_roadshow ON members(roadshow);
CREATE INDEX IF NOT EXISTS idx_members_kyc ON members(kyc_status);
CREATE INDEX IF NOT EXISTS idx_members_parent ON members(parent_no);

-- Counter table: tracks the next member number
CREATE TABLE IF NOT EXISTS counter (
  id INTEGER PRIMARY KEY CHECK (id = 1),  -- enforce single row
  next_val INTEGER NOT NULL DEFAULT 1
);

-- Seed the counter with initial value
INSERT OR IGNORE INTO counter (id, next_val) VALUES (1, 1);

-- Roadshow log table
CREATE TABLE IF NOT EXISTS roadshow_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  roadshow_code TEXT NOT NULL,
  member_no TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_roadshow_log_code ON roadshow_log(roadshow_code);
