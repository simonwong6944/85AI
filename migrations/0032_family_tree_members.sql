-- CoEldery85 × 家庭樹整合 — members 表擴充
-- 全部 ADD COLUMN ... DEFAULT，向下相容，不動現有資料

ALTER TABLE members ADD COLUMN member_type TEXT NOT NULL DEFAULT 'REGISTERED';
-- REGISTERED = 正式會員（有 phone、可登入 APP）
-- NODE_ONLY  = 純節點（先人／嬰兒／高齡代管）

ALTER TABLE members ADD COLUMN managed_by TEXT DEFAULT NULL;
-- NULL = 自行管理；CE85-XXXXXX = 代管人 member_no（語意 FK）

ALTER TABLE members ADD COLUMN deceased_date TEXT DEFAULT NULL;
-- 格式 YYYY-MM-DD；有值時應用層應同步 status = INACTIVE

CREATE INDEX IF NOT EXISTS idx_members_member_type   ON members(member_type);
CREATE INDEX IF NOT EXISTS idx_members_managed_by    ON members(managed_by);
CREATE INDEX IF NOT EXISTS idx_members_deceased_date ON members(deceased_date);
