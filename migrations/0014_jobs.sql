-- 0014_jobs.sql
-- 工作市場第一階段：jobs + job_applications

CREATE TABLE IF NOT EXISTS jobs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  image_url   TEXT,
  title       TEXT    NOT NULL,
  location    TEXT,
  job_type    TEXT,
  company     TEXT,
  description TEXT,
  requirement TEXT,
  salary      TEXT,
  status      TEXT    DEFAULT 'open',
  sort_order  INTEGER DEFAULT 0,
  created_at  TEXT    DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_sort   ON jobs(sort_order);

CREATE TABLE IF NOT EXISTS job_applications (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id        INTEGER NOT NULL,
  member_no     TEXT    NOT NULL,
  applied_at    TEXT    DEFAULT (datetime('now')),
  handle_status TEXT    DEFAULT 'new',
  UNIQUE(job_id, member_no)
);

CREATE INDEX IF NOT EXISTS idx_job_apps_job_id    ON job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_apps_member_no ON job_applications(member_no);
