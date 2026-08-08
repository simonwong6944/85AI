-- Migration 0027: WhatsApp QR Quick Registration System
-- Adds: registration_method, registration_status fields to members
--       wa_login_tokens table (for one-time app login links)
--       qr_sources table (QR code management)
--       whatsapp_webhook_logs table (webhook activity log)

-- ── 1. Extend members table ───────────────────────────────────────────────────
-- How the member was registered: web_form | whatsapp_qr
ALTER TABLE members ADD COLUMN registration_method TEXT NOT NULL DEFAULT 'web_form';

-- Whether profile is complete (gender + district filled)
-- incomplete | complete
ALTER TABLE members ADD COLUMN registration_status TEXT NOT NULL DEFAULT 'complete';

-- Roadshow source tag (for whatsapp_qr registrations)
ALTER TABLE members ADD COLUMN roadshow_source TEXT DEFAULT NULL;

-- IP address captured at registration
ALTER TABLE members ADD COLUMN registration_ip TEXT DEFAULT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_members_reg_method ON members(registration_method);
CREATE INDEX IF NOT EXISTS idx_members_reg_status ON members(registration_status);
CREATE INDEX IF NOT EXISTS idx_members_roadshow_source ON members(roadshow_source);

-- ── 2. wa_login_tokens — one-time app login tokens sent via WhatsApp ──────────
CREATE TABLE IF NOT EXISTS wa_login_tokens (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  token        TEXT UNIQUE NOT NULL,         -- 64-char hex random token
  member_no    TEXT NOT NULL,                -- references members.member_no
  phone        TEXT NOT NULL,               -- member phone for validation
  purpose      TEXT NOT NULL DEFAULT 'app_login',
  used         INTEGER NOT NULL DEFAULT 0,   -- 0 = unused, 1 = used
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at   TEXT NOT NULL,               -- datetime string, 24h from creation
  used_at      TEXT DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_wa_tokens_token   ON wa_login_tokens(token);
CREATE INDEX IF NOT EXISTS idx_wa_tokens_member  ON wa_login_tokens(member_no);
CREATE INDEX IF NOT EXISTS idx_wa_tokens_expires ON wa_login_tokens(expires_at);

-- ── 3. qr_sources — QR code / roadshow source management ────────────────────
CREATE TABLE IF NOT EXISTS qr_sources (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id     TEXT UNIQUE NOT NULL,        -- e.g. roadshow_wan_chai_aug2026
  display_name  TEXT NOT NULL,              -- e.g. 灣仔Roadshow
  event_date    TEXT DEFAULT NULL,          -- ISO date e.g. 2026-08-08
  location      TEXT DEFAULT NULL,          -- e.g. 灣仔運動場
  status        TEXT NOT NULL DEFAULT 'active', -- active | inactive
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  notes         TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_qr_sources_status ON qr_sources(status);

-- Seed some initial QR sources
INSERT OR IGNORE INTO qr_sources (source_id, display_name, event_date, location, status)
VALUES
  ('roadshow_wan_chai_aug2026',       '灣仔 Roadshow',         '2026-08-08', '灣仔運動場',     'active'),
  ('roadshow_causeway_bay_aug2026',   '銅鑼灣 Roadshow',       '2026-08-15', '銅鑼灣世界貿易廣場', 'active'),
  ('roadshow_mong_kok_aug2026',       '旺角 Roadshow',         '2026-08-22', '旺角朗豪坊廣場',   'active'),
  ('online_website',                  '官網線上登記',           NULL,         NULL,            'active');

-- ── 4. whatsapp_webhook_logs — full audit trail of webhook activity ───────────
CREATE TABLE IF NOT EXISTS whatsapp_webhook_logs (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id       TEXT DEFAULT NULL,         -- WhatsApp message ID
  from_number      TEXT NOT NULL,             -- sender phone e.g. 85298765432
  message_content  TEXT NOT NULL,             -- raw message text
  parsed_name      TEXT DEFAULT NULL,
  parsed_year      INTEGER DEFAULT NULL,
  parsed_source    TEXT DEFAULT NULL,
  validation_result TEXT NOT NULL DEFAULT 'pending',
  -- success | format_error | invalid_year | duplicate_phone | invalid_phone | db_error
  member_no        TEXT DEFAULT NULL,         -- set on success
  response_status  TEXT NOT NULL DEFAULT 'pending', -- sent | failed | pending
  error_message    TEXT DEFAULT NULL,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  processed_at     TEXT DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_wh_logs_from_number    ON whatsapp_webhook_logs(from_number);
CREATE INDEX IF NOT EXISTS idx_wh_logs_validation     ON whatsapp_webhook_logs(validation_result);
CREATE INDEX IF NOT EXISTS idx_wh_logs_member_no      ON whatsapp_webhook_logs(member_no);
CREATE INDEX IF NOT EXISTS idx_wh_logs_created_at     ON whatsapp_webhook_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_wh_logs_parsed_source  ON whatsapp_webhook_logs(parsed_source);
