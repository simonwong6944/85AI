-- Migration 0029: Product Testing Survey System
-- Tables: testing_campaigns, testing_qr_codes, testing_participants,
--         testing_questions, testing_responses, testing_rewards

-- ─── 1. testing_campaigns ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS testing_campaigns (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_name         TEXT    NOT NULL,
  description           TEXT    NOT NULL DEFAULT '',
  -- Brand info (stored inline, no separate brand table needed for MVP)
  brand_name            TEXT    NOT NULL DEFAULT '',
  brand_logo_url        TEXT,
  brand_description     TEXT    NOT NULL DEFAULT '',
  brand_story_image_url TEXT,
  brand_website_url     TEXT,
  -- Product info
  product_name          TEXT    NOT NULL DEFAULT '',
  product_image_url     TEXT,
  -- Campaign settings
  testing_duration_days INTEGER NOT NULL DEFAULT 14,
  survey_deadline       TEXT,                           -- ISO date string
  reminder1_day         INTEGER NOT NULL DEFAULT 7,     -- send reminder N days after claim
  reminder2_days_before INTEGER NOT NULL DEFAULT 3,     -- send reminder N days before deadline
  -- Media content (stored as JSON array)
  media_content         TEXT    NOT NULL DEFAULT '[]',  -- [{type,title,url,position}]
  -- WhatsApp message templates
  wa_template_welcome   TEXT    NOT NULL DEFAULT '',
  wa_template_reminder1 TEXT    NOT NULL DEFAULT '',
  wa_template_reminder2 TEXT    NOT NULL DEFAULT '',
  wa_template_complete  TEXT    NOT NULL DEFAULT '',
  -- Brand form token (for external brand submission)
  brand_form_token      TEXT    UNIQUE,
  brand_form_expires_at TEXT,
  brand_submitted_at    TEXT,
  -- Status flow: draft → pending_review → approved → live → completed → archived
  status                TEXT    NOT NULL DEFAULT 'draft'
                         CHECK(status IN ('draft','pending_review','approved','live','completed','archived')),
  -- Review
  review_comments       TEXT,
  reviewed_at           TEXT,
  -- Timestamps
  created_by_admin      TEXT    NOT NULL DEFAULT 'admin',
  created_at            TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tc_status ON testing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_tc_brand_form_token ON testing_campaigns(brand_form_token);

-- ─── 2. testing_qr_codes ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS testing_qr_codes (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id    INTEGER NOT NULL REFERENCES testing_campaigns(id) ON DELETE CASCADE,
  label          TEXT    NOT NULL DEFAULT '',   -- e.g. "銅鑼灣站 2026-08"
  tracking_code  TEXT    NOT NULL UNIQUE,       -- e.g. "TEST-ABCD1234"
  qr_image_url   TEXT,                          -- Cloudinary URL of generated QR image
  status         TEXT    NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused','archived')),
  scanned_count  INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tqr_campaign ON testing_qr_codes(campaign_id);
CREATE INDEX IF NOT EXISTS idx_tqr_tracking ON testing_qr_codes(tracking_code);

-- ─── 3. testing_participants ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS testing_participants (
  id                       INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id              INTEGER NOT NULL REFERENCES testing_campaigns(id) ON DELETE CASCADE,
  qr_code_id               INTEGER REFERENCES testing_qr_codes(id),
  member_no                TEXT    NOT NULL,   -- FK to members.member_no (loose ref)
  -- Status flow: registered → sample_claimed → survey_started → survey_submitted → reward_sent
  status                   TEXT    NOT NULL DEFAULT 'registered'
                            CHECK(status IN ('registered','sample_claimed','survey_started','survey_submitted','reward_sent')),
  registered_at            TEXT    NOT NULL DEFAULT (datetime('now')),
  sample_claimed_at        TEXT,
  survey_started_at        TEXT,
  survey_submitted_at      TEXT,
  reward_sent_at           TEXT,
  time_to_complete_seconds INTEGER,
  -- WA notifications sent log (bitmask or JSON)
  wa_welcome_sent_at       TEXT,
  wa_reminder1_sent_at     TEXT,
  wa_reminder2_sent_at     TEXT,
  wa_complete_sent_at      TEXT,
  UNIQUE(campaign_id, member_no)
);
CREATE INDEX IF NOT EXISTS idx_tp_campaign ON testing_participants(campaign_id);
CREATE INDEX IF NOT EXISTS idx_tp_member   ON testing_participants(member_no);
CREATE INDEX IF NOT EXISTS idx_tp_status   ON testing_participants(status);

-- ─── 4. testing_questions ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS testing_questions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id    INTEGER NOT NULL REFERENCES testing_campaigns(id) ON DELETE CASCADE,
  question_order INTEGER NOT NULL DEFAULT 0,
  -- Types: rating | text | single_choice | multi_choice | yes_no
  question_type  TEXT    NOT NULL DEFAULT 'rating'
                  CHECK(question_type IN ('rating','text','single_choice','multi_choice','yes_no')),
  title          TEXT    NOT NULL,
  description    TEXT    NOT NULL DEFAULT '',
  image_url      TEXT,
  is_required    INTEGER NOT NULL DEFAULT 1,   -- 0=optional, 1=required
  -- For rating: min/max; for choices: options JSON array [{value,label}]
  options        TEXT    NOT NULL DEFAULT '[]',
  min_value      INTEGER NOT NULL DEFAULT 1,
  max_value      INTEGER NOT NULL DEFAULT 5,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tq_campaign_order ON testing_questions(campaign_id, question_order);

-- ─── 5. testing_responses ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS testing_responses (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  participant_id   INTEGER NOT NULL REFERENCES testing_participants(id) ON DELETE CASCADE,
  campaign_id      INTEGER NOT NULL REFERENCES testing_campaigns(id),
  question_id      INTEGER NOT NULL REFERENCES testing_questions(id),
  -- answer stored as TEXT (numbers, JSON arrays, or free text)
  answer           TEXT    NOT NULL DEFAULT '',
  submitted_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(participant_id, question_id)
);
CREATE INDEX IF NOT EXISTS idx_tr_participant ON testing_responses(participant_id);
CREATE INDEX IF NOT EXISTS idx_tr_campaign    ON testing_responses(campaign_id);

-- ─── 6. testing_rewards ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS testing_rewards (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id         INTEGER NOT NULL UNIQUE REFERENCES testing_campaigns(id) ON DELETE CASCADE,
  reward_name         TEXT    NOT NULL DEFAULT '',
  reward_description  TEXT    NOT NULL DEFAULT '',
  -- Types: product | coupon | cash | points | other
  reward_type         TEXT    NOT NULL DEFAULT 'product'
                       CHECK(reward_type IN ('product','coupon','cash','points','other')),
  reward_value        TEXT    NOT NULL DEFAULT '',   -- e.g. "$50", "1個月免費"
  quantity_available  INTEGER NOT NULL DEFAULT 0,    -- 0 = unlimited
  delivery_notes      TEXT    NOT NULL DEFAULT '',
  created_at          TEXT    NOT NULL DEFAULT (datetime('now'))
);
