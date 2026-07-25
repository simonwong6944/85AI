-- ============================================================
-- 0019_clockout_selfie.sql
-- 補加 attendance_records.clock_out_selfie（下班自拍 R2 key）
-- 0018 只有 clock_in_selfie，呢條 migration 補齊對稱
-- ============================================================
ALTER TABLE attendance_records ADD COLUMN clock_out_selfie TEXT;
