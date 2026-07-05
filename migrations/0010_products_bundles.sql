-- migrations/0010_products_bundles.sql
-- Batch 3: 產品主庫 + 套裝 + 免費贈品 + 加購優惠（中英文名齊全）
-- 全部為新表，不影響現有 members / roadshows / jhc_stores 功能

-- ── 產品主庫（所有產品的單一來源，可重用）──
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name_zh TEXT NOT NULL,             -- 產品中文名
  name_en TEXT NOT NULL,             -- 產品英文名
  brand TEXT,                        -- 品牌／供應商
  sku TEXT,                          -- 貨號 SKU（選填）
  category TEXT,                     -- 分類（醬料／飲品／紙品…）
  unit TEXT,                         -- 單位（支／包／盒）
  cost REAL DEFAULT 0,               -- 成本價
  price REAL DEFAULT 0,              -- 建議零售價
  description TEXT,                  -- 產品描述
  photo_url TEXT,                    -- 產品相片連結（URL）
  active INTEGER DEFAULT 1,          -- 1=使用中 0=停用
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- ── 套裝方案（Bundle Set）──
CREATE TABLE IF NOT EXISTS bundles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name_zh TEXT NOT NULL,             -- 套裝中文名（例：長者健康入門套裝）
  name_en TEXT,                      -- 套裝英文名
  description TEXT,                  -- 套裝描述
  bundle_price REAL DEFAULT 0,       -- 套裝售價（客人付這個價）
  photo_url TEXT,                    -- 套裝主相片（選填）
  status TEXT DEFAULT 'ACTIVE',      -- ACTIVE / ARCHIVED
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_bundles_status ON bundles(status);

-- ── 套裝內含產品（Bundle 主要產品明細）──
CREATE TABLE IF NOT EXISTS bundle_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bundle_id INTEGER NOT NULL,
  product_id INTEGER,               -- 連到 products（可為 NULL 表示自由輸入）
  name_zh TEXT NOT NULL,            -- 冗餘存中文名（套裝快照，即使產品改名不變）
  name_en TEXT,                     -- 冗餘存英文名
  quantity INTEGER DEFAULT 1,       -- 數量
  unit_price REAL DEFAULT 0,        -- 該產品單價（此套裝內）
  description TEXT,                 -- 該產品描述
  photo_url TEXT,                   -- 該產品相片
  sort_order INTEGER DEFAULT 0,
  FOREIGN KEY (bundle_id) REFERENCES bundles(id)
);
CREATE INDEX IF NOT EXISTS idx_bundle_items_bundle ON bundle_items(bundle_id);

-- ── 免費贈品（Free Gift，計算送出總值）──
CREATE TABLE IF NOT EXISTS bundle_gifts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bundle_id INTEGER NOT NULL,
  product_id INTEGER,
  name_zh TEXT NOT NULL,            -- 贈品中文名
  name_en TEXT,                     -- 贈品英文名
  quantity INTEGER DEFAULT 1,
  unit_value REAL DEFAULT 0,        -- 該贈品市值（用來加總「送價值 $X」）
  description TEXT,
  photo_url TEXT,
  sort_order INTEGER DEFAULT 0,
  FOREIGN KEY (bundle_id) REFERENCES bundles(id)
);
CREATE INDEX IF NOT EXISTS idx_bundle_gifts_bundle ON bundle_gifts(bundle_id);

-- ── 加購優惠（Bonus / Add-on：加 $X 多買一件）──
CREATE TABLE IF NOT EXISTS bundle_addons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bundle_id INTEGER NOT NULL,
  product_id INTEGER,
  name_zh TEXT NOT NULL,            -- 加購品中文名（例：多一包紙巾）
  name_en TEXT,                     -- 加購品英文名
  quantity INTEGER DEFAULT 1,
  addon_price REAL DEFAULT 0,       -- 加購價（例：$1、$5）
  normal_value REAL DEFAULT 0,      -- 正常市值（顯示慳幾多）
  description TEXT,
  photo_url TEXT,
  sort_order INTEGER DEFAULT 0,
  FOREIGN KEY (bundle_id) REFERENCES bundles(id)
);
CREATE INDEX IF NOT EXISTS idx_bundle_addons_bundle ON bundle_addons(bundle_id);
