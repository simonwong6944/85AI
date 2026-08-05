-- Migration 0025: Expand business_cards with full bilingual fields
-- Adds separate ZH/EN company/address/department, plus social media, fax, website, notes

-- Company name split (ZH / EN)
ALTER TABLE business_cards ADD COLUMN company_zh TEXT DEFAULT '';
ALTER TABLE business_cards ADD COLUMN company_en TEXT DEFAULT '';

-- Department split (ZH / EN)
ALTER TABLE business_cards ADD COLUMN department_zh TEXT DEFAULT '';
ALTER TABLE business_cards ADD COLUMN department_en TEXT DEFAULT '';

-- Title split (ZH / EN)
ALTER TABLE business_cards ADD COLUMN title_zh TEXT DEFAULT '';
ALTER TABLE business_cards ADD COLUMN title_en TEXT DEFAULT '';

-- Address split (ZH / EN)
ALTER TABLE business_cards ADD COLUMN address_zh TEXT DEFAULT '';
ALTER TABLE business_cards ADD COLUMN address_en TEXT DEFAULT '';

-- Additional contact channels
ALTER TABLE business_cards ADD COLUMN fax TEXT DEFAULT '';
ALTER TABLE business_cards ADD COLUMN website TEXT DEFAULT '';
ALTER TABLE business_cards ADD COLUMN linkedin TEXT DEFAULT '';
ALTER TABLE business_cards ADD COLUMN wechat TEXT DEFAULT '';
ALTER TABLE business_cards ADD COLUMN whatsapp TEXT DEFAULT '';
ALTER TABLE business_cards ADD COLUMN telegram TEXT DEFAULT '';

-- Industry (more precise)
ALTER TABLE business_cards ADD COLUMN industry_zh TEXT DEFAULT '';
ALTER TABLE business_cards ADD COLUMN industry_en TEXT DEFAULT '';

-- Notes / Memo (free text by the CoLinkery member)
ALTER TABLE business_cards ADD COLUMN notes TEXT DEFAULT '';

-- Migrate existing data: copy old single-lang fields into new bilingual fields
-- (old `company` → both company_zh and company_en as best-effort)
UPDATE business_cards SET company_zh = company WHERE company_zh = '' AND company != '';
UPDATE business_cards SET company_en = company WHERE company_en = '' AND company != '';
UPDATE business_cards SET address_zh = address WHERE address_zh = '' AND address != '';
UPDATE business_cards SET address_en = address WHERE address_en = '' AND address != '';
UPDATE business_cards SET title_zh = title WHERE title_zh = '' AND title != '';
UPDATE business_cards SET title_en = title WHERE title_en = '' AND title != '';
