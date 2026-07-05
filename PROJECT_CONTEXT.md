# CoEldery 85 系統 · AI 開發交接文件 (PROJECT_CONTEXT.md)

> 用途：貼入任何新 AI 對話，令 AI 即刻理解整個專案、進度、技術結構、下一步。
> 這份文件是系統開發嘅「單一事實來源 Single Source of Truth」。任何 AI 接手前必讀全文。
> 最後更新：2026-07-05（對齊 repo commit be36ad1）｜ 維護者：Simon Wong (simon@coeldery85.org)
> 更新規則：日常只改第 12、13 章（進度／下一步）；第 1-11 章為穩定框架，改動需 Simon 確認。

═══════════════════════════════════════════════════
## ⚑ 本文件定位（先睇）
═══════════════════════════════════════════════════

本文件 = **AI 85 系統開發交接文件（活文件）**。
用途：指導 AI 進行 coeldery85.com 系統開發、記錄進度、跟進下一步。

本文件【不取代】以下業務／制度核心文件（該批為法律及商業事實來源）：
章程 V2.0、核心文件 V2.5、核心價值、角色天書、IT 系統核心文件、
Roadshow 2、十八區計劃、ESG 採購計劃、附屬咭核心文件、銀行需求書。

本文件內嘅商業／制度內容只係【濃縮引用】，方便 AI 理解點解要咁起系統。
business 內容有衝突時，一律以上述業務核心文件（特別係公司章程 V2.0）為最終準則。

維護方式：業務文件更新 → 本文件第 1-6 章相應同步；
系統每做完一步 → 只更新第 12（已完成）、13（下一步）章。

═══════════════════════════════════════════════════
## 0. 畀 AI 嘅指示（第一段先讀）
═══════════════════════════════════════════════════

你正接手一個進行中嘅專案。請先做：
1. 讀完本文件全文，理解背景、技術棧、進度、下一步，先開始工作。
2. 睇實際 code：GitHub repo 係 **public**：
   https://github.com/simonwong6944/85AI （branch: main）
   關鍵檔案：`src/index.tsx`（所有後端 API + 頁面，約 263KB，好大）、
   `migrations/*.sql`（D1 schema）、`public/static/admin.js`（前端 47KB）、
   `wrangler.jsonc`、`package.json`。
   ⚠️ 讀 `src/index.tsx` raw 時可能遇 gzip 分段問題 → 改用 GitHub contents API 或分段 offset。
3. 交付方式：本專案用 **Genspark AI Code** 生成並部署（連住 Cloudflare + GitHub）。
   你嘅輸出應係「可直接貼畀 Genspark 嘅完整 code + 中文指令」，減少 Genspark 自行構思。
4. 一次唔好塞太多。**一階段一階段交付**，每階段畀：migration + seed（如需）+ Hono API
   + 前端 + 畀 Genspark 嘅中文指令。
5. **絕不硬寫任何 secret**（密碼、API token、DB ID）→ 一律用 Cloudflare 環境變數。
   真實個人資料（會員身份證等）不可 commit 入 public repo。
6. 語言：用繁體中文（廣東話語氣可）回覆。
7. 記住系統雙重定位：唔止內部營運工具，更係**畀投資者／銀行／監管睇嘅制度證據** →
   資料要結構化、可匯總、可追溯、可審計，由第一日就要啱。

═══════════════════════════════════════════════════
## 1. 專案是什麼
═══════════════════════════════════════════════════

**CoEldery 85（老有聯盟 85 有限公司）** — 2026 年成立嘅香港社會企業，**擔保有限公司**
（無股東、不派股息）。註冊地址：Room 2703, 27/F, 148 Electric Road, North Point, HK。
**創辦人**：Wong Man Hon Simon（王文瀚）、Wong Siu Man（黃紹文）。

**一句定義**：一個由長者共同創辦、以「批發集團」模式運作、面向全港市民與企業嘅社企品牌平台。
不論長者、非長者、企業、政府，只要消費 CoEldery 85 品牌或聯營產品，
**項目淨利潤 85% 透過公司章程鎖定、持續回流長者社群**。

**定位（四個非）**：非長者品牌、非慈善組織、非會員折扣計劃、非市場分眾項目。
係「重構商業模式」，唔係讓利、唔係捐助。

**四層重構邏輯**：
① 商業模式重構（規模採購 + 去中介 + 銷量擴大創造新增值）
② 長者角色重構（由被照顧者 → 共同創辦人／擁有者）
③ 利益一致性（長者利益與平台成功綁定）
④ 參與放大效應（人脈／信任／規模／社群 四重倍增）

**已驗證業務基礎（實況，非計劃）**：
- 與 **日本城 JHC（母公司 國際家居零售 1373.HK）** 戰略合作，Supplier Code C2221。
- 10 間店 Roadshow 試點，總銷約 HK$136,057；晴朗店 4 日 HK$34,290，其後常規月銷 HK$46,148
  （店長：「好賣過維達」，主動再訂貨）。
- 已上架 50+ 店，75+ 產品。首批品牌：海天醬油、南非國寶茶、竹纖維紙巾等。
- 三年願景：日本城全線 280 店循環 Roadshow，B2C + B2B 雙渠道。
- 同時創造 150–200 個長者就業崗位（CoWorkery promoter）。
- 首輪可動用資金約 150–260 萬，社企本體不需外部融資即可啟動。

**兩個網域**：
- `coeldery85.com` = 系統／管理平台（而家起緊嘅後台）
- `coeldery85.org` = 對外品牌介紹站（已上線）

**技術服務公司**：85 AI Technology Limited（收 15% 平台服務費，與社企本體法律分離）。

═══════════════════════════════════════════════════
## 2. 七大生態系統角色（直接對應未來 /Co* 模組）
═══════════════════════════════════════════════════

角色綁「**人 × 項目**」組合，**唔綁人**（一人可喺不同項目扮不同角色）。
呢個係地基中嘅地基，第一日定死，返唔到轉頭。系統資料模型必須支援。

**七大業務角色**：
| 角色 | 中文 | 位置 | 經濟位置 | 法律身份 |
|---|---|---|---|---|
| CoLeadery | 領航者 | 主軸 | 項目淨利 10% | 正式公司成員（有投票權） |
| CoOwnery | 同行者 | 主軸 | B2C 20% ／ 涉 B2B 15%（配額平等分配） | 平台參與身份 |
| CoSupportery | 支持者 | 主軸 | B2C 40% ／ 涉 B2B 35%（充值卡消費分子分母） | 平台參與身份 |
| CoExplorery | 探索者 | 入口 | 只享折扣、無回饋（普通卡長者會員） | 平台參與身份 |
| CoLinkery | 連結者 | 平行 | 涉 B2B／B2G 10%（媒合） | 正式公司成員（有投票權） |
| CoWorkery | 工作者 | 平行 | 服務報酬（如 Roadshow promoter，長者就業） | 平台參與身份 |
| CoPartnery | 合作夥伴 | 平行 | 商業合作回報（外部機構共建 ESG） | 合作夥伴身份 |

**另有治理身份（唔計入七角色，但系統要標示）**：
- 創辦人特別成員：Wong Man Hon Simon、Wong Siu Man。特別權利：雙倍票、提名董事、
  保留事項書面同意。
- 長者代表成員：正式成員，每人 1 票。

**投票權／經濟權分離（資料模型必須分開標示）**：
- 有投票權 = 創辦人特別成員、CoLeadery、CoLinkery、長者代表成員。
- 只有經濟權 = CoExplorery、CoOwnery、CoSupportery、CoWorkery、CoPartnery。

═══════════════════════════════════════════════════
## 3. 85% 分配機制 + 三種項目情境（核心計算引擎規格）
═══════════════════════════════════════════════════

分配以**項目**為單位，按情境套公式：

| 受益方 | 純 B2C | B2C 延伸 B2B／B2G | 純 B2B／非自用 |
|---|---|---|---|
| CoLeadery | 10% | 10% | 10%（發起） |
| CoLinkery | — | 10% | 10%（銷售） |
| CoOwnery | 20% | 15% | — |
| CoSupportery | 40% | 35% | — |
| 特別資金用途帳戶 | — | — | 50% |
| 互助基金 | 15% | 15% | 15% |
| 平台服務費 | 15% | 15% | 15% |
| **回流長者社群合計** | **85%** | **85%** | **85%** |

**關鍵公式**：
- CoOwnery 池：所有當年度有效配額者**平等分配**（不設權重／年資／金額差異）。
  配額制 + 年度續期；不續期名額由 VRF 可驗證隨機抽籤補上。
- CoSupportery 池：`個人回饋 =（個人項目年度合資格消費 ÷ 全體 CoSupportery 同項目總消費）
  × 該項目 CoSupportery 池`。可細分歷史池 30% + 當年池 70%。
- 跨 B2C／B2B 合併：`池 =（B2C 淨利 × B2C 比例）+（B2B 淨利 × B2B 比例）`。
- 三階段回饋啟動：起步期（未有合資格 CoOwnery／CoSupportery → 該 60% 撥入特別資金帳戶）、
  成長期（標準分配）、特殊結構期（CoLeadery 最多 20%、CoSupportery 最多 50%、不設 CoOwnery）。

**分配引擎要求**：可追溯、可重算、有審計凍結快照、全部上不可竄改存檔。
**非保證原則**：無利潤無分配；對外一律用「回饋／參與價值」，唔用「收益率／派息」。

═══════════════════════════════════════════════════
## 4. 會員與卡系統（現有 /membership 嘅完整制度背景）
═══════════════════════════════════════════════════

一個會員一個唯一 ID；卡 = 身份載體，唔儲記錄（數據喺後台，補卡綁返原 ID）。
**卡種區分係制度核心，系統靠卡種自動判定身份**：

| 卡種 | 對應身份 | 功能 | 計入回饋 |
|---|---|---|---|
| 普通卡／會員卡 | CoExplorery | 9 折折扣、身份識別 | ✗ |
| 充值卡／老有卡 | CoSupportery／CoOwnery | 儲值支付(SVF) + 消費歸戶 | ✓（升級唯一動作 = 申請充值卡 + 首充） |
| 附屬卡 | 主卡家庭延伸 | 家庭成員消費歸入主卡 | ✓（歸主卡分子） |
| 醫健卡（現 /membership） | 醫療互助 | 名 + HKID 首 4 字，交香港商貿慈善基金，privacy hmmp.com.hk | 獨立流程 |

**附屬卡三層放大**：① 主卡分子放大（主 + 配偶 + 子女歸一戶）② 整體消費基礎放大
③ 品牌敘事由個人升家庭。三模式：A 家庭日常、B 節日禮品、C 企業員工福利(ESG)。
每主卡建議 3–5 張。付款來源不改變歸屬。

**老有卡（銀行需求書重點）**：SVF 性質拍卡支付（八達通模式，非 Visa／Master），
線上線下雙通道充值，主／附屬卡互充，消費即時歸戶，首發 5 萬張，
充值資金入客戶保障帳戶（信託／託管／獨立隔離，破產隔離）。年度回饋一律自動充入老有卡。

═══════════════════════════════════════════════════
## 5. 互助基金 · 治理 · 不可竄改存檔（投資者／監管信任基礎）
═══════════════════════════════════════════════════

**互助基金（15% 池 → 未來獨立模組）**：性質 = 社群互助 + 酌情援助，
非保險／儲蓄／投資／保證給付。來源：項目 15% + 月費（標準 HK$100）+ 附屬卡月度參與金
+ 微回饋 + 特別帳戶撥入 + 第三方。用途：醫療、緊急、長者福利援助。
獨立專戶、破產隔離、低風險投放、季度審計、匿名化披露、酌情審批（互助基金管理委員會）。
界面強制顯示「酌情援助、非保證給付、非保險」。

**六大委員會**：長者權益監督、財務與審計、互助基金管理、項目審查、科技與數據倫理、
策略與社會影響評估。核心比例修改門檻極高（委員會全體一致 + 90% 超級決議
+ 創辦人書面同意 + 90 日通知）。

**不可竄改存檔系統**：鏈下存資料、鏈上／封存存 hash（SHA-256 + Merkle Root）。
三階段：① 本地哈希鏈（首輪即用）② Hyperledger Fabric 聯盟鏈（融資後）③ 公鏈錨定。
敏感資料只上 hash，守 PDPO。更正用新版本追加，原記錄永存。
四類查核界面：長者（結論先行 ✓）、子女監督、監管只讀、公眾匿名。

═══════════════════════════════════════════════════
## 6. Roadshow 背景（目前主攻嘅模組）
═══════════════════════════════════════════════════

- 已與日本城 JHC 成為戰略夥伴（實況），10 間店試點完成，75+ 產品上架。
- 最高單店 4 日 HK$34,290，店長主動再訂貨。
- 三年願景：280 店全線 B2C + B2B。同時係長者就業崗位（150–200 CoWorkery promoter）。
- **場地池共約 279–280 間店**：270 香港（JHC 正店 + 少量 DDS「日記士多／多來買」+ 一批
  Super Store）+ 9 澳門。已完成 10 間，敘事 = 「10 → 280 可複製擴張」。
  （⚠️ seed 實際店數以 repo `seed_stores.sql` 為準，見第 8 章。）
- Excel「JHC Roadshow Store List」欄位：區域總經理／管轄區長／舖號／區份／
  店舖 region_code／店舖名稱／級別／地址／電話／聯絡人(店長)／營業時間／Super Store／DDS。

═══════════════════════════════════════════════════
## 7. 技術棧 + 程式風格慣例（實際，已確認）
═══════════════════════════════════════════════════

- 前端：vanilla JS（`public/static/admin.js` 47KB）+ 部分 HTML 由後端 `c.html()` 直出
  + Tailwind CDN；共用樣式 `public/shared.css`、`public/static/style.css`。
- 後端：**Hono v4**，全部集中喺 `src/index.tsx`（**約 263KB / 268,832 bytes，好大**）。
- 平台：**Cloudflare Pages／Workers**。
- 資料庫：**Cloudflare D1**（SQLite）。binding = `DB`，database_name = `webapp-db`。
- Build：Vite。設定檔 `wrangler.jsonc`（compat date 2026-04-26，flag `nodejs_compat`，
  輸出 `./dist`）。
- Migrations：放 `migrations/`，用 `wrangler d1 migrations apply`。
- 部署工具：**Genspark AI Code**（連 Cloudflare + GitHub）。
- Runtime dependency：只有 `hono ^4.12.26`（cookie 用 hono/cookie）。

**程式風格慣例（新 code 必須跟）**：
- Hono route：`app.get/post/patch/delete('/api/...', async (c) => {...})`
- 讀 D1：`c.env.DB`，用 `db.prepare(sql).bind(...).first()／.all()／.run()`
- 回應：一律 `c.json({ ok: true, ... })` 或 `c.json({ ok: false, error: '中文訊息' }, 狀態碼)`
- error：`try { } catch(err){ console.error(err); return c.json({ok:false,error:'...'},500) }`
- SQL table：snake_case 複數；`id INTEGER PRIMARY KEY AUTOINCREMENT`；
  時間 `TEXT NOT NULL DEFAULT (datetime('now'))`；status 用大寫字串；中文欄位加中文註釋；
  table 尾建 index；適當用 FOREIGN KEY。
- 會員編號格式：`CE85-000001`（由 counter table 遞增）；三年到期。
- Roadshow 場次編號格式：`RS-2026-001`。
- Admin API 命名：`/api/admin/<模組>/...`；受 `app.use('/api/admin/*')` 認證中介保護
  （login／logout／me 例外）。

═══════════════════════════════════════════════════
## 8. 現有 D1 Schema（migrations，實際在 repo）
═══════════════════════════════════════════════════

Repo `migrations/` 實際檔案（全部已存在）：
- `0001_initial_schema.sql`：`members`（PRIMARY 主卡／FAMILY 家庭卡）。重要欄位：
  member_no, tier, name_zh, phone, name_en, gender, birth_year, district, id_prefix(HKID頭4),
  parent_no／parent_name／relation(家庭卡), **roadshow(場次code, default 'walk-in')**,
  kyc_status, role(default CoExplorery), notes, expires_at, created_at。
  + `counter`（會員編號流水號，單行）+ `roadshow_log`（roadshow_code, member_no）← 重要對接點。
- `0002_add_source_status.sql`：source, referrer_no, roadshow_location, status。
- `0003_medical_card_applications.sql`：`medical_card_applications`
  （member_no, name_zh_full, name_en_full, hkid_prefix, phone,
  status: PENDING/SENT/ISSUED/DECLINED）。交第三方「香港商貿慈善基金」。
- `0004_settings.sql`：設定表。
- `0005_verified_at.sql`：verified_at 欄。
- `0006_member_groups.sql`：`member_groups`（name, color…）+ members.group_id。
- `0007_wa_clicked_at.sql`：wa_clicked_at 欄。
- `0008_admin_and_roles.sql`：**已 commit + 已部署** — `admin_sessions`
  （token UNIQUE, role default 'admin', label, created_at, expires_at）
  + `admin_users`（username UNIQUE, role default 'staff', active, created_at，預留多用戶）。
- `0009_roadshow.sql`：**已 commit + 已部署** — `jhc_stores` + `roadshows`。
- `seed_stores.sql`：**已 commit** — 實際 seed 咗 280 間店（commit message 寫 280，
  ⚠️ 需核對係咪含齊 270 HK + 9 MO = 279，定係 280；以 repo 為準）。
- `seed.sql`：初始 seed。

**現有公開頁面（唔好動）**：
- `/` 主頁、`/membership`（登入 + 醫健卡表）、`/membership/join`（主卡登記）、
  `/membership/join-family`（家庭／附屬卡）、`/membership/card/:no`（數位會員卡）。
- ⚠️ 已知 bug：`/membership/join` 實際顯示同 `/membership`（醫健卡表單）一樣，
  疑路由或內容錯配，待修（見第 13 章）。

═══════════════════════════════════════════════════
## 9. 系統架構藍圖 + Roadshow 8 功能區
═══════════════════════════════════════════════════

**統一後台目標**：一個 `/admin` 外殼 + 左側邊欄模組化 + 右內容區。每模組有自己 sub-tab。
將現有 membership admin 遷入成「會員」模組。登入：第一階段單一密碼
（存 Cloudflare secret `ADMIN_PASSWORD`），schema 預留 role（admin／staff／partner）供將來多用戶。

**Roadshow 模組完整規劃（8 大功能區）**：
1. 店舖主庫（Store Master，約 280 間，擴張進度）← 已建
2. 場次排期（揀店 + 日期 + promoter + 目標，自動生成 RS-code）← 已建
3. 產品編排（產品主庫 → 每場選品，將來接 CoSuppliery）← 待做
4. 套裝設定（Bundle：組合、售價、自動算慳幅與毛利）← 待做
5. 贈品規則（滿額送／加購價，含成本、限量）← 待做
6. 事後數據（實際銷售、各品銷量、新登記會員數[由 roadshow_log 自動計]、成本、ROI）← 待做
7. 後續門店表現（Roadshow 後該店補貨／回購／銷售趨勢 vs baseline）← 待做
8. 單店模型總覽（把已完成場次匯總成可複製、可向投資者展示嘅模型）← 待做

**未來其他模組（規劃中，每個對應一角色）**：
`/CoExplorery`（長者會員）、`/CoSuppliery`（供應商：產品目錄／優惠／合約到期提醒）、
`/CoRetailery`（門市／銷售數據／QR 優惠券）、`/CoLeadery`（社區活動主辦／影響力評分）、
`/CoSupportery`（捐款記錄／收據／感謝信）、`/CoLinkery`（媒合記錄／配對成功率）、
`/CoOwnery`（場地／使用申請／檔期）。
運營模組：`/events`（Roadshow）、`/volunteers`（CoWorkery）、`/accounting`、`/governance`。
未來擴展：`/regions`（多地區／大灣區）、`/franchise`（授權機構）、`/CoEcosystem`（總覽）、
老有卡 SVF 支付整合、互助基金申請／審批、不可竄改存檔查核界面、ESG 數據包輸出。

**開發優先次序**：
- Phase 1（現在）：會員核心（已完成）+ 統一 /admin（已完成）+ Roadshow（進行中）。
- Phase 2：CoSuppliery、CoRetailery、`/events` 其他。
- Phase 3：CoLeadery／CoSupportery、`/accounting`、admin 權限強化。
- Phase 4：多地區、授權機構、CoEcosystem 儀表板。
次序邏輯：先 Roadshow（證明可規模化 10→280）→ CoSuppliery（產品來源）→ 分配引擎
→ 老有卡支付 → 互助基金 → 存檔查核。加新模組前先建統一權限／資料保留政策。

═══════════════════════════════════════════════════
## 10. 命名／數字一致性提醒（修文件時注意）
═══════════════════════════════════════════════════

- 利潤比例：以章程 V2.0「三情境表」為準（見第 3 章），唔好用單一組數字。
- 角色演變：章程曾將舊 CoLinkery（基礎會員）→ CoExplorery；舊 CoLeadery（B2B）→ CoLinkery；
  充值 CoOwnery → CoSupportery。以第 2 章七角色定義為準。
- 用詞統一：「技術服務費」=「平台服務費」；統一寫「不可竄改」。
- 店數：文件寫 279（270 HK + 9 MO），但 seed 實際 commit 咗 280 → 以 repo 為準，需核對。
- 衝突時：一切以**公司章程 V2.0 法律文本**為最終準則。

═══════════════════════════════════════════════════
## 11. 原則 · 紅線 · 教訓（每個模組都適用）
═══════════════════════════════════════════════════

- Repo 係 public → 任何密碼／API token／secret 不可寫死，一律用 Cloudflare 環境變數；
  真實個人資料不可 commit。（注意：ADMIN_PASSWORD 值曾出現喺 commit message，
  正式上線前應喺 Cloudflare 換新密碼。）
- 資料模型：角色綁「人 × 項目」，投票權／經濟權分開標示 — 第一日定死。
- 卡種區分（普通／充值／附屬）決定是否計入回饋 — 系統靠卡種自動判定身份。
- 日本城源頭篩選：POS 只傳 CoEldery SKU 數據（SKU 清單由 CoEldery 維護），
  保護日本城顧客數據 + PDPO 最小化，全自動每日批次為主。
- 資金：客戶保障隔離、破產隔離；利息不分配會員（守 CIS 線）；敏感個資不上鏈本體。
- 對外措辭：預估必標「非保證」；合規優先；結論先行。
- 系統目前（2026-07）僅開發約兩天，仍測試階段，會員資料為測試資料 →
  可放手打好地基，不必為「怕整爛現有資料」而妥協架構。
- 一次過生成整個複雜系統易失敗 → 分階段交付。
- AI 睇唔到 Genspark 專案即時狀態，只睇 public GitHub → 「最後一哩」靠 Genspark，
  畀指令時要叫佢「整合入現有 project、沿用現有 D1 database `webapp-db`、binding DB」。
- 醫健卡資料交第三方「香港商貿慈善基金」；同意條款主體要正確
  （85 AI Technology Limited vs 香港商貿慈善基金 唔好混淆）。

**⚠️ 已反覆撞到嘅技術陷阱（以後 AI 唔好再中招）**：
- 【Cloudflare Workers runtime】冇 `confirm()` / `alert()`，用咗會 silent early return
  （掣好似撳唔到）。前端要用自訂 modal 或直接執行。
- 【前端 onclick】唔好喺 onclick 內放 JSON.stringify(物件) 或中文引號「」，
  會爆整個 TR HTML / JS parsing。正確：用 `data-no` / `data-id` attribute +
  全域 cache 物件（例如 rsCache{}），由 handler 用 id 反查。
- 【中文標點】JS code 內（尤其 template／confirm 字串）避免用全形引號「」，
  會變 invalid token。用 [] 或半形。
- 【CSV export】記得加 UTF-8 BOM，Excel 開中文先唔亂碼；SQL alias 要對（FROM members m）。

═══════════════════════════════════════════════════
## 12. 已完成工作（每次里程碑更新呢段）
═══════════════════════════════════════════════════

- ✅ Cloudflare API 權限驗證（Account／Zone／D1／Workers／Pages 讀寫，1 account、8 zones）。
- ✅ Repo public，最新 commit `be36ad1`（2026-07-05 10:24）。
- ✅ **Batch 1 + Batch 2 已 commit 且已部署**（commit `6dbb5c8`）：
  - Migration 0008（admin_sessions、admin_users）+ 0009（jhc_stores、roadshows）。
  - Admin 認證：makeToken／verifySession helpers、HttpOnly cookie
    （用 hono/cookie 嘅 getCookie／setCookie／deleteCookie）。
  - 認證中介 `/api/admin/*`（login／logout／me 例外）。
  - `POST /api/admin/login`（比對 `ADMIN_PASSWORD` env）、`POST /api/admin/logout`、
    `GET /api/admin/me`。
  - **ADMIN_PASSWORD secret 已設定**（Cloudflare secret + 本地 .dev.vars，已在 .gitignore）。
  - `/admin` 統一殼（登入畫面 + 側邊欄 + Roadshow 模組）。
  - Roadshow API：`/api/admin/roadshow/stores`、`/api/admin/roadshow/districts`。
  - **Roadshow CRUD：GET／POST／PATCH／DELETE `/api/admin/roadshows`**（比原計劃多咗 PATCH/DELETE）。
  - Seed 咗 280 間 JHC 店（由 Excel）。
- ✅ **Login 部分已完成並 debug**（commit `be36ad1` 修好 /admin 前端 JS syntax error：
  中文引號、onclick inline JSON → 改用 rsCache + data-id）。
- ✅ 收齊全套核心業務文件並整合入本文件。

═══════════════════════════════════════════════════
## 13. 下一步（待辦）
═══════════════════════════════════════════════════

1. ✅（已做）Admin login + Roadshow 基礎已部署。→ 剩低：**實測**
   去 `coeldery85.com/admin`，用 ADMIN_PASSWORD 登入，確認側邊欄 + Roadshow 三 tab
   （擴張進度／店舖主庫／場次排期）正常，新增／編輯／刪除場次 work。
2. 核對 `seed_stores.sql`：實際 280 定 279 店？確認 city='MO'（9 澳門）、
   is_dds／is_super 標記啱唔啱。
3. **修 `/membership/join` route bug**（誤顯示醫健卡表單）。
4. **Roadshow batch 3（下一個主要開發）**：產品主庫 `products` + `roadshow_products`
   + `bundles`／`bundle_items` + `gift_rules`（滿額送／加購價）+ API + 前端 sub-tab（功能區 3-5）。
5. Roadshow batch 4：場後數據 + 後續門店表現 + 單店模型儀表板（功能區 6-8）。
6. 將現有 membership admin 遷入 `/admin`「會員」模組。
7. 之後進 Phase 2（CoSuppliery 等）。

═══════════════════════════════════════════════════
## 附：核心文件索引（建議放 repo /docs）
═══════════════════════════════════════════════════
章程 V2.0（法律最終準則）· 核心文件 V2.5（制度+分配）· 核心價值（哲學）·
角色天書（七角色）· IT 系統核心文件（系統需求總綱）· Roadshow 2（數據）·
十八區計劃 · ESG 採購計劃 · 附屬咭核心文件（卡三模式）· 銀行需求書（老有卡 SVF）。

（文件完。更新進度時，改第 12、13 章即可。）
