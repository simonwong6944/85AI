-- Migration 0006: Member groups management
-- Admin-defined groups (e.g. VIP, 葵青社區, XX機構)

CREATE TABLE IF NOT EXISTS member_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,          -- Group name, e.g. "VIP會員", "葵青社區"
  description TEXT DEFAULT '',        -- Optional description
  color TEXT DEFAULT '#4caf50',       -- Display colour for badge
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Add group_id to members table (nullable = unassigned)
ALTER TABLE members ADD COLUMN group_id INTEGER DEFAULT NULL REFERENCES member_groups(id);

-- Index for fast group filtering
CREATE INDEX IF NOT EXISTS idx_members_group ON members(group_id);
