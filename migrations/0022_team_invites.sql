-- ============================================================
-- 0022_team_invites.sql
-- 團隊申請邀請確認機制
-- ============================================================

-- 團隊邀請 token 表
-- 每個 GROUP 申請的每位成員各有一個一次性 token
CREATE TABLE IF NOT EXISTS team_invites (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  token         TEXT    NOT NULL UNIQUE,           -- 一次性確認 token（32 字元隨機）
  app_id        INTEGER NOT NULL REFERENCES role_applications(id) ON DELETE CASCADE,
  member_no     TEXT    NOT NULL,                  -- 被邀請的成員
  name_zh       TEXT    NOT NULL DEFAULT '',
  phone         TEXT    NOT NULL DEFAULT '',
  share_pct     REAL    NOT NULL DEFAULT 0,        -- 申請時填的分成%
  confirmed     INTEGER NOT NULL DEFAULT 0,        -- 0=待確認 1=已確認 2=已拒絕
  confirmed_at  TEXT    DEFAULT NULL,
  created_at    TEXT    NOT NULL DEFAULT (DATETIME('now')),
  expires_at    TEXT    NOT NULL                   -- 7 天有效
);

CREATE INDEX IF NOT EXISTS idx_team_invites_token  ON team_invites(token);
CREATE INDEX IF NOT EXISTS idx_team_invites_app_id ON team_invites(app_id);
