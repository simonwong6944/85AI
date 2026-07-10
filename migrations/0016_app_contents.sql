-- Migration 0016: app_contents table for shopping & news tabs
-- Run manually: npx wrangler d1 execute webapp-production --file=./migrations/0016_app_contents.sql

CREATE TABLE IF NOT EXISTS app_contents (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  section     TEXT    NOT NULL CHECK(section IN ('shopping','news')),
  title       TEXT    NOT NULL,
  body        TEXT    NOT NULL DEFAULT '',
  address     TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  status      TEXT    NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','HIDDEN')),
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_app_contents_section_status_sort
  ON app_contents(section, status, sort_order);
