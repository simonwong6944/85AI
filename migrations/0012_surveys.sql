-- 問卷表
CREATE TABLE IF NOT EXISTS surveys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title_zh TEXT NOT NULL,
  product_id INTEGER,
  vendor TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN',   -- OPEN / CLOSED / DRAFT
  created_at TEXT NOT NULL DEFAULT (datetime('now','+8 hours'))
);
CREATE INDEX IF NOT EXISTS idx_surveys_status ON surveys(status);
CREATE INDEX IF NOT EXISTS idx_surveys_product ON surveys(product_id);

-- 題目表
CREATE TABLE IF NOT EXISTS survey_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  survey_id INTEGER NOT NULL,
  seq INTEGER NOT NULL,
  qtype TEXT NOT NULL,        -- single / multi / rating / text
  text_zh TEXT NOT NULL,
  options_json TEXT,          -- JSON array of options; rating/text 可留空
  required INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_sq_survey ON survey_questions(survey_id);

-- 答案表
CREATE TABLE IF NOT EXISTS survey_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  survey_id INTEGER NOT NULL,
  member_no TEXT,
  roadshow_code TEXT,
  answers_json TEXT NOT NULL,  -- JSON: {"1":"值","2":5,"4":["效果","價錢"]...}
  submitted_at TEXT NOT NULL DEFAULT (datetime('now','+8 hours'))
);
CREATE INDEX IF NOT EXISTS idx_sr_survey ON survey_responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_sr_member ON survey_responses(member_no);
