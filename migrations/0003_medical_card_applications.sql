-- Migration 0003: Medical Card (醫健卡) applications table
-- Stores applications for the NGO partner's free medical card

CREATE TABLE IF NOT EXISTS medical_card_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_no TEXT NOT NULL,              -- CoEldery 85 member number
  name_zh_full TEXT NOT NULL,           -- 中文全名 (as per HKID)
  name_en_full TEXT NOT NULL,           -- English full name (as per HKID)
  hkid_prefix TEXT NOT NULL,            -- First 4 chars of HKID e.g. K608
  phone TEXT NOT NULL,                  -- Contact phone (same as member)
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING | SENT | ISSUED | DECLINED
  applied_at TEXT NOT NULL DEFAULT (datetime('now')),
  sent_at TEXT DEFAULT NULL,            -- When admin sent to NGO
  notes TEXT DEFAULT '',                -- Internal notes
  FOREIGN KEY (member_no) REFERENCES members(member_no)
);

CREATE INDEX IF NOT EXISTS idx_medical_member ON medical_card_applications(member_no);
CREATE INDEX IF NOT EXISTS idx_medical_status ON medical_card_applications(status);
