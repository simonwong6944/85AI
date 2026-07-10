-- Migration 0017: feedback_threads + feedback_messages for 心聲 two-way inbox
-- Run manually: npx wrangler d1 execute webapp-production --file=./migrations/0017_feedback.sql

CREATE TABLE IF NOT EXISTS feedback_threads (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  member_no               TEXT    NOT NULL,
  member_name             TEXT    NOT NULL DEFAULT '',
  subject                 TEXT    NOT NULL,
  status                  TEXT    NOT NULL DEFAULT 'new' CHECK(status IN ('new','replied','closed')),
  has_unread_for_member   INTEGER NOT NULL DEFAULT 0,
  created_at              DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at              DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_feedback_threads_member_no
  ON feedback_threads(member_no);

CREATE TABLE IF NOT EXISTS feedback_messages (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id INTEGER NOT NULL,
  sender    TEXT    NOT NULL CHECK(sender IN ('member','admin')),
  content   TEXT    NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_feedback_messages_thread_id
  ON feedback_messages(thread_id);
