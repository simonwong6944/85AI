-- ============================================================
-- 0021_revenue_sharing.sql
-- CoEldery 85 分錢系統（第一版）
-- 金額一律以「分」(cents) 為單位；百分比以 basis points (×100) 儲存
-- 例：10% = 1000 bps；驗證七項 bps 加總 = 10000
-- ============================================================

-- ── 1. 角色申請表 ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS role_applications (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  member_no        TEXT    NOT NULL REFERENCES members(member_no) ON DELETE CASCADE,
  role             TEXT    NOT NULL CHECK(role IN ('COLEADERY','COLINKERY')),
  applicant_type   TEXT    NOT NULL CHECK(applicant_type IN ('INDIVIDUAL','GROUP','COMPANY')),
  name_zh          TEXT    NOT NULL,
  name_en          TEXT    NOT NULL,
  id_prefix        TEXT    DEFAULT '',            -- 身份證前綴（個人）
  id_doc_r2_key    TEXT    DEFAULT '',            -- 身份證 R2 key（個人/公司BR）
  address          TEXT    DEFAULT '',
  phone            TEXT    DEFAULT '',
  bank_name        TEXT    DEFAULT '',
  bank_acc_no      TEXT    DEFAULT '',
  company_name     TEXT    DEFAULT '',            -- 公司名（公司身份）
  company_br       TEXT    DEFAULT '',            -- BR號
  industry_background TEXT DEFAULT '',
  team_size        INTEGER DEFAULT NULL,          -- 團隊人數（GROUP身份）
  team_notes       TEXT    DEFAULT '',            -- 團隊意向（前端填寫）
  status           TEXT    NOT NULL DEFAULT 'PENDING'
                           CHECK(status IN ('PENDING','APPROVED','REJECTED')),
  review_notes     TEXT    DEFAULT '',
  created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  reviewed_at      TEXT    DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_role_applications_member ON role_applications(member_no);
CREATE INDEX IF NOT EXISTS idx_role_applications_status ON role_applications(status);

-- ── 2. 已認證角色持有人 ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS role_holders (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  holder_no      TEXT    NOT NULL UNIQUE,        -- CL000001 / CK000001
  member_no      TEXT    NOT NULL REFERENCES members(member_no) ON DELETE CASCADE,
  role           TEXT    NOT NULL CHECK(role IN ('COLEADERY','COLINKERY')),
  applicant_type TEXT    NOT NULL CHECK(applicant_type IN ('INDIVIDUAL','GROUP','COMPANY')),
  name_zh        TEXT    NOT NULL,
  name_en        TEXT    NOT NULL DEFAULT '',
  status         TEXT    NOT NULL DEFAULT 'ACTIVE'
                         CHECK(status IN ('ACTIVE','SUSPENDED')),
  created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_role_holders_member  ON role_holders(member_no);
CREATE INDEX IF NOT EXISTS idx_role_holders_role    ON role_holders(role);

-- holder_no 序列計數器（CL = CoLeadery, CK = CoLinkery）
CREATE TABLE IF NOT EXISTS role_holder_counters (
  role    TEXT    PRIMARY KEY,   -- 'COLEADERY' / 'COLINKERY'
  next_val INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO role_holder_counters(role, next_val) VALUES ('COLEADERY', 0);
INSERT OR IGNORE INTO role_holder_counters(role, next_val) VALUES ('COLINKERY', 0);

-- ── 3. 電子授權卡 ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS authorization_cards (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  token      TEXT    NOT NULL UNIQUE,            -- 隨機碼，非順序
  holder_no  TEXT    NOT NULL REFERENCES role_holders(holder_no) ON DELETE CASCADE,
  card_type  TEXT    NOT NULL CHECK(card_type IN ('NEGOTIATION','PROJECT')),
  project_id INTEGER DEFAULT NULL REFERENCES projects(id) ON DELETE SET NULL,
  status     TEXT    NOT NULL DEFAULT 'VALID'
                     CHECK(status IN ('VALID','EXPIRED','REVOKED')),
  issued_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT    DEFAULT NULL,               -- 洽商卡 = issued_at + 90 天
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_auth_cards_holder ON authorization_cards(holder_no);
CREATE INDEX IF NOT EXISTS idx_auth_cards_token  ON authorization_cards(token);

-- ── 4. 合作夥伴機構（CoPartnery）────────────────────────────────
CREATE TABLE IF NOT EXISTS co_partners (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  partner_no        TEXT    NOT NULL UNIQUE,     -- CP000001
  name              TEXT    NOT NULL,
  partner_type      TEXT    NOT NULL CHECK(partner_type IN ('SUPPLIER','BRAND','RETAIL')),
  contact           TEXT    DEFAULT '',
  terms_notes       TEXT    DEFAULT '',          -- 合作條款（如寄賣比例）
  disclosure_level  TEXT    NOT NULL DEFAULT 'GENERIC'
                             CHECK(disclosure_level IN ('PUBLIC','GENERIC','ANONYMOUS')),
  created_at        TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- CoPartnery 序列計數器
CREATE TABLE IF NOT EXISTS co_partner_counter (
  id       INTEGER PRIMARY KEY DEFAULT 1,
  next_val INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO co_partner_counter(id, next_val) VALUES (1, 0);

-- ── 5. 項目 ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  project_code  TEXT    NOT NULL UNIQUE,         -- PRJ0001
  name          TEXT    NOT NULL,
  scenario      TEXT    NOT NULL CHECK(scenario IN ('PURE_B2C','B2C_TO_B2B','PURE_B2B')),
  stage         TEXT    NOT NULL DEFAULT 'STARTUP'
                        CHECK(stage IN ('STARTUP','GROWTH','SPECIAL')),
  business_type TEXT    DEFAULT '',              -- 業態：日用品/餐飲/服務等
  status        TEXT    NOT NULL DEFAULT 'DRAFT'
                        CHECK(status IN ('DRAFT','ACTIVE','SETTLING','SETTLED','CLOSED')),
  notes         TEXT    DEFAULT '',
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- 項目序列計數器
CREATE TABLE IF NOT EXISTS project_counter (
  id       INTEGER PRIMARY KEY DEFAULT 1,
  next_val INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO project_counter(id, next_val) VALUES (1, 0);

-- ── 6. 項目分成比例（basis points，加總必須 = 10000）────────────
CREATE TABLE IF NOT EXISTS project_shares (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id          INTEGER NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  pct_coleadery       INTEGER NOT NULL DEFAULT 0,    -- CoLeadery 份額 bps
  pct_colinkery       INTEGER NOT NULL DEFAULT 0,    -- CoLinkery 份額 bps
  pct_coownery        INTEGER NOT NULL DEFAULT 0,    -- CoOwnery 池 bps
  pct_cosupportery    INTEGER NOT NULL DEFAULT 0,    -- CoSupportery 池 bps
  pct_mutual_fund     INTEGER NOT NULL DEFAULT 0,    -- 互助基金 bps
  pct_platform_fee    INTEGER NOT NULL DEFAULT 0,    -- 平台費 bps
  pct_special_account INTEGER NOT NULL DEFAULT 0,    -- 特別資金帳戶 bps
  -- 七項加總 = 10000 由應用層強制驗證（SQLite CHECK 不支援欄位間加法）
  special_flag        INTEGER NOT NULL DEFAULT 0,    -- 1 = 特殊結構需審批
  created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ── 7. 項目參與者綁定 ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_participants (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id      INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  holder_no       TEXT    NOT NULL REFERENCES role_holders(holder_no) ON DELETE CASCADE,
  role            TEXT    NOT NULL CHECK(role IN ('COLEADERY','COLINKERY')),
  team_share_bps  INTEGER NOT NULL DEFAULT 10000,    -- 團隊內分帳 bps；單人項目=10000
  -- 同一 project_id + role 的所有 participant team_share_bps 加總必須 = 10000
  -- 由應用層驗證
  confirm_status  TEXT    NOT NULL DEFAULT 'CONFIRMED'
                          CHECK(confirm_status IN ('PENDING','CONFIRMED')),
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(project_id, holder_no, role)
);

CREATE INDEX IF NOT EXISTS idx_proj_participants_project ON project_participants(project_id);
CREATE INDEX IF NOT EXISTS idx_proj_participants_holder  ON project_participants(holder_no);

-- ── 8. 項目損益逐筆帳本 ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_ledger (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id      INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  entry_type      TEXT    NOT NULL CHECK(entry_type IN (
                    'INCOME',             -- 直接收入
                    'DIRECT_COST',        -- 直接支出
                    'PARTNER_SETTLEMENT', -- 供應商結算（分帳前，CoPartnery）
                    'FIXED_DEDUCTION'     -- 分帳前固定支出（如運費）
                  )),
  co_partner_id   INTEGER DEFAULT NULL REFERENCES co_partners(id) ON DELETE SET NULL,
  description     TEXT    NOT NULL DEFAULT '',
  amount_cents    INTEGER NOT NULL DEFAULT 0,        -- 正數；INCOME 為收，其餘為支
  recorded_by     TEXT    NOT NULL DEFAULT 'admin',
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ledger_project ON project_ledger(project_id);

-- ── 9. 錢包帳本 ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallet_entries (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id    INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  holder_no     TEXT    DEFAULT NULL,   -- 實際角色持有人；池類為 NULL
  role_or_pool  TEXT    NOT NULL CHECK(role_or_pool IN (
                  'COLEADERY',
                  'COLINKERY',
                  'COOWNERY_POOL',
                  'COSUPPORTERY_POOL',
                  'MUTUAL_FUND',
                  'PLATFORM_FEE',
                  'SPECIAL_ACCOUNT'
                )),
  amount_cents  INTEGER NOT NULL DEFAULT 0,
  status        TEXT    NOT NULL DEFAULT 'PENDING_CONFIRM'
                        CHECK(status IN (
                          'PENDING_CONFIRM',  -- 待確認
                          'POSTED',           -- 已入帳
                          'PENDING_PAYOUT',   -- 待出款
                          'PAID',             -- 已出款
                          'RESERVED'          -- 池類：已預留未分配
                        )),
  paid_at       TEXT    DEFAULT NULL,
  hash          TEXT    DEFAULT NULL,   -- SHA-256 存證
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_wallet_project ON wallet_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_wallet_holder  ON wallet_entries(holder_no);

-- ── 10. 本地哈希鏈存證 ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hash_chain (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  record_type TEXT    NOT NULL,   -- 'SETTLEMENT' / 'WALLET_POSTED' / 'WALLET_PAYOUT' / 'WALLET_PAID' / 'CARD_ISSUED' / 'CARD_REVOKED'
  record_id   INTEGER NOT NULL,   -- 對應表的 id
  sha256      TEXT    NOT NULL,
  prev_hash   TEXT    NOT NULL DEFAULT '',  -- 首筆為空字串
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
