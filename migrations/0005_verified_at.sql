-- Add verified_at column to members table
-- NULL = pending verification, non-NULL = verified (timestamp of self-verification)
ALTER TABLE members ADD COLUMN verified_at TEXT;
