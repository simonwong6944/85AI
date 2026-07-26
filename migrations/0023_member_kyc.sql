-- member_kyc table: KYC-first apply flow
-- HKID prefix (1 letter + 3 digits), email, referral, bank, SWIFT

CREATE TABLE IF NOT EXISTS member_kyc (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_no TEXT NOT NULL UNIQUE REFERENCES members(member_no) ON DELETE CASCADE,
  id_prefix TEXT NOT NULL DEFAULT '',
  id_doc_r2_key TEXT NOT NULL DEFAULT '',
  bank_name TEXT NOT NULL DEFAULT '',
  bank_acc_no TEXT NOT NULL DEFAULT '',
  swift_code TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  referral_phone TEXT NOT NULL DEFAULT '',
  referral_name TEXT NOT NULL DEFAULT '',
  submitted_at TEXT NOT NULL DEFAULT (DATETIME('now')),
  verified_at TEXT DEFAULT NULL,
  verified_by TEXT DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','VERIFIED','REJECTED')),
  notes TEXT DEFAULT ''
);
