-- CoEldery 85 · Test seed data
-- Run: npm run db:seed

INSERT OR IGNORE INTO members 
  (member_no, tier, name_zh, phone, name_en, gender, birth_year, district, roadshow, expires_at, created_at)
VALUES
  ('CE85-000001', 'PRIMARY', '陳大文', '91234567', 'CHAN TAI MAN', 'M', 1955, '觀塘', '2026Q3-apm-KT', date('now', '+3 years'), datetime('now')),
  ('CE85-000002', 'PRIMARY', '李小英', '92345678', 'LEE SIU YING', 'F', 1960, '深水埗', '2026Q3-D2-SSP', date('now', '+3 years'), datetime('now')),
  ('CE85-000003', 'FAMILY', '陳明', '93456789', 'CHAN MING', 'M', 1985, '觀塘', '2026Q3-apm-KT', date('now', '+3 years'), datetime('now'));

-- Update counter to next available number
UPDATE counter SET next_val = 4 WHERE id = 1;
