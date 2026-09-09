-- app_sessions：CE85 會員 WA magic-link 登入後的 HTTP session 表。
-- session_id 欄位名稱與 index.tsx 中所有 SELECT 查詢一致。
CREATE TABLE IF NOT EXISTS app_sessions (
  session_id  TEXT PRIMARY KEY,
  member_no   TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (member_no) REFERENCES members(member_no)
);

CREATE INDEX IF NOT EXISTS idx_app_sessions_member   ON app_sessions(member_no);
CREATE INDEX IF NOT EXISTS idx_app_sessions_expires  ON app_sessions(expires_at);
