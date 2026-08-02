-- Migration 0024: CoLinkery PWA
-- 1. members 加密碼與 CoLinkery 帳戶狀態
ALTER TABLE members ADD COLUMN password_hash TEXT;
-- 格式: pbkdf2$<iter>$<saltB64>$<hashB64>
ALTER TABLE members ADD COLUMN colinkery_account_status TEXT DEFAULT 'none'
  CHECK (colinkery_account_status IN ('none','password_pending','active','suspended'));

-- 2. role_applications：加密碼待啟用欄位（ASSOCIATION 邏輯同 COMPANY，直接插入不受 CHECK 限制）
ALTER TABLE role_applications ADD COLUMN password_hash_pending TEXT;
-- review_notes already exists from prior migration; skip

-- 3. 名片表
CREATE TABLE IF NOT EXISTS business_cards (
  card_id TEXT PRIMARY KEY,
  owner_member_no TEXT NOT NULL,
  image_r2_key TEXT,
  name_zh TEXT,
  name_en TEXT,
  company TEXT,
  title TEXT,
  phone TEXT,
  mobile TEXT,
  email TEXT,
  address TEXT,
  industry TEXT,
  ocr_raw TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (owner_member_no) REFERENCES members(member_no)
);

-- 4. b2b_leads（補建；與 B2B 平台共用）
CREATE TABLE IF NOT EXISTS b2b_leads (
  lead_id TEXT PRIMARY KEY,
  card_id TEXT,
  referral_member_no TEXT,
  colinkery_name TEXT,
  buyer_name TEXT,
  buyer_company TEXT,
  buyer_title TEXT,
  buyer_phone TEXT,
  buyer_email TEXT NOT NULL,
  buyer_industry TEXT,
  selected_items TEXT,
  esg_report_requested INTEGER DEFAULT 0,
  preferred_channel TEXT DEFAULT 'email' CHECK (preferred_channel IN ('email','whatsapp')),
  quotation_no TEXT,
  quotation_pdf_url TEXT,
  whatsapp_group_link TEXT,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','catalog_sent','interest_submitted','quoted','negotiating','won','lost')),
  assigned_supplier TEXT,
  note TEXT,
  commission_status TEXT DEFAULT 'none' CHECK (commission_status IN ('none','accrued','paid')),
  commission_amount_cents INTEGER DEFAULT 0,
  source TEXT CHECK (source IN ('card_handover','share_link','rfq_form','b2b_direct')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (card_id) REFERENCES business_cards(card_id),
  FOREIGN KEY (referral_member_no) REFERENCES members(member_no)
);

-- 5. b2b_tokens（不可枚舉，90 日）
CREATE TABLE IF NOT EXISTS b2b_tokens (
  token TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  referral_member_no TEXT,
  expires_at TEXT NOT NULL,
  opened_at TEXT,
  submitted_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (lead_id) REFERENCES b2b_leads(lead_id)
);

-- 6. 忘記密碼 OTP（6 位，10 分鐘，半自動 WhatsApp）
CREATE TABLE IF NOT EXISTS colinkery_otp (
  otp_id TEXT PRIMARY KEY,
  member_no TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  purpose TEXT CHECK (purpose IN ('reset_password')),
  expires_at TEXT NOT NULL,
  used INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (member_no) REFERENCES members(member_no)
);

-- 7. CoLinkery session（沿用 admin_sessions pattern）
CREATE TABLE IF NOT EXISTS colinkery_sessions (
  token TEXT PRIMARY KEY,
  member_no TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (member_no) REFERENCES members(member_no)
);

-- 8. audit log
CREATE TABLE IF NOT EXISTS b2b_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id TEXT,
  action TEXT,
  old_value TEXT,
  new_value TEXT,
  actor TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_business_cards_owner ON business_cards(owner_member_no);
CREATE INDEX IF NOT EXISTS idx_b2b_leads_referral ON b2b_leads(referral_member_no);
CREATE INDEX IF NOT EXISTS idx_b2b_leads_status ON b2b_leads(status);
CREATE INDEX IF NOT EXISTS idx_b2b_tokens_lead ON b2b_tokens(lead_id);
CREATE INDEX IF NOT EXISTS idx_colinkery_otp_member ON colinkery_otp(member_no);
CREATE INDEX IF NOT EXISTS idx_colinkery_sessions_member ON colinkery_sessions(member_no);
