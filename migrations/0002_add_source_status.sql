-- Migration 0002: Add source tracking, member status, and referral fields

-- Member status: ACTIVE | INACTIVE | SUSPENDED
ALTER TABLE members ADD COLUMN status TEXT NOT NULL DEFAULT 'ACTIVE';

-- Source channel: walk-in | roadshow | referral | whatsapp | social | institution | online
ALTER TABLE members ADD COLUMN source TEXT NOT NULL DEFAULT 'walk-in';

-- Referrer member number (if referred by another member)
ALTER TABLE members ADD COLUMN referrer_no TEXT DEFAULT '';

-- Roadshow location (more specific than the existing roadshow field)
ALTER TABLE members ADD COLUMN roadshow_location TEXT DEFAULT '';

-- Admin notes (internal use only, not visible to member)
ALTER TABLE members ADD COLUMN admin_notes TEXT DEFAULT '';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
CREATE INDEX IF NOT EXISTS idx_members_source ON members(source);
CREATE INDEX IF NOT EXISTS idx_members_referrer ON members(referrer_no);
