-- Migration 0011: WA verify status flow
-- Adds wa_channel (ICON/BIZ/NULL) and re_verify flag to members table

ALTER TABLE members ADD COLUMN wa_channel TEXT DEFAULT NULL;
-- Values: NULL = not clicked, 'ICON' = normal WA button clicked, 'BIZ' = WA Business button clicked

ALTER TABLE members ADD COLUMN re_verify INTEGER DEFAULT 0;
-- Values: 0 = normal, 1 = admin flagged as needs re-verification (watermark shown again)

CREATE INDEX IF NOT EXISTS idx_members_wa_channel ON members(wa_channel);
CREATE INDEX IF NOT EXISTS idx_members_re_verify ON members(re_verify);
