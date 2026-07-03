-- Migration 0004: System settings table
-- Key-value store for admin-configurable settings

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Default: admin WhatsApp number for member verification
INSERT OR IGNORE INTO settings (key, value) VALUES ('admin_whatsapp', '85291477341');
