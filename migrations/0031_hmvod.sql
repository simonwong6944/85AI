-- HMVod free membership applications
CREATE TABLE IF NOT EXISTS hmvod_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_no TEXT NOT NULL,
  name_zh TEXT NOT NULL,
  name_en TEXT,
  phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  -- PENDING: WA sent, DONE: code delivered
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hmvod_phone ON hmvod_applications(phone);
CREATE INDEX IF NOT EXISTS idx_hmvod_member_no ON hmvod_applications(member_no);
CREATE INDEX IF NOT EXISTS idx_hmvod_created_at ON hmvod_applications(created_at DESC);

-- App settings key-value store (shared across features)
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  label TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Default: HMVod staff WhatsApp number
INSERT OR IGNORE INTO app_settings (key, value, label)
VALUES ('hmvod_wa_number', '85290000000', 'HMVod 職員 WhatsApp 號碼');
