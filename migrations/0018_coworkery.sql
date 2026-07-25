-- ============================================================
-- 0018_coworkery.sql
-- CoWorkery 人手管理系統
-- 金額一律以「分」(cents) 為單位儲存，前端顯示除以 100
-- ============================================================

-- ── 1. CoWorkery 主檔 ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS co_workery (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  cw_no               TEXT    NOT NULL UNIQUE,          -- CW000001
  member_no           TEXT    NOT NULL,                 -- 綁定老有卡會員
  name_zh             TEXT    NOT NULL,
  name_en             TEXT,
  phone               TEXT    NOT NULL,
  gender              TEXT,
  birth_year          INTEGER,
  address             TEXT,
  district            TEXT,
  hkid_prefix         TEXT,                             -- 身分證頭4位（明碼供核對）
  id_front_key        TEXT,                             -- R2 key（身分證正本，加密受控）
  bank_name           TEXT,
  bank_account_name   TEXT,
  bank_account_no     TEXT,
  default_hourly_rate INTEGER NOT NULL DEFAULT 0,       -- 分/小時；個人預設時薪
  status              TEXT    NOT NULL DEFAULT 'PENDING',-- PENDING/ACTIVE/REJECTED/SUSPENDED
  reject_reason       TEXT,
  approved_by         TEXT,
  approved_at         TEXT,
  created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_cw_member  ON co_workery(member_no);
CREATE INDEX IF NOT EXISTS idx_cw_status  ON co_workery(status);
CREATE INDEX IF NOT EXISTS idx_cw_phone   ON co_workery(phone);

-- ── 2. CW 編號計數器 ─────────────────────────────────────────
-- seed 為 0；nextCwNo() 用 UPDATE ... RETURNING next_val，
-- 第一次攞到 1 → 格式化為 CW000001
CREATE TABLE IF NOT EXISTS coworkery_counter (
  id        INTEGER PRIMARY KEY CHECK (id = 1),
  next_val  INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO coworkery_counter (id, next_val) VALUES (1, 0);

-- ── 3. Roadshow 場次擴充（座標、時薪、津貼、品牌） ──────────────
-- 以 roadshow_code 對應既有 roadshows 表，唔改動原表
CREATE TABLE IF NOT EXISTS roadshow_geo (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  roadshow_code       TEXT    NOT NULL UNIQUE,
  latitude            REAL,
  longitude           REAL,
  geofence_radius     INTEGER NOT NULL DEFAULT 250,     -- 米
  headcount_needed    INTEGER NOT NULL DEFAULT 0,
  session_hourly_rate INTEGER NOT NULL DEFAULT 0,       -- 分/小時；場次時薪
  transport_allowance INTEGER NOT NULL DEFAULT 0,       -- 分/次；車馬費
  meal_allowance      INTEGER NOT NULL DEFAULT 0,       -- 分/次；膳食津貼
  brand_ref           TEXT,                             -- 品牌方標記（預留 CoPartnery 對接）
  created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_rsgeo_code ON roadshow_geo(roadshow_code);

-- ── 4. 報名表 ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS session_applications (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  roadshow_code  TEXT    NOT NULL,
  cw_no          TEXT    NOT NULL,
  status         TEXT    NOT NULL DEFAULT 'PENDING',    -- PENDING/APPROVED/REJECTED/WITHDRAWN
  note           TEXT,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (roadshow_code, cw_no)
);
CREATE INDEX IF NOT EXISTS idx_apply_rs   ON session_applications(roadshow_code);
CREATE INDEX IF NOT EXISTS idx_apply_cw   ON session_applications(cw_no);
CREATE INDEX IF NOT EXISTS idx_apply_stat ON session_applications(status);

-- ── 5. 派更表 ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS session_assignments (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  roadshow_code       TEXT    NOT NULL,
  cw_no               TEXT    NOT NULL,
  assigned_hourly_rate INTEGER NOT NULL DEFAULT 0,      -- 分/小時；0=沿用 fallback
  assigned_by         TEXT,
  created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (roadshow_code, cw_no)
);
CREATE INDEX IF NOT EXISTS idx_assign_rs  ON session_assignments(roadshow_code);
CREATE INDEX IF NOT EXISTS idx_assign_cw  ON session_assignments(cw_no);

-- ── 6. 打卡紀錄 ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance_records (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  roadshow_code   TEXT    NOT NULL,
  cw_no           TEXT    NOT NULL,
  clock_in_at     TEXT,
  clock_in_lat    REAL,
  clock_in_lng    REAL,
  clock_in_dist   INTEGER,                              -- 距場地米數
  clock_in_selfie TEXT,                                 -- R2 key
  clock_out_at    TEXT,
  clock_out_lat   REAL,
  clock_out_lng   REAL,
  clock_out_dist  INTEGER,
  worked_minutes  INTEGER NOT NULL DEFAULT 0,
  is_manual       INTEGER NOT NULL DEFAULT 0,           -- 0=正常 1=後台補打卡
  manual_by       TEXT,
  manual_reason   TEXT,
  flag            TEXT,                                 -- 例如 OVER_WEEKLY
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (roadshow_code, cw_no)
);
CREATE INDEX IF NOT EXISTS idx_att_rs     ON attendance_records(roadshow_code);
CREATE INDEX IF NOT EXISTS idx_att_cw     ON attendance_records(cw_no);

-- ── 7. 出糧單 ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payroll_records (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  roadshow_code   TEXT    NOT NULL,
  cw_no           TEXT    NOT NULL,
  total_minutes   INTEGER NOT NULL DEFAULT 0,
  hourly_rate     INTEGER NOT NULL DEFAULT 0,           -- 分；實際採用時薪
  wage_amount     INTEGER NOT NULL DEFAULT 0,           -- 分；工時薪
  transport_total INTEGER NOT NULL DEFAULT 0,           -- 分
  meal_total      INTEGER NOT NULL DEFAULT 0,           -- 分
  total_payable   INTEGER NOT NULL DEFAULT 0,           -- 分；總應付
  brand_ref       TEXT,                                 -- 快照，供品牌成本分攤
  status          TEXT    NOT NULL DEFAULT 'PENDING',   -- PENDING/APPROVED/PAID
  pay_due_date    TEXT,                                 -- 完場 +7 天
  paid_at         TEXT,
  paid_by         TEXT,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (roadshow_code, cw_no)
);
CREATE INDEX IF NOT EXISTS idx_pay_rs     ON payroll_records(roadshow_code);
CREATE INDEX IF NOT EXISTS idx_pay_cw     ON payroll_records(cw_no);
CREATE INDEX IF NOT EXISTS idx_pay_status ON payroll_records(status);
