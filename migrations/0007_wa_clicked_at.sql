ALTER TABLE members ADD COLUMN wa_clicked_at TEXT DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_members_wa_clicked ON members(wa_clicked_at);
