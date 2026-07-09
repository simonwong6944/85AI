-- 0013_useful_links.sql
-- 有用資訊表：管理員可新增/編輯/刪除，前台公開顯示

CREATE TABLE IF NOT EXISTS useful_links (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT    NOT NULL,
  link_type   TEXT    NOT NULL CHECK(link_type IN ('phone','whatsapp','url','text')),
  content     TEXT    NOT NULL,
  sort_order  INTEGER DEFAULT 0,
  is_active   INTEGER DEFAULT 1,
  created_at  TEXT    DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_useful_links_sort ON useful_links(sort_order);
